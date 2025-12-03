use thiserror::Error;

#[derive(Error, Debug)]
pub enum InviteError {
    #[error("Invalid address")]
    InvalidAddress,
    
    #[error("Invalid public key")]
    InvalidPublicKey,
    
    #[error("Address does not match public key")]
    AddressPublicKeyMismatch,
    
    #[error("Invalid signature")]
    InvalidSignature,
    
    #[error("Invalid credentials: {0}")]
    InvalidCredentials(String),
    
    #[error("Invalid username: {0}")]
    InvalidUsername(String),
    
    #[error("Invalid email: {0}")]
    InvalidEmail(String),
    
    #[error("Invalid action")]
    InvalidAction,
    
    #[error("Invalid domain")]
    InvalidDomain,
    
    #[error("Invalid timestamp")]
    InvalidTimestamp,
    
    #[error("Duplicate invite")]
    DuplicateInvite,
    
    #[error("Username already taken")]
    DuplicateUsername,
    
    #[error("Email already taken")]
    DuplicateEmail,
    
    #[error("Invite not found")]
    NoContent,
    
    #[error("Invalid status transition")]
    InvalidStatusTransition,
    
    #[error("Repository error: {0}")]
    Repository(String),
    
    #[error("Database error: {0}")]
    Database(#[from] mongodb::error::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] mongodb::bson::ser::Error),
    
    #[error("Deserialization error: {0}")]
    Deserialization(#[from] mongodb::bson::de::Error),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<anyhow::Error> for InviteError {
    fn from(err: anyhow::Error) -> Self {
        InviteError::Internal(err.to_string())
    }
}

#[derive(Error, Debug)]
pub enum AdvertisementError {
    #[error("Invalid address")]
    InvalidAddress,
    
    #[error("Invalid token: {0}")]
    InvalidToken(String),
    
    #[error("Invalid currency: {0}")]
    InvalidCurrency(String),
    
    #[error("Invalid price: must be positive")]
    InvalidPrice,
    
    #[error("Invalid amount: must be positive")]
    InvalidAmount,
    
    #[error("Invalid min amount: must be positive")]
    InvalidMinAmount,
    
    #[error("Invalid max amount: must be positive")]
    InvalidMaxAmount,
    
    #[error("Invalid amount range: max amount must be greater than or equal to min amount")]
    InvalidAmountRange,

    #[error("Invalid percentage offset: must be between -100% and +1000%")]
    InvalidPercentageOffset,

    #[error("Market price required for dynamic pricing")]
    MarketPriceRequired,

    #[error("Insufficient funds")]
    InsufficientFunds,

    #[error("Advertisement not found")]
    NotFound,

    #[error("Invalid status transition")]
    InvalidStatusTransition,
    
    #[error("Advertisement is not available")]
    NotAvailable,
    
    #[error("Repository error: {0}")]
    Repository(String),
    
    #[error("Database error: {0}")]
    Database(#[from] mongodb::error::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] mongodb::bson::ser::Error),
    
    #[error("Deserialization error: {0}")]
    Deserialization(#[from] mongodb::bson::de::Error),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<anyhow::Error> for AdvertisementError {
    fn from(err: anyhow::Error) -> Self {
        AdvertisementError::Internal(err.to_string())
    }
}

#[derive(Error, Debug)]
pub enum AdvertisementDepositError {
    #[error("Invalid advertisement reference")]
    InvalidAdvertisementId,

    #[error("Advertisement not found")]
    AdvertisementNotFound,

    #[error("Invalid amount: must be positive")]
    InvalidAmount,

    #[error("Invalid transaction")]
    InvalidTransaction,

    #[error("Deposit not found")]
    NotFound,

    #[error("Invalid status transition")]
    InvalidStatusTransition,

    #[error("Repository error: {0}")]
    Repository(String),

    #[error("Database error: {0}")]
    Database(#[from] mongodb::error::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] mongodb::bson::ser::Error),

    #[error("Deserialization error: {0}")]
    Deserialization(#[from] mongodb::bson::de::Error),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<anyhow::Error> for AdvertisementDepositError {
    fn from(err: anyhow::Error) -> Self {
        AdvertisementDepositError::Internal(err.to_string())
    }
}

#[derive(Error, Debug)]
pub enum SaleError {
    #[error("Invalid advertisement reference")]
    InvalidAdvertisementId,
    
    #[error("Advertisement not found")]
    AdvertisementNotFound,
    
    #[error("Advertisement not available")]
    AdvertisementNotAvailable,
    
    #[error("Invalid address")]
    InvalidAddress,
    
    #[error("Invalid token: {0}")]
    InvalidToken(String),
    
    #[error("Invalid currency: {0}")]
    InvalidCurrency(String),
    
    #[error("Invalid amount: must be positive")]
    InvalidAmount,
    
    #[error("Amount exceeds available funds")]
    AmountExceedsAvailable,
    
    #[error("Invalid price: must be positive")]
    InvalidPrice,
    
    #[error("Invalid fee: must be non-negative")]
    InvalidFee,
    
    #[error("Invalid PIX key: {0}")]
    InvalidPixKey(String),
    
    #[error("Sale not found")]
    NotFound,
    
    #[error("Sale has expired")]
    Expired,
    
    #[error("Invalid status transition")]
    InvalidStatusTransition,
    
    #[error("Repository error: {0}")]
    Repository(String),
    
    #[error("Database error: {0}")]
    Database(#[from] mongodb::error::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] mongodb::bson::ser::Error),
    
    #[error("Deserialization error: {0}")]
    Deserialization(#[from] mongodb::bson::de::Error),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

#[derive(Error, Debug)]
pub enum BuyError {
    #[error("Invalid advertisement reference")]
    InvalidAdvertisementId,
    
    #[error("Advertisement not found")]
    AdvertisementNotFound,
    
    #[error("Advertisement not available")]
    AdvertisementNotAvailable,
    
    #[error("Invalid address")]
    InvalidAddress,
    
    #[error("Invalid token: {0}")]
    InvalidToken(String),
    
    #[error("Invalid currency: {0}")]
    InvalidCurrency(String),
    
    #[error("Invalid amount: must be positive")]
    InvalidAmount,
    
    #[error("Amount exceeds available funds")]
    AmountExceedsAvailable,
    
    #[error("Invalid price: must be positive")]
    InvalidPrice,

    #[error("Price mismatch: expected {expected}, got {provided}")]
    PriceMismatch { expected: u128, provided: u128 },

    #[error("Price below minimum: quoted {quoted}, minimum allowed {minimum} (current market: {current_market})")]
    PriceBelowMinimum {
        quoted: u128,
        minimum: u128,
        current_market: u128,
    },

    #[error("Quote service unavailable: {0}")]
    QuoteServiceUnavailable(String),

    #[error("Invalid fee: must be non-negative")]
    InvalidFee,

    #[error("Invalid PIX key: {0}")]
    InvalidPixKey(String),

    #[error("Buy not found")]
    NotFound,
    
    #[error("Buy has expired")]
    Expired,
    
    #[error("Invalid status transition")]
    InvalidStatusTransition,
    
    #[error("Repository error: {0}")]
    Repository(String),
    
    #[error("Database error: {0}")]
    Database(#[from] mongodb::error::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] mongodb::bson::ser::Error),
    
    #[error("Deserialization error: {0}")]
    Deserialization(#[from] mongodb::bson::de::Error),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<anyhow::Error> for SaleError {
    fn from(err: anyhow::Error) -> Self {
        SaleError::Internal(err.to_string())
    }
}

impl From<anyhow::Error> for BuyError {
    fn from(err: anyhow::Error) -> Self {
        BuyError::Internal(err.to_string())
    }
}

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Bad request: {0}")]
    BadRequest(String),
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Forbidden")]
    Forbidden,
    
    #[error("Not found")]
    NotFound,
    
    #[error("Conflict: {0}")]
    Conflict(String),
    
    #[error("Internal server error: {0}")]
    InternalServerError(String),
    
    #[error("Service unavailable")]
    ServiceUnavailable,

    #[error("No content")]
    NoContent,
}

impl From<InviteError> for ApiError {
    fn from(err: InviteError) -> Self {
        match err {
            InviteError::InvalidAddress 
            | InviteError::InvalidPublicKey 
            | InviteError::AddressPublicKeyMismatch 
            | InviteError::InvalidUsername(_) 
            | InviteError::InvalidEmail(_)
            | InviteError::InvalidAction 
            | InviteError::InvalidDomain 
            | InviteError::InvalidTimestamp 
            | InviteError::InvalidCredentials(_) => ApiError::BadRequest(err.to_string()),
            
            InviteError::InvalidSignature => ApiError::Unauthorized,
            
            InviteError::NoContent => ApiError::NoContent,
            
            InviteError::DuplicateInvite => ApiError::Conflict(err.to_string()),
            
            InviteError::DuplicateUsername => ApiError::Conflict(err.to_string()),
            
            InviteError::DuplicateEmail => ApiError::Conflict(err.to_string()),
            
            InviteError::InvalidStatusTransition => ApiError::BadRequest(err.to_string()),
            
            InviteError::Repository(_) 
            | InviteError::Database(_) 
            | InviteError::Serialization(_) 
            | InviteError::Deserialization(_) 
            | InviteError::Internal(_) => ApiError::InternalServerError(err.to_string()),
        }
    }
}

impl axum::response::IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message, has_body) = match self {
            ApiError::BadRequest(msg) => (axum::http::StatusCode::BAD_REQUEST, msg, true),
            ApiError::Unauthorized => (axum::http::StatusCode::UNAUTHORIZED, "Unauthorized".to_string(), true),
            ApiError::Forbidden => (axum::http::StatusCode::FORBIDDEN, "Forbidden".to_string(), true),
            ApiError::NotFound => (axum::http::StatusCode::NOT_FOUND, "Not found".to_string(), true),
            ApiError::Conflict(msg) => (axum::http::StatusCode::CONFLICT, msg, true),
            ApiError::InternalServerError(msg) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, msg, true),
            ApiError::ServiceUnavailable => (axum::http::StatusCode::SERVICE_UNAVAILABLE, "Service unavailable".to_string(), true),
            ApiError::NoContent => (axum::http::StatusCode::NO_CONTENT, String::new(), false),
        };

        if has_body {
            (status, axum::Json(serde_json::json!({
                "error": message
            }))).into_response()
        } else {
            status.into_response()
        }
    }
}
