use std::sync::Arc;

use axum::async_trait;

use crate::{
    config::Config,
    features::advertisements::{
        domain::events::AdvertisementCreateEvent,
        ports::repositories::AdvertisementRepository,
    },
    handlers::{EventHandler, EventHandlerError},
};

pub struct AdvertisementCreateHandler {
    advertisement_repository: Arc<dyn AdvertisementRepository>,
    config: Arc<Config>,
}

impl AdvertisementCreateHandler {
    pub fn new(
        advertisement_repository: Arc<dyn AdvertisementRepository>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            advertisement_repository,
            config,
        }
    }
}

#[async_trait]
impl EventHandler for AdvertisementCreateHandler {

    async fn handle(
        &self,
        event: &crate::events::store::StoredEvent,
    ) -> Result<(), EventHandlerError> {

        let advertisement_create_event: AdvertisementCreateEvent =
            serde_json::from_value(event.event_data.clone())?;

        // NOTE: This handler is now a no-op. The deposit broadcasting logic
        // has been moved to the AdvertisementDeposit feature.
        // When an advertisement is created with an initial deposit,
        // an AdvertisementDepositCreatedEvent should be published and handled
        // by the AdvertisementDepositCreatedHandler which will:
        // 1. Broadcast the transaction
        // 2. Update the deposit status to Pending
        // 3. Later confirm the deposit and add funds to the advertisement

        tracing::debug!("Advertisement created: {}", advertisement_create_event.id);

        Ok(())
    }

    fn can_handle(&self, event_type: &str) -> bool {
        event_type == "AdvertisementCreateEvent"
    }

    fn name(&self) -> &'static str {
        "AdvertisementCreateEvent"
    }
}
