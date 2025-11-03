use serde::{Deserialize, Serialize};
use validator::Validate;
use crate::features::invites::services::ValidationService;
use crate::common::signature::SignedRequest;

/// Response DTO for invite status
#[derive(Debug, Serialize)]
pub struct InviteStatusDto {
    pub id: String,
    pub email: String,
    pub status: String,
    pub created_at: String,
}

/// Parsed payload structure for send invite
#[derive(Debug, Serialize)]
pub struct ParsedInvitePayload {
    pub action: String,
    pub domain: String,
    pub email: String,
    pub timestamp: String,
}

impl ParsedInvitePayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 4 {
            return Err("Payload must contain exactly 4 lines".to_string());
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let email = lines[2].trim().to_string();
        let timestamp = lines[3].trim().to_string();
        
        // Validate action using ValidationService
        if action != "B2PIX - Enviar Convite" {
            return Err(format!("Invalid action. Expected 'B2PIX - Enviar Convite', got '{}'", action));
        }
        
        // Validate domain using ValidationService
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;
        
        // Validate email using ValidationService
        ValidationService::validate_email(&email)
            .map_err(|e| format!("Email validation failed: {}", e))?;
        
        // Validate timestamp using ValidationService
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;
        
        Ok(ParsedInvitePayload {
            action,
            domain,
            email,
            timestamp,
        })
    }
}

/// Parsed payload structure for claim invite
#[derive(Debug, Serialize)]
pub struct ParsedClaimInvitePayload {
    pub action: String,
    pub domain: String,
    pub code: String,
    pub username: String,
    pub address: String,
    pub timestamp: String,
}

impl ParsedClaimInvitePayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 6 {
            return Err("Payload must contain exactly 6 lines".to_string());
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let code = lines[2].trim().to_string();
        let username = lines[3].trim().to_string();
        let address = lines[4].trim().to_string();
        let timestamp = lines[5].trim().to_string();

        // Validate action
        if action != "B2PIX - Resgatar Convite" {
            return Err(format!("Invalid action. Expected 'B2PIX - Resgatar Convite', got '{}'", action));
        }
        
        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;

        // Validate username
        ValidationService::validate_username(&username)
            .map_err(|e| format!("Username validation failed: {}", e))?;

        // Validate Stacks address format
        ValidationService::validate_stacks_address(&address)
            .map_err(|e| format!("Address validation failed: {}", e))?;
        
        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;
        
        Ok(ParsedClaimInvitePayload {
            action,
            domain,
            code,
            username,
            address,
            timestamp,
        })
    }
}

/// Request DTO for setting bank credentials
/// Request DTO for setting certificate
#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct SetCertificateDto {
    #[serde(flatten)]
    pub signed_request: SignedRequest,
    
    #[validate(length(min = 1, message = "Certificate file is required"))]
    pub certificate: String, // base64 encoded file
    
    #[validate(length(min = 1, message = "Filename is required"))]
    pub filename: String,
}

/// Request DTO for bank setup (unified credentials and certificate)
#[derive(Debug, Deserialize, Serialize, Validate)]
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

/// Parsed payload structure for setting bank credentials
#[derive(Debug, Serialize)]
pub struct ParsedBankCredentialsPayload {
    pub action: String,
    pub domain: String,
    pub address: String,
    pub client_id: String,
    pub secret_key: String,
    pub timestamp: String,
}

impl ParsedBankCredentialsPayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 6 {
            return Err("Payload must contain exactly 6 lines".to_string());
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let address = lines[2].trim().to_string();
        let client_id = lines[3].trim().to_string();
        let secret_key = lines[4].trim().to_string();
        let timestamp = lines[5].trim().to_string();
        
        // Validate action
        if action != "B2PIX - Definir Credenciais Bancárias" {
            return Err(format!("Invalid action. Expected 'B2PIX - Definir Credenciais Bancárias', got '{}'", action));
        }
        
        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;
        
        // Validate address
        ValidationService::validate_stacks_address(&address)
            .map_err(|e| format!("Address validation failed: {}", e))?;
        
        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;
        
        Ok(ParsedBankCredentialsPayload {
            action,
            domain,
            address,
            client_id,
            secret_key,
            timestamp,
        })
    }
}

/// Parsed payload structure for setting certificate
#[derive(Debug, Serialize)]
pub struct ParsedCertificatePayload {
    pub action: String,
    pub domain: String,
    pub address: String,
    pub timestamp: String,
}

impl ParsedCertificatePayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 4 {
            return Err("Payload must contain exactly 4 lines".to_string());
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let address = lines[2].trim().to_string();
        let timestamp = lines[3].trim().to_string();
        
        // Validate action
        if action != "B2PIX - Definir Certificado" {
            return Err(format!("Invalid action. Expected 'B2PIX - Definir Certificado', got '{}'", action));
        }
        
        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;
        
        // Validate address
        ValidationService::validate_stacks_address(&address)
            .map_err(|e| format!("Address validation failed: {}", e))?;
        
        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;
        
        Ok(ParsedCertificatePayload {
            action,
            domain,
            address,
            timestamp,
        })
    }
}

/// Parsed payload structure for bank setup (unified credentials and certificate)
#[derive(Debug, Serialize)]
pub struct ParsedBankSetupPayload {
    pub action: String,
    pub domain: String,
    pub address: String,
    pub client_id: String,
    pub secret_key: String,
    pub timestamp: String,
}

impl ParsedBankSetupPayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 6 {
            return Err("Payload must contain exactly 6 lines".to_string());
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let address = lines[2].trim().to_string();
        let client_id = lines[3].trim().to_string();
        let secret_key = lines[4].trim().to_string();
        let timestamp = lines[5].trim().to_string();
        
        // Validate action
        if action != "B2PIX - Configurar Banco" {
            return Err(format!("Invalid action. Expected 'B2PIX - Configurar Banco', got '{}'", action));
        }
        
        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;
        
        // Validate address
        ValidationService::validate_stacks_address(&address)
            .map_err(|e| format!("Address validation failed: {}", e))?;
        
        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;
        
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
