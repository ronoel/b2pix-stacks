use serde::{Deserialize, Serialize};
use crate::events::domain_event::DomainEvent;
use super::entities::AdvertisementDepositId;
use crate::features::advertisements::domain::entities::AdvertisementId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvertisementDepositCreatedEvent {
    pub deposit_id: AdvertisementDepositId,
    pub advertisement_id: AdvertisementId,
}

impl DomainEvent for AdvertisementDepositCreatedEvent {
    fn event_type() -> &'static str {
        "AdvertisementDepositCreated"
    }

    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "advertisement_deposit".to_string(),
            self.deposit_id.to_string()
        ))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvertisementDepositConfirmedEvent {
    pub deposit_id: AdvertisementDepositId,
    pub advertisement_id: AdvertisementId,
    pub amount: u128,
}

impl DomainEvent for AdvertisementDepositConfirmedEvent {
    fn event_type() -> &'static str {
        "AdvertisementDepositConfirmed"
    }

    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "advertisement_deposit".to_string(),
            self.deposit_id.to_string()
        ))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvertisementDepositFailedEvent {
    pub deposit_id: AdvertisementDepositId,
    pub advertisement_id: AdvertisementId,
}

impl DomainEvent for AdvertisementDepositFailedEvent {
    fn event_type() -> &'static str {
        "AdvertisementDepositFailed"
    }

    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "advertisement_deposit".to_string(),
            self.deposit_id.to_string()
        ))
    }
}
