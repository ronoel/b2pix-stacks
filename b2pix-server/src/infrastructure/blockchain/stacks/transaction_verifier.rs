use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Transaction status enum representing possible states of a Stacks transaction
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TransactionStatus {
    Pending,
    Success,
    AbortByPostCondition,
    AbortByResponse,
    DroppedReplaceByFee,
    UnknownStatus,
}

impl TransactionStatus {
    /// Validates if a given status string is a valid TransactionStatus
    fn from_str(status: &str) -> Result<Self, TransactionError> {
        match status {
            "pending" => Ok(TransactionStatus::Pending),
            "success" => Ok(TransactionStatus::Success),
            "abort_by_post_condition" => Ok(TransactionStatus::AbortByPostCondition),
            "abort_by_response" => Ok(TransactionStatus::AbortByResponse),
            "dropped_replace_by_fee" => Ok(TransactionStatus::DroppedReplaceByFee),
            _ => Ok(TransactionStatus::UnknownStatus),
        }
    }
}

/// Transaction response containing status and optional additional data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResponse {
    pub status: TransactionStatus,
    pub result: Option<serde_json::Value>,
    pub block_height: Option<u64>,
}

/// API response from Stacks node
#[derive(Debug, Deserialize)]
struct StacksApiResponse {
    tx_status: String,
    tx_result: Option<serde_json::Value>,
    block_height: Option<u64>,
}

/// Errors that can occur when verifying transaction status
#[derive(Debug, Error)]
pub enum TransactionError {
    #[error("Invalid transaction status: {0}")]
    InvalidStatus(String),
    #[error("HTTP request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),
    #[error("Failed to parse response: {0}")]
    ParseError(#[from] serde_json::Error),
}

/// Stacks blockchain transaction verifier
pub struct TransactionVerifier {
    base_url: String,
    client: reqwest::Client,
}

impl TransactionVerifier {
    /// Creates a new TransactionVerifier instance from config
    pub fn from_config(config: &crate::config::Config) -> Self {
        let is_mainnet = config.network.to_lowercase() == "mainnet";
        Self::new(is_mainnet)
    }

    /// Creates a new TransactionVerifier instance
    pub fn new(is_mainnet: bool) -> Self {
        let base_url = if is_mainnet {
            "https://api.hiro.so".to_string()
        } else {
            "https://api.testnet.hiro.so".to_string()
        };

        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    /// Verifies the current status of a transaction
    /// 
    /// # Arguments
    /// * `transaction_id` - The transaction ID to verify
    /// 
    /// # Returns
    /// * `Result<TransactionResponse, TransactionError>` - The transaction status response or error
    pub async fn verify_transaction_status(&self, transaction_id: &str) -> Result<TransactionResponse, TransactionError> {
        let url = format!("{}/extended/v1/tx/{}", self.base_url, "0x".to_string() + transaction_id);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;

        let api_response: StacksApiResponse = response.json().await?;
        
        let status = TransactionStatus::from_str(&api_response.tx_status)?;
        
        let transaction_response = match status {
            TransactionStatus::Pending => TransactionResponse {
                status,
                result: None,
                block_height: None,
            },
            _ => TransactionResponse {
                status,
                result: api_response.tx_result,
                block_height: api_response.block_height,
            },
        };

        Ok(transaction_response)
    }
}
