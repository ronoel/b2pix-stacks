use std::sync::Arc;
use axum::{routing::{post, get}, Router};

use crate::api::v1::invites::handlers::{send_invite, claim_invite, get_invite_by_code, get_invite_by_address, bank_setup, InviteHandlers};
use crate::config::Config;
use crate::features::invites::services::{InviteService, ValidationService};

pub fn invite_routes(
    invite_service: Arc<InviteService>,
    config: Arc<Config>,
) -> Router {
    let handlers = Arc::new(InviteHandlers::new(invite_service, config));
    
    Router::new()
        .route("/send", post(send_invite))
        .route("/claim", post(claim_invite))
        .route("/code/:code", get(get_invite_by_code))
        .route("/address/:address", get(get_invite_by_address))
        .route("/banksetup", post(bank_setup))
        .with_state(handlers)
}
