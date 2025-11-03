use serde::{Deserialize, Serialize};

use crate::features::advertisements::domain::entities::AdvertisementId;
use crate::events::domain_event::DomainEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvertisementCreateEvent {
    pub id: AdvertisementId,
}

impl DomainEvent for AdvertisementCreateEvent {
    fn event_type() -> &'static str {
        "AdvertisementCreate"
    }
    
    fn aggregate_info(&self) -> Option<(String, String)> {
        Some((
            "advertisement".to_string(),
            self.id.to_string()
        ))
    }
}