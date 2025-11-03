pub mod advertisements;
pub mod b2pix;
pub mod bank_credentials;
pub mod buys;
pub mod invites;
pub mod payment_requests;
pub mod quote;

use std::sync::Arc;
use axum::Router;

use crate::config::Config;
use crate::features::advertisements::services::AdvertisementService;
use crate::features::advertisement_deposits::services::AdvertisementDepositService;
use crate::features::bank_credentials::services::BankCredentialsService;
use crate::features::buys::services::buy_service::BuyService;
use crate::features::invites::services::InviteService;
use crate::features::payment_requests::services::PaymentRequestService;
use crate::services::bitcoin_price::quote_service::QuoteService;

pub fn router(
    config: Arc<Config>,
    advertisement_service: Arc<AdvertisementService>,
    advertisement_deposit_service: Arc<AdvertisementDepositService>,
    bank_credentials_service: Arc<BankCredentialsService>,
    invite_service: Arc<InviteService>,
    buy_service: Arc<BuyService>,
    payment_request_service: Arc<PaymentRequestService>,
    quote_service: Arc<QuoteService>,
) -> Router {

    Router::new()
        .nest("/advertisements", advertisements::advertisement_routes(advertisement_service, advertisement_deposit_service, Arc::clone(&config)))
        .nest("/bank-credentials", bank_credentials::routes::bank_credentials_routes(
            Arc::clone(&bank_credentials_service),
            Arc::clone(&invite_service),
            Arc::clone(&config)
        ))
        .nest("/invites", invites::invite_routes(Arc::clone(&invite_service), Arc::clone(&config)))
        .nest("/buys", buys::buy_routes(buy_service, Arc::clone(&config)))
        .nest("/b2pix", b2pix::routes::b2pix_routes(Arc::clone(&config)))
        .nest("/payment-requests", payment_requests::payment_request_routes(payment_request_service))
        .nest("/quote", quote::quote_routes(quote_service))
}