use std::sync::Arc;
use axum::{routing::post, Router};

use crate::api::v1::bank_credentials::handlers::{bank_setup, BankCredentialsHandlers};
use crate::config::Config;
use crate::features::bank_credentials::services::BankCredentialsService;
use crate::features::invites::services::InviteService;

pub fn bank_credentials_routes(
    bank_credentials_service: Arc<BankCredentialsService>,
    invite_service: Arc<InviteService>,
    config: Arc<Config>,
) -> Router {
    let handlers = Arc::new(BankCredentialsHandlers::new(
        bank_credentials_service,
        invite_service,
        config
    ));

    Router::new()
        .route("/banksetup", post(bank_setup))
        .with_state(handlers)
}
