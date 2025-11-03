use serde::{Deserialize, Serialize};
use crate::events::domain_event::DomainEvent;
use super::entities::PaymentRequestId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRequestCreatedEvent {
    pub payment_request_id: String,
    pub source_type: String,
    pub source_id: String,
    pub receiver_address: String,
    pub amount: u64,
    pub description: String,
    pub status: String,
}

impl DomainEvent for PaymentRequestCreatedEvent {
    fn event_type() -> &'static str {
        "PaymentRequestCreated"
    }
    
    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "payment_request".to_string(),
            self.payment_request_id.clone()
        ))
    }
}
