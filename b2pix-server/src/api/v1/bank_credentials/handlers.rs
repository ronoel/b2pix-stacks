use std::sync::Arc;
use axum::{extract::State, Json, response::IntoResponse};
use validator::Validate;
use serde_json::json;
use base64::{Engine as _, engine::general_purpose};

use crate::api::v1::bank_credentials::dto::{BankSetupDto, ParsedBankSetupPayload};
use crate::config::Config;
use crate::features::bank_credentials::services::BankCredentialsService;
use crate::features::bank_credentials::domain::commands::CreateBankCredentialsCommand;
use crate::features::shared::StacksAddress;
use crate::features::invites::services::InviteService;
use crate::common::errors::ApiError;
use crate::infrastructure::blockchain::stacks::{
    signature::verify_message_signature_rsv,
    address::get_address_from_public_key
};

pub struct BankCredentialsHandlers {
    bank_credentials_service: Arc<BankCredentialsService>,
    invite_service: Arc<InviteService>,
    config: Arc<Config>,
}

impl BankCredentialsHandlers {
    pub fn new(
        bank_credentials_service: Arc<BankCredentialsService>,
        invite_service: Arc<InviteService>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            bank_credentials_service,
            invite_service,
            config,
        }
    }
}

pub async fn bank_setup(
    State(handlers): State<Arc<BankCredentialsHandlers>>,
    Json(payload): Json<BankSetupDto>,
) -> Result<impl IntoResponse, ApiError> {
    // Validate request fields
    if let Err(e) = payload.validate() {
        return Err(ApiError::BadRequest(format!("Invalid payload: {}", e)));
    }

    // Attempt to verify the signature and return early if invalid
    if !verify_message_signature_rsv(&payload.payload, &payload.signature, &payload.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?
    {
        return Err(ApiError::BadRequest("Signature verification failed".to_string()));
    }

    // Parse and validate the structured payload
    let parsed_payload = ParsedBankSetupPayload::parse(&payload.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

    // Validate that the address belongs to the public key
    if get_address_from_public_key(&payload.public_key, &handlers.config.network)
        .map_err(|e| ApiError::BadRequest(format!("Failed to derive address from public key: {}", e)))?
        != parsed_payload.address {
        return Err(ApiError::BadRequest("Address does not belong to public key".to_string()));
    }

    // Decode the base64 certificate
    let certificate_data = general_purpose::STANDARD.decode(&payload.certificate)
        .map_err(|e| ApiError::BadRequest(format!("Invalid base64 certificate: {}", e)))?;

    // Validate that it's a .p12 file
    if !payload.filename.ends_with(".p12") {
        return Err(ApiError::BadRequest("Certificate must be a .p12 file".to_string()));
    }

    // Create command
    let command = CreateBankCredentialsCommand {
        address: StacksAddress::from_string(parsed_payload.address.clone()),
        client_id: parsed_payload.client_id,
        secret_key: parsed_payload.secret_key,
        certificate_data,
        authorized_by: StacksAddress::from_string(payload.public_key),
    };

    // Execute business logic - creates the bank credentials
    let credentials_id = handlers.bank_credentials_service.create_bank_credentials(command).await?;

    // Update the invite's bank_status to SUCCESS
    let address = StacksAddress::from_string(parsed_payload.address);
    let invite = handlers.invite_service.get_invite_by_address(&address).await?
        .ok_or(ApiError::NoContent)?;

    handlers.invite_service.update_bank_status(
        invite.id(),
        crate::features::invites::domain::entities::BankStatus::SUCCESS
    ).await?;

    Ok(Json(json!({
        "message": "Bank setup completed successfully",
        "credentials_id": credentials_id.to_string()
    })))
}

