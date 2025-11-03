use async_trait::async_trait;
use serde::Serialize;
use std::sync::Arc;
use chrono::Utc;

use crate::events::typed_handler::{TypedEventHandler, GenericEventHandler};
use crate::events::handlers::{EventHandler, EventHandlerError};
use crate::features::payment_requests::domain::events::PaymentRequestCreatedEvent;
use crate::services::email::{Recipient, TemplateId, EmailService};
use crate::features::buys::ports::repositories::BuyRepository;
use crate::features::buys::domain::entities::BuyId;
use crate::features::invites::ports::InviteRepository;
use crate::features::shared::value_objects::StacksAddress;

pub struct PaymentBuyerSuccessEmailHandler {
    email_service: Arc<EmailService>,
    buy_repository: Arc<dyn BuyRepository>,
    invite_repository: Arc<dyn InviteRepository>,
}

impl PaymentBuyerSuccessEmailHandler {
    pub fn new(
        email_service: Arc<EmailService>,
        buy_repository: Arc<dyn BuyRepository>,
        invite_repository: Arc<dyn InviteRepository>,
    ) -> Self {
        Self {
            email_service,
            buy_repository,
            invite_repository,
        }
    }

    pub fn into_event_handler(self) -> Arc<dyn EventHandler> {
        Arc::new(GenericEventHandler::new(self))
    }
}

#[async_trait]
impl TypedEventHandler<PaymentRequestCreatedEvent> for PaymentBuyerSuccessEmailHandler {
    async fn handle_typed(&self, event: &PaymentRequestCreatedEvent) -> Result<(), EventHandlerError> {
        // Only send email for buy source type
        if event.source_type != "buy" {
            return Ok(());
        }

        // Parse source_id as ObjectId and fetch the buy
        let buy_object_id = mongodb::bson::oid::ObjectId::parse_str(&event.source_id)
            .map_err(|e| EventHandlerError::Handler(format!("Invalid buy ID: {}", e)))?;

        let buy = self.buy_repository
            .find_by_id(&BuyId::from_object_id(buy_object_id))
            .await
            .map_err(|e| EventHandlerError::ExternalService(format!("Failed to fetch buy: {}", e)))?
            .ok_or_else(|| EventHandlerError::Handler(format!("Buy not found: {}", event.source_id)))?;

        // Format date and time
        let date_str = Utc::now().format("%d/%m/%Y %H:%M").to_string();

        // Convert amounts
        // BRL value is in cents, convert to reais with 2 decimal places
        let brl_value = format!("{:.2}", buy.pay_value as f64 / 100.0);

        // BTC amount is in satoshis, convert to BTC with 8 decimal places
        let btc_received = format!("{:.8}", buy.amount as f64 / 100_000_000.0);

        // Get buyer's email from Invite using the receiver_address (wallet address)
        let address = StacksAddress::from_string(event.receiver_address.clone());

        let invite = self.invite_repository
            .find_by_address(&address)
            .await
            .map_err(|e| EventHandlerError::ExternalService(format!("Failed to fetch invite: {}", e)))?
            .ok_or_else(|| EventHandlerError::Handler(format!("Invite not found for address: {}", event.receiver_address)))?;

        #[derive(Serialize)]
        struct BuySuccessParams {
            #[serde(rename = "DATE")]
            date: String,
            #[serde(rename = "BRL_VALUE")]
            brl_value: String,
            #[serde(rename = "BTC_RECEIVED")]
            btc_received: String,
            #[serde(rename = "BUY_ID_SHORT")]
            buy_id_short: String,
            #[serde(rename = "RECIPIENT_EMAIL")]
            recipient_email: String,
        }

        // Helper function to shorten Buy ID
        let shorten_buy_id = |buy_id: &str| -> String {
            if buy_id.len() <= 8 {
                return buy_id.to_string();
            }
            buy_id[..8].to_string()
        };

        let params = BuySuccessParams {
            date: date_str,
            brl_value,
            btc_received,
            buy_id_short: shorten_buy_id(&buy.id.to_string()),
            recipient_email: invite.email().to_string(),
        };

        let recipient = Recipient {
            email: invite.email().to_string(),
            name: None,
        };

        self.email_service
            .send_transactional_email(
                TemplateId::PaymentBuyerSuccess,
                &params,
                &[recipient],
            )
            .await
            .map_err(|e| {
                tracing::error!(
                    buy_id = %buy.id,
                    error = %e,
                    "Failed to send buy success email"
                );
                EventHandlerError::ExternalService(e.to_string())
            })?;

        Ok(())
    }
    
    fn handler_name(&self) -> &'static str {
        "PaymentBuyerSuccessEmailHandler"
    }
}
