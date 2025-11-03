use serde::{Deserialize, Serialize};

/// Cross-feature events that can be published and consumed by different features
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DomainEvent {
    InviteRequested(InviteRequestedEvent),
    InviteApproved(InviteApprovedEvent),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteRequestedEvent {
    pub invite_id: String,
    pub address: String,
    pub username: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteApprovedEvent {
    pub invite_id: String,
    pub address: String,
    pub username: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}
