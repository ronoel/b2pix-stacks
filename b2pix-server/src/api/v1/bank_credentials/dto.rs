use serde::{ser::Error, Deserialize, Serialize};
use validator::Validate;

use crate::features::invites::services::ValidationService;

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct BankSetupDto {
    #[validate(length(min = 1, message = "Signature is required"))]
    pub signature: String,
    
    #[validate(length(min = 1, message = "Public key is required"))]
    #[serde(rename = "publicKey")]
    pub public_key: String,
    
    #[validate(length(min = 1, message = "Payload is required"))]
    pub payload: String,
    
    #[validate(length(min = 1, message = "Certificate file is required"))]
    pub certificate: String, // base64 encoded file
    
    #[validate(length(min = 1, message = "Filename is required"))]
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedBankSetupPayload {
    pub action: String,
    pub domain: String,
    pub address: String,
    pub client_id: String,
    pub secret_key: String,
    pub timestamp: String
}

impl ParsedBankSetupPayload {
    pub fn parse(payload: &str) -> Result<Self, serde_json::Error> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 6 {
            return Err(serde_json::Error::custom("Payload must contain exactly 6 lines"));
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let address = lines[2].trim().to_string();
        let client_id = lines[3].trim().to_string();
        let secret_key = lines[4].trim().to_string();
        let timestamp = lines[5].trim().to_string();
        
        // Validate action
        if action != "B2PIX - Configurar Banco" {
            return Err(serde_json::Error::custom(format!("Invalid action. Expected 'B2PIX - Configurar Banco', got '{}'", action)));
        }
        
        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| serde_json::Error::custom(format!("Domain validation failed: {}", e)))?;
        
        // Validate address
        ValidationService::validate_stacks_address(&address)
            .map_err(|e| serde_json::Error::custom(format!("Address validation failed: {}", e)))?;
        
        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| serde_json::Error::custom(format!("Timestamp validation failed: {}", e)))?;
        
        Ok(ParsedBankSetupPayload {
            action,
            domain,
            address,
            client_id,
            secret_key,
            timestamp,
        })
    }
}
