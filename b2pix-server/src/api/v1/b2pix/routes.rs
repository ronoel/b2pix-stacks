use std::sync::Arc;
use axum::{routing::post, Router};

use crate::config::Config;

use super::handlers::*;

/// Create the B2PIX routes
pub fn b2pix_routes(config: Arc<Config>) -> Router {
    let handlers = Arc::new(B2PIXHandlers::new(config));

    Router::new()
        .route("/validatebroadcast", post(validate_transaction_b2pix))
        .with_state(handlers)
}