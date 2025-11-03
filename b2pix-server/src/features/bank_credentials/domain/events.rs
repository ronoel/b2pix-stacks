use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::features::bank_credentials::domain::entities::BankCredentialsId;
use crate::features::shared::StacksAddress;
use crate::events::domain_event::DomainEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankCredentialsCreatedEvent {
    pub credentials_id: BankCredentialsId,
    pub address: StacksAddress,
    pub certificate_gcs_path: String,
    pub created_at: DateTime<Utc>,
    pub created_by: StacksAddress,
}

impl DomainEvent for BankCredentialsCreatedEvent {
    fn event_type() -> &'static str where Self: Sized {
        "bank_credentials_created"
    }

    fn aggregate_info(&self) -> Option<(String, String)> {
        Some(("bank_credentials".to_string(), self.credentials_id.to_string()))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankCredentialsRevokedEvent {
    pub credentials_id: BankCredentialsId,
    pub address: StacksAddress,
    pub revoked_at: DateTime<Utc>,
    pub revoked_by: StacksAddress,
}

impl DomainEvent for BankCredentialsRevokedEvent {
    fn event_type() -> &'static str where Self: Sized {
        "bank_credentials_revoked"
    }

    fn aggregate_info(&self) -> Option<(String, String)> {
        Some(("bank_credentials".to_string(), self.credentials_id.to_string()))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankCredentialsStatusChangedEvent {
    pub credentials_id: BankCredentialsId,
    pub address: StacksAddress,
    pub old_status: String,
    pub new_status: String,
    pub changed_at: DateTime<Utc>,
}

impl DomainEvent for BankCredentialsStatusChangedEvent {
    fn event_type() -> &'static str where Self: Sized {
        "bank_credentials_status_changed"
    }

    fn aggregate_info(&self) -> Option<(String, String)> {
        Some(("bank_credentials".to_string(), self.credentials_id.to_string()))
    }
}
