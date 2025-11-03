use serde::{Deserialize, Serialize};
use std::fmt;

/// A Stacks blockchain address
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StacksAddress(String);

impl StacksAddress {
    pub fn new(address: String) -> Result<Self, String> {
        if crate::infrastructure::blockchain::stacks::is_valid_stacks_address(&address) {
            Ok(Self(address))
        } else {
            Err(format!("Invalid Stacks address: {}", address))
        }
    }

    pub fn from_string(address: String) -> Self {
        Self(address)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

impl fmt::Display for StacksAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A secp256k1 public key
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicKey(String);

impl PublicKey {
    pub fn new(key: String) -> Result<Self, String> {
        if crate::infrastructure::blockchain::stacks::is_valid_public_key(&key) {
            Ok(Self(key))
        } else {
            Err(format!("Invalid public key: {}", key))
        }
    }

    pub fn from_string(key: String) -> Self {
        Self(key)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

impl fmt::Display for PublicKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A username for the system
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Username(String);

impl Username {
    pub fn new(username: String) -> Result<Self, String> {
        if username.len() < 3 || username.len() > 20 {
            return Err("Username must be between 3 and 20 characters".to_string());
        }
        Ok(Self(username))
    }

    pub fn from_string(username: String) -> Self {
        Self(username)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

impl fmt::Display for Username {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// An email address
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Email(String);

impl Email {
    pub fn new(email: String) -> Result<Self, String> {
        if Self::is_valid_email(&email) {
            Ok(Self(email))
        } else {
            Err(format!("Invalid email address: {}", email))
        }
    }

    pub fn from_string(email: String) -> Self {
        Self(email)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }

    fn is_valid_email(email: &str) -> bool {
        // Basic email validation - checks for @ symbol and basic format
        if email.is_empty() || !email.contains('@') {
            return false;
        }
        
        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 {
            return false;
        }
        
        let local_part = parts[0];
        let domain_part = parts[1];
        
        // Check local part is not empty and domain has at least one dot
        if local_part.is_empty() || domain_part.is_empty() || !domain_part.contains('.') {
            return false;
        }
        
        // Check for reasonable length limits
        if email.len() > 254 || local_part.len() > 64 || domain_part.len() > 253 {
            return false;
        }
        
        true
    }
}

impl fmt::Display for Email {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A cryptocurrency token symbol
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Token(String);

impl Token {
    pub fn new(token: String) -> Result<Self, String> {
        let token = token.to_uppercase();
        if Self::is_valid_token(&token) {
            Ok(Self(token))
        } else {
            Err(format!("Invalid token: {}", token))
        }
    }

    pub fn from_string(token: String) -> Self {
        Self(token.to_uppercase())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }

    fn is_valid_token(token: &str) -> bool {
        matches!(token, "BTC" | "ETH" | "USDT" | "USDC" | "STX")
    }
}

impl fmt::Display for Token {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A fiat currency code
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Currency(String);

impl Currency {
    pub fn new(currency: String) -> Result<Self, String> {
        let currency = currency.to_uppercase();
        if Self::is_valid_currency(&currency) {
            Ok(Self(currency))
        } else {
            Err(format!("Invalid currency: {}", currency))
        }
    }

    pub fn from_string(currency: String) -> Self {
        Self(currency.to_uppercase())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }

    fn is_valid_currency(currency: &str) -> bool {
        matches!(currency, "BRL" | "USD" | "EUR" | "ARS")
    }
}

impl fmt::Display for Currency {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A PIX key for payment
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PixKey(String);

impl PixKey {
    pub fn new(key: String) -> Result<Self, String> {
        if Self::is_valid_pix_key(&key) {
            Ok(Self(key))
        } else {
            Err(format!("Invalid PIX key: {}", key))
        }
    }

    pub fn from_string(key: String) -> Self {
        Self(key)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }

    fn is_valid_pix_key(key: &str) -> bool {
        if key.is_empty() || key.len() > 77 {
            return false;
        }
        
        // Basic validation - could be email, phone, CPF/CNPJ, or random key
        // For now, just check it's not empty and reasonable length
        !key.trim().is_empty()
    }
}

impl fmt::Display for PixKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A cryptocurrency or Bitcoin address
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct CryptoAddress(String);

impl CryptoAddress {
    pub fn new(address: String) -> Result<Self, String> {
        if Self::is_valid_crypto_address(&address) {
            Ok(Self(address))
        } else {
            Err(format!("Invalid crypto address: {}", address))
        }
    }

    pub fn from_string(address: String) -> Self {
        Self(address)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }

    fn is_valid_crypto_address(address: &str) -> bool {
        if address.is_empty() {
            return false;
        }
        
        // Basic validation for common address formats
        // Bitcoin: starts with 1, 3, or bc1
        // Ethereum: starts with 0x and 42 chars total
        // For now, just check reasonable length and format
        let len = address.len();
        
        if address.starts_with('1') || address.starts_with('3') {
            // Bitcoin P2PKH/P2SH: 26-35 characters
            len >= 26 && len <= 35
        } else if address.starts_with("bc1") {
            // Bitcoin Bech32: 42-62 characters
            len >= 42 && len <= 62
        } else if address.starts_with("0x") {
            // Ethereum: exactly 42 characters
            len == 42
        } else {
            // Other formats: reasonable length
            len >= 20 && len <= 100
        }
    }
}

impl fmt::Display for CryptoAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
