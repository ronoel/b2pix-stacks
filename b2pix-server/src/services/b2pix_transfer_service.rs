use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;

use crate::config::Config;

#[derive(Debug, Error)]
pub enum B2PixTransferError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("Transfer failed: {0}")]
    TransferFailed(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TransferRequest {
    receiver_address: String,
    amount: u64,
}

#[derive(Debug, Deserialize)]
struct TransferResponse {
    txid: String,
    message: String,
}

#[derive(Debug, Deserialize)]
struct ErrorResponse {
    message: String,
}

pub struct B2PixTransferService {
    config: Arc<Config>,
    http_client: reqwest::Client,
}

impl B2PixTransferService {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            http_client: reqwest::Client::new(),
        }
    }

    /// Transfer sBTC to a receiver address using the B2Pix API
    ///
    /// # Arguments
    /// * `receiver_address` - The Stacks address to receive the sBTC
    /// * `amount` - The amount in micro-units (satoshis)
    ///
    /// # Returns
    /// * `Ok(String)` - Transaction ID on success
    /// * `Err(B2PixTransferError)` - Error details on failure
    pub async fn transfer(
        &self,
        receiver_address: String,
        amount: u64,
    ) -> Result<String, B2PixTransferError> {
        // let endpoint = format!(
        //     "http://localhost:{}/api/v1/b2pix/transfer",
        //     self.config.server_port
        // );

        let endpoint: String = if self.config.network == "mainnet" {
            "https://boltproto.org/api/v1/b2pix/transfer"
        } else {
            "http://localhost:3000/api/v1/b2pix/transfer"
        }
        .to_string();

        let request_body = TransferRequest {
            receiver_address: receiver_address.clone(),
            amount,
        };

        tracing::info!(
            receiver_address = %receiver_address,
            amount = %amount,
            endpoint = %endpoint,
            "Initiating automatic B2Pix transfer"
        );

        let response = self
            .http_client
            .post(&endpoint)
            .header("b2pix_api_key", &self.config.b2pix_api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();

        if status.is_success() {
            let transfer_response: TransferResponse = response
                .json()
                .await
                .map_err(|e| B2PixTransferError::InvalidResponse(e.to_string()))?;

            tracing::info!(
                txid = %transfer_response.txid,
                message = %transfer_response.message,
                "B2Pix transfer successful"
            );

            Ok(transfer_response.txid)
        } else {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());

            // Try to parse as error response
            let error_message = serde_json::from_str::<ErrorResponse>(&error_text)
                .map(|e| e.message)
                .unwrap_or_else(|_| error_text.clone());

            tracing::error!(
                status = %status,
                error = %error_message,
                "B2Pix transfer failed"
            );

            Err(B2PixTransferError::TransferFailed(format!(
                "Status {}: {}",
                status, error_message
            )))
        }
    }
}
