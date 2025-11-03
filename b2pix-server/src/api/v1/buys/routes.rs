use std::sync::Arc;

use axum::{
    routing::{get, post, put},
    Router,
};
use crate::{config::Config, features::buys::services::buy_service::BuyService};

use super::handlers::*;

/// Create the buy routes
pub fn buy_routes(
    buy_service: Arc<BuyService>,
    config: Arc<Config>,
) -> Router {

    let handlers = Arc::new(BuyHandlers::new(
        buy_service,
        config,
    ));

    Router::new()
        // Create a new buy order
        .route("/", post(start_buy))
        // // List buys with optional filtering
        // .route("/", get(list_buys))
        // // Get statistics
        // .route("/statistics", get(get_buy_statistics))
        // Get all buys for an advertisement
        .route("/advertisement/:advertisement_id", get(get_buys_by_advertisement))
        // Get all buys in dispute
        .route("/disputed", get(get_disputed_buys))
        // Get all buys by address with pagination
        .route("/address/:address", get(get_buys_by_address))
        // Get specific buy by ID
        .route("/:id", get(get_buy))
        // Mark buy as paid
        .route("/:id/paid", put(mark_buy_as_paid))
        // Resolve buy dispute (only for authorized public keys)
        .route("/resolve-dispute", put(resolve_buy_dispute))
        // Cancel a buy
        .route("/cancel", put(cancel_buy))
        // // Update buy status
        // .route("/:buy_id/status", put(update_buy_status))
        .with_state(handlers)
}
