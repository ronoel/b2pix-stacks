pub mod events;
pub mod v1;

use axum::{Router, http::StatusCode};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::config::Config;
use crate::events::{processor::EventProcessor, store::EventStore};
use crate::features::advertisements::services::AdvertisementService;
use crate::features::advertisement_deposits::services::AdvertisementDepositService;
use crate::features::bank_credentials::services::BankCredentialsService;
use crate::features::buys::services::buy_service::BuyService;
use crate::features::invites::services::InviteService;
use crate::features::payment_requests::services::PaymentRequestService;
use crate::services::bitcoin_price::quote_service::QuoteService;

// Health check handler
async fn health_check() -> StatusCode {
    StatusCode::OK
}

pub fn build_router(
    // db: Database,
    // event_publisher: Arc<EventPublisher>,
    event_store: Arc<EventStore>,
    event_processor: Arc<EventProcessor>,
    config: Arc<Config>,
    advertisement_service: Arc<AdvertisementService>,
    advertisement_deposit_service: Arc<AdvertisementDepositService>,
    bank_credentials_service: Arc<BankCredentialsService>,
    invite_service: Arc<InviteService>,
    buy_service: Arc<BuyService>,
    payment_request_service: Arc<PaymentRequestService>,
    quote_service: Arc<QuoteService>,
) -> Router {
    let events_state: events::EventManagementState = events::EventManagementState {
        event_store,
        event_processor,
        config: Arc::clone(&config),
    };

    let mut router = Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/api/health", axum::routing::get(health_check))
        .nest(
            "/api/v1",
            v1::router(
                Arc::clone(&config),
                Arc::clone(&advertisement_service),
                Arc::clone(&advertisement_deposit_service),
                Arc::clone(&bank_credentials_service),
                Arc::clone(&invite_service),
                Arc::clone(&buy_service),
                Arc::clone(&payment_request_service),
                Arc::clone(&quote_service),
            ),
        )
        .nest("/api/events", events::router().with_state(events_state));

    // Enable CORS in non-production mode for development
    if !config.production_mode {
        router = router.layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );
    }

    router
}
