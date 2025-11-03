use serde::{Deserialize, Serialize};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use chrono::{Duration, Utc};
use base64::{Engine as _, engine::general_purpose};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use rand_core::RngCore;
use sha2::{Digest, Sha256};
use thiserror::Error;

// Add these to your Cargo.toml:
// [dependencies]
// serde = { version = "1.0", features = ["derive"] }
// jsonwebtoken = "9.2"
// chrono = { version = "0.4", features = ["serde"] }
// base64 = "0.21"
// aes-gcm = "0.10"
// sha2 = "0.10"
// thiserror = "1.0"

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmailValidationClaims {
    pub wallet_address: String,
    pub email: String,
    pub username: String,
    pub exp: i64, // Expiration timestamp
    pub iat: i64, // Issued at timestamp
}

#[derive(Error, Debug)]
pub enum TokenError {
    #[error("JWT error: {0}")]
    JwtError(#[from] jsonwebtoken::errors::Error),
    #[error("Encryption error: {0}")]
    EncryptionError(String),
    #[error("Decryption error: {0}")]
    DecryptionError(String),
    #[error("Token expired")]
    TokenExpired,
    #[error("Base64 decode error: {0}")]
    Base64Error(#[from] base64::DecodeError),
}

pub struct EmailTokenManager {
    jwt_secret: Vec<u8>,
    encryption_key: Key<Aes256Gcm>,
}

impl EmailTokenManager {
    /// Create a new token manager with a master secret
    /// The secret should be at least 32 bytes and stored securely
    pub fn new(master_secret: &str) -> Self {
        // Derive JWT secret from master secret
        let mut hasher = Sha256::new();
        hasher.update(master_secret.as_bytes());
        hasher.update(b"jwt_secret");
        let jwt_secret = hasher.finalize().to_vec();

        // Derive encryption key from master secret
        let mut hasher = Sha256::new();
        hasher.update(master_secret.as_bytes());
        hasher.update(b"encryption_key");
        let encryption_key_bytes = hasher.finalize();
        let encryption_key = Key::<Aes256Gcm>::from_slice(&encryption_key_bytes);

        Self {
            jwt_secret,
            encryption_key: *encryption_key,
        }
    }

    /// Generate a secure token for email validation
    /// The token expires in 24 hours by default
    pub fn generate_token(
        &self,
        wallet_address: &str,
        email: &str,
        username: &str,
        expires_in_hours: Option<i64>,
    ) -> Result<String, TokenError> {
        let now = Utc::now();
        let exp = now + Duration::hours(expires_in_hours.unwrap_or(24));

        let claims = EmailValidationClaims {
            wallet_address: wallet_address.to_string(),
            email: email.to_string(),
            username: username.to_string(),
            exp: exp.timestamp(),
            iat: now.timestamp(),
        };

        // Create JWT
        let header = Header::new(Algorithm::HS256);
        let jwt = encode(&header, &claims, &EncodingKey::from_secret(&self.jwt_secret))?;

        // Encrypt the JWT
        let cipher = Aes256Gcm::new(&self.encryption_key);
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = cipher
            .encrypt(&nonce, jwt.as_bytes())
            .map_err(|e| TokenError::EncryptionError(e.to_string()))?;

        // Combine nonce + ciphertext and encode as base64
        let mut encrypted_data = nonce.to_vec();
        encrypted_data.extend_from_slice(&ciphertext);
        
        Ok(general_purpose::URL_SAFE_NO_PAD.encode(encrypted_data))
    }

    /// Validate and decrypt a token
    pub fn validate_token(&self, token: &str) -> Result<EmailValidationClaims, TokenError> {
        // Decode from base64
        let encrypted_data = general_purpose::URL_SAFE_NO_PAD.decode(token)?;
        
        if encrypted_data.len() < 12 {
            return Err(TokenError::DecryptionError("Invalid token format".to_string()));
        }

        // Extract nonce and ciphertext
        let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt
        let cipher = Aes256Gcm::new(&self.encryption_key);
        let jwt_bytes = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| TokenError::DecryptionError(e.to_string()))?;

        let jwt = String::from_utf8(jwt_bytes)
            .map_err(|e| TokenError::DecryptionError(e.to_string()))?;

        // Decode JWT
        let validation = Validation::new(Algorithm::HS256);
        let token_data = decode::<EmailValidationClaims>(
            &jwt,
            &DecodingKey::from_secret(&self.jwt_secret),
            &validation,
        )?;

        let claims: EmailValidationClaims = token_data.claims;

        if claims.exp < Utc::now().timestamp() {
            return Err(TokenError::TokenExpired);
        }

        Ok(claims)
    }

}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_generation_and_validation() {
        let manager = EmailTokenManager::new("super_secret_key_that_should_be_stored_securely");
        
        let wallet_address = "SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ";
        let email = "fulano@gmail.com";
        let username = "fulano";

        // Generate token
        let token = manager
            .generate_token(wallet_address, email, username, Some(1))
            .expect("Failed to generate token");

        println!("Generated token: {}", token);

        // Validate token
        let claims = manager
            .validate_token(&token)
            .expect("Failed to validate token");

        println!("Claims: {:?}", claims);

        assert_eq!(claims.wallet_address, wallet_address);
        assert_eq!(claims.email, email);
        assert_eq!(claims.username, username);
    }

    #[test]
    fn test_expired_token() {
        let manager = EmailTokenManager::new("super_secret_key_that_should_be_stored_securely");
        
        // Generate token that expires immediately
        let token = manager
            .generate_token("wallet", "email@test.com", "user", Some(0))
            .expect("Failed to generate token");

        // Wait a bit to ensure expiration
        std::thread::sleep(std::time::Duration::from_millis(1000));

        // Should fail validation
        let result = manager.validate_token(&token);
        assert!(matches!(result, Err(TokenError::TokenExpired)));
    }
}
