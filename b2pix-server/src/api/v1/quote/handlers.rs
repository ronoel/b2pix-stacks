use std::sync::Arc;
use axum::{extract::State, Json};

use crate::common::errors::ApiError;
use crate::services::bitcoin_price::quote_service::QuoteService;

use super::dto::BitcoinPriceResponse;

pub struct QuoteHandlers {
    quote_service: Arc<QuoteService>,
}

impl QuoteHandlers {
    pub fn new(quote_service: Arc<QuoteService>) -> Self {
        Self { quote_service }
    }
}

/// Get the current Bitcoin price in USD
pub async fn get_bitcoin_price(
    State(handlers): State<Arc<QuoteHandlers>>,
) -> Result<Json<BitcoinPriceResponse>, ApiError> {
    // Fetch Bitcoin price from the quote service
    let bitcoin_price = handlers
        .quote_service
        .get_bitcoin_price()
        .await
        .map_err(|e| {
            tracing::error!("Failed to get Bitcoin price: {}", e);
            ApiError::InternalServerError(format!("Failed to get Bitcoin price: {}", e))
        })?;

    let response = BitcoinPriceResponse {
        price: bitcoin_price
    };

    Ok(Json(response))
}
