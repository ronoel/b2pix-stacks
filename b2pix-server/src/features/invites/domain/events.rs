use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use super::entities::{InviteId, InviteCode};
use crate::features::shared::{StacksAddress, Username, Email};
use crate::events::domain_event::DomainEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteSentEvent {
    pub invite_id: InviteId,
    pub email: Email,
    pub code: InviteCode,
    pub parent_id: StacksAddress,
    pub sent_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteClaimedEvent {
    pub invite_id: InviteId,
    pub email: Email,
    pub username: Username,
    pub address: StacksAddress,
    pub claimed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteBlockedEvent {
    pub invite_id: InviteId,
    pub email: Email,
    pub blocked_at: DateTime<Utc>,
    pub blocked_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteCanceledEvent {
    pub invite_id: InviteId,
    pub email: Email,
    pub canceled_at: DateTime<Utc>,
    pub canceled_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankPemSetupEvent {
    pub invite_id: InviteId,
    pub pem_file_path: String,
    pub set_at: DateTime<Utc>,
    pub set_by: String,
}

// Implement DomainEvent trait for all events
impl DomainEvent for InviteSentEvent {
    fn event_type() -> &'static str {
        "InviteSent"
    }
    
    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "invite".to_string(),
            self.invite_id.to_string()
        ))
    }
}

impl DomainEvent for InviteClaimedEvent {
    fn event_type() -> &'static str {
        "InviteClaimed"
    }
    
    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "invite".to_string(),
            self.invite_id.to_string()
        ))
    }
}

impl DomainEvent for InviteBlockedEvent {
    fn event_type() -> &'static str {
        "InviteBlocked"
    }
    
    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "invite".to_string(),
            self.invite_id.to_string()
        ))
    }
}

impl DomainEvent for InviteCanceledEvent {
    fn event_type() -> &'static str {
        "InviteCanceled"
    }
    
    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "invite".to_string(),
            self.invite_id.to_string()
        ))
    }
}

impl DomainEvent for BankPemSetupEvent {
    fn event_type() -> &'static str {
        "BankPemSetup"
    }
    
    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "invite".to_string(),
            self.invite_id.to_string()
        ))
    }
}
