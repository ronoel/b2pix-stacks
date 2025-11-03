use std::sync::Arc;
use axum::{extract::State, Json};

use crate::{
    common::errors::ApiError,
    config::Config,
    services::bolt_transaction_b2pix::validate_and_broadcast_transaction,
};

use super::dto::*;

pub struct B2PIXHandlers {
    config: Arc<Config>,
}

impl B2PIXHandlers {
    pub fn new(config: Arc<Config>) -> Self {
        Self { config }
    }
}

/// Validates and broadcasts a B2PIX transaction
pub async fn validate_transaction_b2pix(
    State(handlers): State<Arc<B2PIXHandlers>>,
    Json(request): Json<B2PIXValidateTransactionRequestDTO>,
) -> Result<Json<String>, ApiError> {
    // Validate input
    if request.serialized_tx.trim().is_empty() {
        return Err(ApiError::BadRequest("Serialized transaction cannot be empty".to_string()));
    }
    
    if request.recipient_address.trim().is_empty() {
        return Err(ApiError::BadRequest("Recipient address cannot be empty".to_string()));
    }
    
    if request.amount.trim().is_empty() {
        return Err(ApiError::BadRequest("Amount cannot be empty".to_string()));
    }

    // Parse amount to u128
    let amount = request.amount.parse::<u128>()
        .map_err(|_| ApiError::BadRequest("Invalid amount format".to_string()))?;

    // Call the validate and broadcast function
    let txid = validate_and_broadcast_transaction(
        request.serialized_tx,
        request.recipient_address,
        amount,
        Arc::clone(&handlers.config),
    )
    .await
    .map_err(|e| {
        tracing::error!("Failed to validate and broadcast transaction: {}", e);
        ApiError::InternalServerError(format!("Failed to validate and broadcast transaction: {}", e))
    })?;

    Ok(Json(txid))
}