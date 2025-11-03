use async_trait::async_trait;
use mongodb::bson::oid::ObjectId;
use crate::features::payment_requests::domain::entities::{PaymentRequest, PaymentRequestId, PaymentStatus, SourceType};

#[derive(Debug)]
pub enum PaymentRequestError {
    Internal(String),
    NotFound,
}

impl std::fmt::Display for PaymentRequestError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PaymentRequestError::Internal(msg) => write!(f, "Internal error: {}", msg),
            PaymentRequestError::NotFound => write!(f, "Payment request not found"),
        }
    }
}

impl std::error::Error for PaymentRequestError {}

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait PaymentRequestRepository: Send + Sync {
    async fn save(&self, payment_request: &PaymentRequest) -> Result<(), PaymentRequestError>;
    async fn find_by_id(&self, id: &PaymentRequestId) -> Result<Option<PaymentRequest>, PaymentRequestError>;
    async fn find_by_status(&self, status: &PaymentStatus) -> Result<Vec<PaymentRequest>, PaymentRequestError>;
    async fn list(
        &self,
        page: u64,
        limit: u64,
        status_filter: Option<Vec<PaymentStatus>>,
        sort_order: &str,
    ) -> Result<Vec<PaymentRequest>, PaymentRequestError>;
    async fn count(
        &self,
        status_filter: Option<Vec<PaymentStatus>>,
    ) -> Result<u64, PaymentRequestError>;
    async fn update_status_atomic(
        &self,
        id: &PaymentRequestId,
        allowed_statuses: Vec<PaymentStatus>,
        new_status: PaymentStatus,
    ) -> Result<Option<PaymentRequest>, PaymentRequestError>;
    async fn find_by_source(
        &self,
        source_type: &SourceType,
        source_id: &ObjectId,
    ) -> Result<Vec<PaymentRequest>, PaymentRequestError>;
}
