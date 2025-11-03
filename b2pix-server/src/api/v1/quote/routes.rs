use std::sync::Arc;
use axum::{routing::get, Router};

use crate::services::bitcoin_price::quote_service::QuoteService;

use super::handlers::{self, QuoteHandlers};

pub fn quote_routes(quote_service: Arc<QuoteService>) -> Router {
    let handlers = Arc::new(QuoteHandlers::new(quote_service));

    Router::new()
        .route("/btc", get(handlers::get_bitcoin_price))
        .with_state(handlers)
}
