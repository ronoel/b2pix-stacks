use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct B2PIXValidateTransactionRequestDTO {
    #[serde(rename = "serializedTx")]
    pub serialized_tx: String,
    #[serde(rename = "recipientAddress")]
    pub recipient_address: String,
    pub amount: String,
}

#[derive(Debug, Serialize)]
pub struct B2PIXValidateTransactionResponseDTO {
    pub txid: String,
}