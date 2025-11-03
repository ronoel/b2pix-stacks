use std::sync::Arc;
use tracing_subscriber::EnvFilter;
use tokio::time::Duration;

use crate::api;
use crate::config::Config;
use crate::common::task_registry::TaskRegistry;
use crate::events::{
    handlers::{AuditLogHandler, EventHandlerRegistry, MetricsHandler},
    processor::EventProcessor,
    publisher::EventPublisher,
    store::EventStore,
};
use crate::features::advertisements::ports::repositories::AdvertisementRepository;
use crate::features::advertisements::services::{
    AdvertisementService, AdvertisementTransactionVerifierTaskHandler, AdvertisementFinishingTaskHandler,
};
use crate::features::advertisement_deposits::ports::repositories::AdvertisementDepositRepository;
use crate::features::advertisement_deposits::services::{
    AdvertisementDepositService, AdvertisementDepositCreatedHandler, AdvertisementDepositConfirmationTaskHandler,
};
use crate::features::bank_credentials::ports::BankCredentialsRepository;
use crate::features::bank_credentials::services::BankCredentialsService;
use crate::features::buys::services::{
    buy_service, BuyExpirationTaskHandler, BuyPaymentVerificationTaskHandler, DisputeFavorBuyerTaskHandler,
    DisputeFavorSellerTaskHandler
};
use crate::features::invites::ports::InviteRepository;
use crate::features::invites::services::InviteService;
use crate::features::payment_requests::ports::PaymentRequestRepository;
use crate::features::payment_requests::services::{PaymentRequestService, PaymentRequestTransactionVerifierTaskHandler};
use crate::infrastructure::database::mongo::init_mongo;
use crate::infrastructure::database::repositories::{
    AdvertisementRepositoryImpl, AdvertisementDepositRepositoryImpl, BankCredentialsRepositoryImpl, BuyRepositoryImpl, InviteRepositoryImpl, PaymentRequestRepositoryImpl,
};
use crate::services::email::EmailService;
use crate::services::trello::TrelloService;
use crate::services::efi_pay_service::EfiPayService;
use crate::services::bitcoin_price::quote_service::QuoteService;

pub async fn run() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let config = Arc::new(Config::from_env()?);
    let mongo_client = init_mongo(&config.mongodb_uri).await?;
    let db = mongo_client.database(&config.database_name);

    // Initialize event store
    let event_store = Arc::new(EventStore::new(db.clone()).await?);

    // Step 1: Create empty handler registry
    let handler_registry = Arc::new(EventHandlerRegistry::new());

    // Step 2: Create event publisher with the registry
    let event_publisher = Arc::new(EventPublisher::new(
        Arc::clone(&event_store),
        Arc::clone(&handler_registry),
    ));

    // Step 3: Create repositories
    let invite_repository: Arc<dyn InviteRepository> = Arc::new(InviteRepositoryImpl::new(&db));
    let bank_credentials_repository: Arc<dyn BankCredentialsRepository> =
        Arc::new(BankCredentialsRepositoryImpl::new(&db));
    let advertisement_repository: Arc<dyn AdvertisementRepository> =
        Arc::new(AdvertisementRepositoryImpl::new(&db));
    let advertisement_deposit_repository: Arc<dyn AdvertisementDepositRepository> =
        Arc::new(AdvertisementDepositRepositoryImpl::new(&db));
    let payment_request_repository: Arc<dyn PaymentRequestRepository> =
        Arc::new(PaymentRequestRepositoryImpl::new(&db));

    // Step 4: Create all services with event publisher
    let invite_service = Arc::new(InviteService::new(
        Arc::clone(&invite_repository),
        Arc::clone(&event_publisher),
    ));

    let bank_credentials_service = Arc::new(BankCredentialsService::new(
        Arc::clone(&bank_credentials_repository),
        Arc::clone(&event_publisher),
    ));

    // Create EFI Pay service (now uses bank_credentials_repository)
    let efi_pay_service = Arc::new(EfiPayService::new(
        Arc::clone(&bank_credentials_repository),
    ));

    let advertisement_service = Arc::new(AdvertisementService::new(
        Arc::clone(&advertisement_repository),
        Arc::clone(&invite_repository),
        Arc::clone(&event_publisher),
        Arc::clone(&config),
        Arc::clone(&efi_pay_service),
    ));

    // Create advertisement deposit service
    let advertisement_deposit_service = Arc::new(AdvertisementDepositService::new(
        Arc::clone(&advertisement_deposit_repository),
        Arc::clone(&advertisement_repository),
        Arc::clone(&event_publisher),
        Arc::clone(&config),
    ));

    // Create payment request service
    let payment_request_service = Arc::new(PaymentRequestService::new(
        Arc::clone(&payment_request_repository),
        Arc::clone(&event_publisher),
        Arc::clone(&config),
    ));

    // Create buy repository to share between service and handlers
    let buy_repository: Arc<dyn crate::features::buys::ports::repositories::BuyRepository> =
        Arc::new(BuyRepositoryImpl::new(&db));

    let buy_service = Arc::new(buy_service::BuyService::new(
        Arc::clone(&buy_repository),
        Arc::clone(&advertisement_repository),
        Arc::clone(&invite_repository),
        Arc::clone(&payment_request_service),
        Arc::clone(&event_publisher),
        Arc::clone(&config),
        Arc::clone(&efi_pay_service),
    ));

    // Initialize email service
    let email_service = Arc::new(EmailService::new(config.clone()).await);

    // Initialize trello service
    let trello_service = TrelloService::new();

    // Initialize quote service
    let quote_service = Arc::new(QuoteService::new());

    // Step 5: Now register all handlers to the shared registry
    // The registry is thread-safe and can be modified through Arc
    Arc::clone(&email_service).register_handlers(
        &handler_registry,
        Arc::clone(&buy_repository),
        Arc::clone(&advertisement_repository),
        Arc::clone(&invite_repository),
    );
    Arc::clone(&advertisement_service).register_handlers(&handler_registry);
    trello_service.register_handlers(&handler_registry);

    // Register advertisement deposit handler
    handler_registry.register(Arc::new(AdvertisementDepositCreatedHandler::new(
        Arc::clone(&advertisement_deposit_repository),
        Arc::clone(&advertisement_repository),
        Arc::clone(&config),
    )));

    // Register other system handlers
    // handler_registry.register(Arc::new(AuditLogHandler::new()));
    // handler_registry.register(Arc::new(MetricsHandler::new()));

    // Initialize event processor
    let event_processor = Arc::new(
        EventProcessor::new(Arc::clone(&event_store), Arc::clone(&handler_registry))
            .with_batch_size(50)
            .with_poll_interval(std::time::Duration::from_secs(5))
            .with_max_concurrent_consumers(10)
            .with_max_retries(10),
    );

    // Start event processor in background
    let event_processor_handle = {
        let processor = Arc::clone(&event_processor);
        tokio::spawn(async move {
            processor.start().await;
        })
    };

    // Initialize task registry with 15-second stagger between tasks
    let mut task_registry = TaskRegistry::new()
        .with_stagger_delay(Duration::from_secs(15));

    // Register all periodic tasks (they'll start with automatic delays)
    task_registry.register(AdvertisementTransactionVerifierTaskHandler::new(advertisement_service.clone()));
    task_registry.register(AdvertisementFinishingTaskHandler::new(
        advertisement_service.clone(),
        buy_service.clone(),
        Arc::clone(&payment_request_service),
    ));
    task_registry.register(AdvertisementDepositConfirmationTaskHandler::new(
        Arc::clone(&advertisement_deposit_repository),
        Arc::clone(&advertisement_repository),
        Arc::clone(&event_publisher),
        Arc::clone(&config),
    ));
    task_registry.register(BuyExpirationTaskHandler::new(buy_service.clone()));
    task_registry.register(BuyPaymentVerificationTaskHandler::new(buy_service.clone()));
    task_registry.register(DisputeFavorSellerTaskHandler::new(buy_service.clone()));
    task_registry.register(DisputeFavorBuyerTaskHandler::new(buy_service.clone()));
    task_registry.register(PaymentRequestTransactionVerifierTaskHandler::new(
        Arc::clone(&payment_request_repository),
        Arc::clone(&config),
    ));

    tracing::info!("Registered {} periodic tasks with auto-staggering", task_registry.task_count());

    // Create database indexes
    let invite_repo = InviteRepositoryImpl::new(&db);
    invite_repo.create_indexes().await?;

    let bank_credentials_repo = BankCredentialsRepositoryImpl::new(&db);
    bank_credentials_repo.create_indexes().await?;

    let advertisement_repo = AdvertisementRepositoryImpl::new(&db);
    advertisement_repo.create_indexes().await?;

    let advertisement_deposit_repo = AdvertisementDepositRepositoryImpl::new(&db);
    advertisement_deposit_repo.create_indexes().await?;

    let buy_repo = BuyRepositoryImpl::new(&db);
    buy_repo.create_indexes().await?;

    let payment_request_repo = PaymentRequestRepositoryImpl::new(&db);
    payment_request_repo.create_indexes().await?;

    // Build app router
    let app = api::build_router(
        // db,
        // Arc::clone(&event_publisher),
        Arc::clone(&event_store),
        Arc::clone(&event_processor),
        Arc::clone(&config),
        Arc::clone(&advertisement_service),
        Arc::clone(&advertisement_deposit_service),
        Arc::clone(&bank_credentials_service),
        Arc::clone(&invite_service),
        Arc::clone(&buy_service),
        Arc::clone(&payment_request_service),
        Arc::clone(&quote_service),
    );

    let addr: std::net::SocketAddr = format!("0.0.0.0:{}", config.server_port).parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!("Server starting on {}", addr);
    tracing::info!("Event-driven architecture initialized");

    // Start server
    let server_handle = tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app.into_make_service()).await {
            tracing::error!("Server error: {}", e);
        }
    });

    // Wait for server, event processor, or any background task to finish
    tokio::select! {
        _ = server_handle => {
            tracing::info!("Server finished");
        }
        _ = event_processor_handle => {
            tracing::info!("Event processor finished");
        }
        result = task_registry.wait_for_any() => {
            if let Some(result) = result {
                tracing::info!("A background task finished: {:?}", result);
            }
        }
    }

    Ok(())
}

pub async fn setup_logging(config: &Config) {
    if config.production_mode {
        tracing::info!("Starting in production mode");
    } else {
        tracing::info!("Starting in development mode");
    }
}
