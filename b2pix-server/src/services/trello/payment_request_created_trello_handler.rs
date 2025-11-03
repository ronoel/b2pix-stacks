use async_trait::async_trait;
use serde::Deserialize;

use crate::events::{
    handlers::{EventHandler, EventHandlerError},
};
use crate::services::trello::trello_card_service::{TrelloCardService, TrelloConfig};

#[derive(Clone)]
pub struct PaymentRequestCreatedTrelloHandler {
    trello_service: TrelloCardService,
}

impl PaymentRequestCreatedTrelloHandler {
    pub fn new(config: TrelloConfig) -> Self {
        Self {
            trello_service: TrelloCardService::new(config),
        }
    }
}

#[async_trait]
impl EventHandler for PaymentRequestCreatedTrelloHandler {
    fn can_handle(&self, event_type: &str) -> bool {
        event_type == "PaymentRequestCreated"
    }

    async fn handle(&self, event: &crate::events::store::StoredEvent) -> Result<(), EventHandlerError> {
        #[derive(Deserialize)]
        struct PaymentRequestCreatedEvent {
            payment_request_id: String,
            source_type: String,
            source_id: String,
            receiver_address: String,
            amount: u64,
            description: String,
            status: String,
        }

        let payment_event: PaymentRequestCreatedEvent = serde_json::from_value(event.event_data.clone())?;

        let card_title = format!(
            "B2PIX - Payment Request {} ({} {})",
            payment_event.payment_request_id,
            payment_event.source_type,
            payment_event.source_id
        );

        let card_description = format!(
            "Payment Request ID: {}\nSource Type: {}\nSource ID: {}\nReceiver Address: {}\nAmount: {} sats\nStatus: {}\n\nDescription:\n{}",
            payment_event.payment_request_id,
            payment_event.source_type,
            payment_event.source_id,
            payment_event.receiver_address,
            payment_event.amount,
            payment_event.status,
            payment_event.description
        );

        self.trello_service
            .create_card(card_title.clone(), card_description.clone())
            .await
            .map_err(|e| {
                tracing::error!(
                    event_id = %event.id,
                    payment_request_id = %payment_event.payment_request_id,
                    error = %e,
                    "Failed to create Trello card for payment request"
                );
                EventHandlerError::ExternalService(e.to_string())
            })?;

        Ok(())
    }

    fn name(&self) -> &'static str {
        "PaymentRequestCreatedTrelloHandler"
    }
}
