use crate::features::shared::{StacksAddress, PublicKey, Email};
use crate::common::errors::InviteError;
use crate::infrastructure::blockchain::stacks::{is_valid_public_key, get_address_from_public_key, is_valid_stacks_address, verify_message_signature_rsv};
use tracing;

pub struct ValidationService;

impl ValidationService {
    pub fn validate_stacks_address(address: &str) -> Result<(), InviteError> {
        if is_valid_stacks_address(address) {
            Ok(())
        } else {
            Err(InviteError::InvalidAddress)
        }
    }

    pub fn validate_public_key(public_key: &str) -> Result<(), InviteError> {
        if is_valid_public_key(public_key) {
            Ok(())
        } else {
            Err(InviteError::InvalidPublicKey)
        }
    }

    pub fn validate_address_matches_public_key(
        address: &StacksAddress,
        public_key: &PublicKey,
    ) -> Result<(), InviteError> {
        let derived_address = get_address_from_public_key(public_key.as_str(), "mainnet")
            .map_err(|_| InviteError::InvalidPublicKey)?;

        if derived_address != address.as_str() {
            return Err(InviteError::AddressPublicKeyMismatch);
        }

        Ok(())
    }

    // pub async fn validate_signatureTEMP<T>(&self, payload: &T) -> Result<(), InviteError>
    // where
    //     T: std::fmt::Debug + serde::Serialize,
    // {
    //     tracing::info!("Starting signature validation for payload: {:?}", payload);
        
    //     // Try to extract signature data from the payload
    //     // This assumes the payload has the structure of InviteRequestDto
    //     let payload_json = serde_json::to_value(payload)
    //         .map_err(|e| {
    //             let error_msg = format!("Failed to serialize payload: {}", e);
    //             tracing::error!("{}", error_msg);
    //             InviteError::Internal(error_msg)
    //         })?;
        
    //     tracing::debug!("Serialized payload to JSON: {}", payload_json);
        
    //     // Extract required fields from the JSON
    //     let signature = payload_json
    //         .get("signature")
    //         .and_then(|v| v.as_str())
    //         .ok_or_else(|| {
    //             tracing::error!("Missing or invalid signature field in payload");
    //             InviteError::InvalidSignature
    //         })?;
            
    //     let public_key = payload_json
    //         .get("public_key")
    //         .or_else(|| payload_json.get("publicKey"))
    //         .and_then(|v| v.as_str())
    //         .ok_or_else(|| {
    //             tracing::error!("Missing or invalid public_key/publicKey field in payload");
    //             InviteError::InvalidPublicKey
    //         })?;
        
    //     let inner_payload = payload_json
    //         .get("payload")
    //         .ok_or_else(|| {
    //             tracing::error!("Missing payload field in request");
    //             InviteError::InvalidSignature
    //         })?;
        
    //     tracing::debug!("Extracted signature: {}", signature);
    //     tracing::debug!("Extracted public_key: {}", public_key);
    //     tracing::debug!("Extracted inner_payload: {}", inner_payload);
        
    //     // Extract the message that was signed - it should be a raw string, not JSON serialized
    //     let message = inner_payload
    //         .as_str()
    //         .ok_or_else(|| {
    //             tracing::error!("Payload field is not a string: {}", inner_payload);
    //             InviteError::InvalidSignature
    //         })?;
        
    //     tracing::debug!("Message to verify: {}", message);
        
    //     // Verify the signature using the RSV format verification
    //     match verify_message_signature_rsv(&message, signature, public_key).await {
    //         Ok(is_valid) => {
    //             if is_valid {
    //                 tracing::info!("Signature validation successful");
    //                 Ok(())
    //             } else {
    //                 tracing::error!("Signature verification failed: signature is invalid");
    //                 Err(InviteError::InvalidSignature)
    //             }
    //         }
    //         Err(e) => {
    //             tracing::error!("Signature verification failed with error: {}", e);
    //             Err(InviteError::InvalidSignature)
    //         }
    //     }
    // }

    pub fn validate_username(username: &str) -> Result<(), InviteError> {
        if username.len() < 3 {
            return Err(InviteError::InvalidUsername("Username too short".to_string()));
        }
        if username.len() > 20 {
            return Err(InviteError::InvalidUsername("Username too long".to_string()));
        }
        Ok(())
    }

    pub fn validate_email(email: &str) -> Result<(), InviteError> {
        match Email::new(email.to_string()) {
            Ok(_) => Ok(()),
            Err(e) => Err(InviteError::InvalidEmail(e)),
        }
    }

    pub fn validate_action(action: &str) -> Result<(), InviteError> {
        if action != "B2PIX - Solicitar Convite" {
            return Err(InviteError::InvalidAction);
        }
        Ok(())
    }

    pub fn validate_approve_action(action: &str) -> Result<(), InviteError> {
        if action != "B2PIX - Aprovar Convite" {
            return Err(InviteError::InvalidAction);
        }
        Ok(())
    }

    /// Validate that the public key corresponds to the ADDRESS_MANAGER
    /// This ensures that administrative actions are performed by the authorized address
    pub fn validate_manager_public_key(public_key: &str, address_manager: &str, network: &str) -> Result<(), InviteError> {
        // Derive the address from the public key
        let derived_address = get_address_from_public_key(public_key, network)
            .map_err(|_| InviteError::InvalidPublicKey)?;

        // Check if the derived address matches the ADDRESS_MANAGER
        if derived_address != address_manager {
            tracing::error!(
                "Unauthorized access attempt: derived address {} does not match ADDRESS_MANAGER {}",
                derived_address,
                address_manager
            );
            return Err(InviteError::InvalidPublicKey);
        }

        Ok(())
    }

    pub fn validate_domain(domain: &str) -> Result<(), InviteError> {
        if domain != "b2pix.org" {
            return Err(InviteError::InvalidDomain);
        }
        Ok(())
    }

    // pub async fn validate_signature(
    //     &self,
    //     payload: &str,
    //     signature: &str,
    //     public_key: &str,
    // ) -> Result<(), InviteError> {
    //     tracing::info!("Validating send invite signature");
    //     tracing::debug!("Payload: {}", payload);
    //     tracing::debug!("Signature: {}", signature);
    //     tracing::debug!("Public Key: {}", public_key);

    //     // Verify the signature using the RSV format verification
    //     match verify_message_signature_rsv(payload, signature, public_key).await {
    //         Ok(is_valid) => {
    //             if is_valid {
    //                 tracing::info!("Send invite signature validation successful");
    //                 Ok(())
    //             } else {
    //                 tracing::error!("Send invite signature verification failed: signature is invalid");
    //                 Err(InviteError::InvalidSignature)
    //             }
    //         }
    //         Err(e) => {
    //             tracing::error!("Send invite signature verification failed with error: {}", e);
    //             Err(InviteError::InvalidSignature)
    //         }
    //     }
    // }

    pub fn validate_timestamp(timestamp: &str) -> Result<(), InviteError> {
        // Parse timestamp as ISO 8601 format
        match chrono::DateTime::parse_from_rfc3339(timestamp) {
            Ok(parsed_time) => {
                let now = chrono::Utc::now();
                let time_diff = now.signed_duration_since(parsed_time.with_timezone(&chrono::Utc));
                
                // Allow timestamps within 5 minutes of current time (both past and future)
                if time_diff.num_minutes().abs() > 5 {
                    tracing::warn!("Timestamp validation failed: timestamp is too old or too far in the future. Diff: {} minutes", time_diff.num_minutes());
                    return Err(InviteError::InvalidTimestamp);
                }
                
                tracing::debug!("Timestamp validation successful. Time diff: {} seconds", time_diff.num_seconds());
                Ok(())
            }
            Err(e) => {
                tracing::error!("Failed to parse timestamp '{}': {}", timestamp, e);
                Err(InviteError::InvalidTimestamp)
            }
        }
    }
}
