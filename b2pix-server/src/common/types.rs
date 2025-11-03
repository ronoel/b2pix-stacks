// Common types that might be used across the application
pub type Result<T> = std::result::Result<T, crate::common::errors::InviteError>;
pub type ApiResult<T> = std::result::Result<T, crate::common::errors::ApiError>;
