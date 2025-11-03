use serde::{Deserialize, Serialize};
use validator::Validate;

/// Common structure for authenticated requests requiring signature verification
/// Used across multiple APIs for operations that need cryptographic authentication
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct SignedRequest {
    #[validate(length(min = 1, message = "Signature is required"))]
    pub signature: String,
    
    #[validate(length(min = 1, message = "Public key is required"))]
    #[serde(rename = "publicKey")]
    pub public_key: String,
    
    #[validate(length(min = 1, message = "Payload is required"))]
    pub payload: String,
}

impl SignedRequest {
    /// Create a new signed request
    pub fn new(signature: String, public_key: String, payload: String) -> Self {
        Self {
            signature,
            public_key,
            payload,
        }
    }
    
    /// Get the signature
    pub fn signature(&self) -> &str {
        &self.signature
    }
    
    /// Get the public key
    pub fn public_key(&self) -> &str {
        &self.public_key
    }
    
    /// Get the payload
    pub fn payload(&self) -> &str {
        &self.payload
    }
}
