use std::sync::Arc;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::config::Config;

#[derive(Debug, Error)]
pub enum BoltTransactionError {
    #[error("Failed to send request: {0}")]
    RequestFailed(String),
    #[error("API error: {0} - {1}")]
    ApiError(u16, String),
    #[error("Failed to parse response: {0}")]
    ParseError(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

fn deserialize_string_to_u128<'de, D>(deserializer: D) -> Result<u128, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    s.parse().map_err(serde::de::Error::custom)
}

fn deserialize_string_to_i128<'de, D>(deserializer: D) -> Result<i128, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    s.parse().map_err(serde::de::Error::custom)
}

/// Flexible deserializer that accepts both string and integer representations of u128
fn deserialize_flexible_u128<'de, D>(deserializer: D) -> Result<u128, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    use std::fmt;

    struct FlexibleU128Visitor;

    impl<'de> Visitor<'de> for FlexibleU128Visitor {
        type Value = u128;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a string or integer representing u128")
        }

        fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            Ok(value as u128)
        }

        fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            if value < 0 {
                return Err(E::custom("negative values are not allowed for u128"));
            }
            Ok(value as u128)
        }

        fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            value.parse().map_err(E::custom)
        }

        fn visit_string<E>(self, value: String) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            value.parse().map_err(E::custom)
        }
    }

    deserializer.deserialize_any(FlexibleU128Visitor)
}

#[derive(serde::Deserialize, Debug)]
pub struct TransactionDetailResponse {
    pub sender: String,
    pub recipient: String,
    #[serde(deserialize_with = "deserialize_string_to_i128")]
    pub price: i128,
    pub currency: String,
    #[serde(deserialize_with = "deserialize_string_to_u128")]
    pub amount: u128,
}

#[derive(serde::Deserialize, Debug)]
pub struct BroadcastResponse {
    pub txid: String,
    pub sender: String,
    pub recipient: String,
    #[serde(deserialize_with = "deserialize_string_to_i128")]
    pub price: i128,
    pub currency: String,
    #[serde(deserialize_with = "deserialize_string_to_u128")]
    pub amount: u128,
}


pub async fn get_detail_transaction(
    serialized_tx: &str,
    config: Arc<Config>,
) -> Result<TransactionDetailResponse, BoltTransactionError> {
    // Implementation for broadcasting the transaction
    tracing::info!("Broadcasting transaction: {}", serialized_tx);

    // Access config values
    tracing::info!("Using network: {}", &config.network);

    let base_url = if config.network == "mainnet" {
        "https://boltproto.org/api/v1/transaction/b2pix/detail"
    } else {
        "http://localhost:3000/api/v1/transaction/b2pix/detail"
    };

    #[derive(serde::Serialize)]
    struct TransactionRequest {
        #[serde(rename = "serializedTx")]
        serialized_tx: String,
    }

    // Send transaction to the transaction API
    let transaction_request = TransactionRequest {
        serialized_tx: serialized_tx.to_string(),
    };

    let client = reqwest::Client::new();
    let transaction_response = client
        .post(base_url)
        .header("x-client-source", "b2pix")
        .json(&transaction_request)
        .send()
        .await
        .map_err(|e| BoltTransactionError::RequestFailed(e.to_string()))?;

    if !transaction_response.status().is_success() {
        let status = transaction_response.status();
        let error_text = transaction_response.text().await.unwrap_or_default();
        return Err(BoltTransactionError::ApiError(
            status.as_u16(),
            error_text
        ));
    }

    let transaction_detail_response: TransactionDetailResponse = transaction_response.json().await.map_err(|e| {
        BoltTransactionError::ParseError(e.to_string())
    })?;

    Ok(transaction_detail_response)
}


pub async fn broadcast_transaction(
    serialized_tx: String,
    config: Arc<Config>,
) -> Result<BroadcastResponse, BoltTransactionError> {
    // Implementation for broadcasting the transaction
    tracing::info!("Broadcasting transaction: {}", serialized_tx);

    // Access config values
    tracing::info!("Using network: {}", &config.network);

    let base_url = if config.network == "mainnet" {
        "https://boltproto.org/api/v1/transaction/b2pix/broadcast"
    } else {
        "http://localhost:3000/api/v1/transaction/b2pix/broadcast"
    };

    #[derive(serde::Serialize)]
    struct TransactionRequest {
        #[serde(rename = "serializedTx")]
        serialized_tx: String,
    }

    // Send transaction to the transaction API
    let transaction_request = TransactionRequest {
        serialized_tx: serialized_tx,
    };

    let client = reqwest::Client::new();
    let transaction_response = client
        .post(base_url)
        .header("x-client-source", "b2pix")
        .json(&transaction_request)
        .send()
        .await
        .map_err(|e| BoltTransactionError::RequestFailed(e.to_string()))?;

    if !transaction_response.status().is_success() {
        let status = transaction_response.status();
        let error_text = transaction_response.text().await.unwrap_or_default();
        return Err(BoltTransactionError::ApiError(
            status.as_u16(),
            error_text
        ));
    }

    let broadcast_response: BroadcastResponse = transaction_response.json().await.map_err(|e| {
        BoltTransactionError::ParseError(e.to_string())
    })?;

    Ok(broadcast_response)
}

/// Validates and broadcasts a B2Pix transaction
/// Before broadcasting, it validates the transaction details like recipient address and amount of the transaction
/// # Arguments
/// * `serialized_tx` - The serialized transaction string
/// * `recipient_address` - The recipient address to validate against
/// * `amount` - The amount to validate against
/// If validation is successful, it broadcasts the transaction and returns the transaction ID
/// If validation fails, it returns Bad Request error
pub async fn validate_and_broadcast_transaction(
    serialized_tx: String,
    recipient_address: String,
    amount: u128,
    config: Arc<Config>,
) -> Result<String, BoltTransactionError> {
    // Implementation for validating and broadcasting the transaction

    // Access config values
    tracing::info!("Using network: {}", &config.network);

    let base_url = if config.network == "mainnet" {
        "https://boltproto.org/api/v1/transaction/b2pix/validatebroadcast"
    } else {
        "http://localhost:3000/api/v1/transaction/b2pix/validatebroadcast"
    };

    #[derive(serde::Serialize)]
    struct ValidateBroadcastRequest {
        #[serde(rename = "serializedTx")]
        serialized_tx: String,
        #[serde(rename = "recipientAddress")]
        recipient_address: String,
        amount: String,
    }

    // Send transaction to the transaction API
    let validate_broadcast_request = ValidateBroadcastRequest {
        serialized_tx,
        recipient_address,
        amount: amount.to_string(),
    };

    let client = reqwest::Client::new();
    let transaction_response = client
        .post(base_url)
        .header("x-client-source", "b2pix")
        .json(&validate_broadcast_request)
        .send()
        .await
        .map_err(|e| BoltTransactionError::RequestFailed(e.to_string()))?;

    if !transaction_response.status().is_success() {
        let status = transaction_response.status();
        let error_text = transaction_response.text().await.unwrap_or_default();
        return Err(BoltTransactionError::ApiError(
            status.as_u16(),
            error_text
        ));
    }

    // Get the response text first to handle different response formats
    let response_text = transaction_response.text().await.map_err(|e| {
        BoltTransactionError::ParseError(e.to_string())
    })?;

    // tracing::info!("Validate broadcast response text: {}", response_text);

    // Try to parse as JSON first (BroadcastResponse), if that fails, assume it's a plain string (txid)
    if let Ok(broadcast_response) = serde_json::from_str::<BroadcastResponse>(&response_text) {
        // tracing::info!("Parsed as BroadcastResponse: {:?}", broadcast_response);
        Ok(broadcast_response.txid)
    } else {
        // If JSON parsing fails, treat the response as a plain string (transaction ID)
        let txid = response_text.trim().trim_matches('"').to_string();
        // tracing::info!("Parsed as plain string txid: {}", txid);
        
        // Basic validation to ensure it looks like a transaction ID
        if txid.is_empty() {
            return Err(BoltTransactionError::InvalidResponse(
                "Empty transaction ID received".to_string()
            ));
        }
        
        Ok(txid)
    }
}

/// Deposit request for Bolt Protocol
#[derive(Serialize, Debug)]
pub struct B2PixDepositRequest {
    #[serde(rename = "serializedTx")]
    pub serialized_tx: String,
    #[serde(rename = "receiverAddress")]
    pub receiver_address: String,
}

/// Deposit response from Bolt Protocol
#[derive(Deserialize, Debug)]
pub struct B2PixDepositResponse {
    pub txid: String,
    #[serde(deserialize_with = "deserialize_flexible_u128")]
    pub amount: u128,
    pub success: bool,
    pub message: Option<String>,
}

/// Calls Bolt Protocol deposit endpoint to broadcast and validate a deposit transaction
/// Bolt validates that the transaction recipient matches the provided receiver_address
/// Returns the transaction ID and amount if successful
pub async fn call_deposit_endpoint(
    serialized_tx: &str,
    receiver_address: &str,
    config: Arc<Config>,
) -> Result<B2PixDepositResponse, BoltTransactionError> {
    tracing::info!("Calling Bolt deposit endpoint for receiver: {}", receiver_address);

    let base_url = if config.network == "mainnet" {
        "https://boltproto.org/api/v1/b2pix/deposit"
    } else {
        "http://localhost:3000/api/v1/b2pix/deposit"
    };

    let request_body = B2PixDepositRequest {
        serialized_tx: serialized_tx.to_string(),
        receiver_address: receiver_address.to_string(),
    };

    let client = reqwest::Client::new();
    let response = client
        .post(base_url)
        .header("x-client-source", "b2pix")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| BoltTransactionError::RequestFailed(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        tracing::error!("Bolt deposit endpoint failed: {} - {}", status, error_text);
        return Err(BoltTransactionError::ApiError(
            status.as_u16(),
            error_text,
        ));
    }

    let deposit_response: B2PixDepositResponse = response
        .json()
        .await
        .map_err(|e| BoltTransactionError::ParseError(e.to_string()))?;

    // Check if the deposit was successful
    if !deposit_response.success {
        let error_msg = deposit_response.message.clone().unwrap_or("Deposit failed".to_string());
        tracing::error!("Bolt deposit endpoint returned success=false: {}", error_msg);
        return Err(BoltTransactionError::InvalidResponse(error_msg));
    }

    tracing::info!(
        "Bolt deposit successful - txid: {}, amount: {}",
        deposit_response.txid,
        deposit_response.amount
    );

    Ok(deposit_response)
}
