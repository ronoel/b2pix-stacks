use std::sync::Arc;
use axum::{extract::State, Json, response::IntoResponse, extract::Path};
use validator::Validate;
use serde_json::json;
use axum::response::Response;
use base64::{Engine as _, engine::general_purpose};

use crate::api::v1::invites::dto::{ParsedInvitePayload, ParsedClaimInvitePayload, SetCertificateDto, ParsedBankCredentialsPayload, ParsedCertificatePayload, BankSetupDto, ParsedBankSetupPayload};
use crate::common::signature::SignedRequest;
use crate::config::Config;
use crate::features::invites::services::{InviteService, ValidationService};
use crate::features::invites::domain::{
    commands::{SendInviteCommand, ClaimInviteCommand, SetBankCredentialsCommand, SetCertificateCommand, BankSetupCommand},
    entities::InviteCode
};
use crate::features::shared::{StacksAddress, Email, Username};
use crate::common::errors::ApiError;
use crate::infrastructure::blockchain::stacks::{
    signature::verify_message_signature_rsv,
    address::get_address_from_public_key
};

pub struct InviteHandlers {
    invite_service: Arc<InviteService>,
    config: Arc<Config>,
}

impl InviteHandlers {
    pub fn new(
        invite_service: Arc<InviteService>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            invite_service,
            config,
        }
    }
}

pub async fn send_invite(
    State(handlers): State<Arc<InviteHandlers>>,
    Json(payload): Json<SignedRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Parse and validate the structured payload
    let parsed_payload = ParsedInvitePayload::parse(&payload.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

    // Validate signature against the payload
    let signature_valid = verify_message_signature_rsv(&payload.payload, &payload.signature, &payload.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?;

    if !signature_valid {
        return Err(ApiError::BadRequest("Signature verification failed".to_string()));
    }

    // Validate that the public key corresponds to ADDRESS_MANAGER
    ValidationService::validate_manager_public_key(
        &payload.public_key,
        &handlers.config.address_manager,
        &handlers.config.network
    ).map_err(|_| ApiError::Unauthorized)?;

    // Create command
    let parent_id = StacksAddress::from_string("genesis".to_string());
    let command = SendInviteCommand {
        email: Email::from_string(parsed_payload.email),
        parent_id,
        authorized_by: payload.public_key,
    };

    // Execute business logic
    let invite_id = handlers.invite_service.send_invite(command).await?;

    // Return response without exposing the code
    Ok(Json(json!({
        "message": "Invite sent successfully",
        "invite_id": invite_id.to_string()
    })))
}

pub async fn claim_invite(
    State(handlers): State<Arc<InviteHandlers>>,
    Json(payload): Json<SignedRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Parse and validate the structured payload
    let parsed_payload = ParsedClaimInvitePayload::parse(&payload.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

    // Validate signature against the payload
    let signature_valid = verify_message_signature_rsv(&payload.payload, &payload.signature, &payload.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?;

    if !signature_valid {
        return Err(ApiError::BadRequest("Signature verification failed".to_string()));
    }

    // Validate that the address belongs to the public key
    if get_address_from_public_key(&payload.public_key, &handlers.config.network)
        .map_err(|e| ApiError::BadRequest(format!("Failed to derive address from public key: {}", e)))?
        != parsed_payload.address {
        return Err(ApiError::BadRequest("Address does not belong to public key".to_string()));
    }

    let username = Username::from_string(parsed_payload.username);
    let command = ClaimInviteCommand {
        code: InviteCode::from_string(parsed_payload.code.clone()),
        username,
        address: StacksAddress::from_string(parsed_payload.address),
    };

    handlers.invite_service.claim_invite(command).await?;
    let invite_code = InviteCode::from_string(parsed_payload.code);
    let claimed_invite = handlers.invite_service.get_invite_by_code(&invite_code).await?
        .ok_or(ApiError::NoContent)?;

    Ok(Json(json!({
        "status": claimed_invite.status().to_string(),
        "bank_status": claimed_invite.bank_status().to_string(),
    })))
}

pub async fn get_invite_by_code(
    State(handlers): State<Arc<InviteHandlers>>,
    Path(code): Path<String>,
) -> Result<Response, ApiError> {
    let invite_code = InviteCode::from_string(code);
    let resp = match handlers.invite_service.get_invite_by_code(&invite_code).await? {
        Some(invite) => Json(json!({
            "status": invite.status().to_string(),
            "bank_status": invite.bank_status().to_string(),
        })).into_response(),
        None => axum::http::StatusCode::NO_CONTENT.into_response(),
    };
    Ok(resp)
}

pub async fn get_invite_by_address(
    State(handlers): State<Arc<InviteHandlers>>,
    Path(address): Path<String>,
) -> Result<Response, ApiError> {
    ValidationService::validate_stacks_address(&address)
        .map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let stacks_address = StacksAddress::from_string(address.clone());
    let resp = match handlers.invite_service.get_invite_by_address(&stacks_address).await? {
        Some(invite) => Json(json!({
            "status": invite.status().to_string(),
            "bank_status": invite.bank_status().to_string(),
        })).into_response(),
        None => axum::http::StatusCode::NO_CONTENT.into_response(),
    };
    Ok(resp)
}

pub async fn set_bank_credentials(
    State(handlers): State<Arc<InviteHandlers>>,
    Json(payload): Json<SignedRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Validate request fields
    if let Err(e) = payload.validate() {
        return Err(ApiError::BadRequest(format!("Invalid payload: {}", e)));
    }

    // Parse and validate the structured payload
    let parsed_payload = ParsedBankCredentialsPayload::parse(&payload.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

    // // Validate signature against the payload
    // handlers.validation_service
    //     .validate_signature(&payload.payload, &payload.signature, &payload.public_key)
    //     .await
    //     .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?;

    // Validate signature against the payload
    let signature_valid = verify_message_signature_rsv(&payload.payload, &payload.signature, &payload.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?;

    if !signature_valid {
        return Err(ApiError::BadRequest("Signature verification failed".to_string()));
    }

    // Validate that the address belongs to the public key
    if get_address_from_public_key(&payload.public_key, &handlers.config.network)
        .map_err(|e| ApiError::BadRequest(format!("Failed to derive address from public key: {}", e)))?
        != parsed_payload.address {
        return Err(ApiError::BadRequest("Address does not belong to public key".to_string()));
    }

    // Validate that the public key corresponds to ADDRESS_MANAGER
    ValidationService::validate_manager_public_key(
        &payload.public_key,
        &handlers.config.address_manager,
        &handlers.config.network
    ).map_err(|_| ApiError::Unauthorized)?;

    // Create command
    let command = SetBankCredentialsCommand {
        address: parsed_payload.address,
        client_id: parsed_payload.client_id,
        secret_key: parsed_payload.secret_key,
        authorized_by: payload.public_key,
    };

    // Execute business logic
    handlers.invite_service.set_bank_credentials(command).await?;

    Ok(Json(json!({
        "message": "Bank credentials set successfully"
    })))
}

pub async fn set_certificate(
    State(handlers): State<Arc<InviteHandlers>>,
    Json(payload): Json<SetCertificateDto>,
) -> Result<impl IntoResponse, ApiError> {
    // Validate request fields
    if let Err(e) = payload.validate() {
        return Err(ApiError::BadRequest(format!("Invalid payload: {}", e)));
    }

    // Parse and validate the structured payload
    let parsed_payload = ParsedCertificatePayload::parse(&payload.signed_request.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

    // Validate signature against the payload
    let signature_valid = verify_message_signature_rsv(&payload.signed_request.payload, &payload.signed_request.signature, &payload.signed_request.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?;

    if !signature_valid {
        return Err(ApiError::BadRequest("Signature verification failed".to_string()));
    }

    // Validate that the address belongs to the public key
    if get_address_from_public_key(&payload.signed_request.public_key, &handlers.config.network)
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
    let command = SetCertificateCommand {
        address: parsed_payload.address,
        certificate_data,
        filename: payload.filename,
        authorized_by: payload.signed_request.public_key,
    };

    // Initialize GCS manager
    let gcs_manager = crate::infrastructure::storage::gcs_manager::GcsManager::new().await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to initialize GCS manager: {}", e)))?;

    // Execute business logic
    handlers.invite_service.set_certificate(command, &gcs_manager).await?;

    Ok(Json(json!({
        "message": "Certificate uploaded successfully"
    })))
}

pub async fn bank_setup(
    State(handlers): State<Arc<InviteHandlers>>,
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
    let command = BankSetupCommand {
        address: parsed_payload.address,
        client_id: parsed_payload.client_id,
        secret_key: parsed_payload.secret_key,
        certificate_data,
        authorized_by: payload.public_key,
    };

    // Execute business logic
    handlers.invite_service.bank_setup(command).await?;

    Ok(Json(json!({
        "message": "Bank setup completed successfully"
    })))
}
