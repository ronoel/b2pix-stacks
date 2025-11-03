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
use crate::features::advertisements::ports::repositories::AdvertisementRepository;
use crate::features::invites::ports::InviteRepository;
use crate::features::shared::value_objects::StacksAddress;

pub struct PaymentSellerSuccessEmailHandler {
    email_service: Arc<EmailService>,
    buy_repository: Arc<dyn BuyRepository>,
    advertisement_repository: Arc<dyn AdvertisementRepository>,
    invite_repository: Arc<dyn InviteRepository>,
}

impl PaymentSellerSuccessEmailHandler {
    pub fn new(
        email_service: Arc<EmailService>,
        buy_repository: Arc<dyn BuyRepository>,
        advertisement_repository: Arc<dyn AdvertisementRepository>,
        invite_repository: Arc<dyn InviteRepository>,
    ) -> Self {
        Self {
            email_service,
            buy_repository,
            advertisement_repository,
            invite_repository,
        }
    }

    pub fn into_event_handler(self) -> Arc<dyn EventHandler> {
        Arc::new(GenericEventHandler::new(self))
    }
}

#[async_trait]
impl TypedEventHandler<PaymentRequestCreatedEvent> for PaymentSellerSuccessEmailHandler {
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

        // Get the advertisement to find the seller's address
        let advertisement = self.advertisement_repository
            .find_by_id(&buy.advertisement_id)
            .await
            .map_err(|e| EventHandlerError::ExternalService(format!("Failed to fetch advertisement: {}", e)))?
            .ok_or_else(|| EventHandlerError::Handler(format!("Advertisement not found: {}", buy.advertisement_id)))?;

        // Format date and time
        let date_str = Utc::now().format("%d/%m/%Y %H:%M").to_string();

        // Convert amounts
        // BRL value is in cents, convert to reais with 2 decimal places
        let brl_value = format!("{:.2}", buy.pay_value as f64 / 100.0);

        // BTC amount is in satoshis, convert to BTC with 8 decimal places
        let btc_sold = format!("{:.8}", buy.amount as f64 / 100_000_000.0);

        // Get seller's email from Invite using the advertisement's seller_address
        let seller_address = StacksAddress::from_string(advertisement.seller_address);

        let invite = self.invite_repository
            .find_by_address(&seller_address)
            .await
            .map_err(|e| EventHandlerError::ExternalService(format!("Failed to fetch seller invite: {}", e)))?
            .ok_or_else(|| EventHandlerError::Handler(format!("Seller invite not found for address: {}", seller_address)))?;

        #[derive(Serialize)]
        struct SellSuccessParams {
            #[serde(rename = "DATE")]
            date: String,
            #[serde(rename = "BRL_VALUE")]
            brl_value: String,
            #[serde(rename = "BTC_SOLD")]
            btc_sold: String,
            #[serde(rename = "PIX_KEY_MASKED")]
            pix_key_masked: String,
            #[serde(rename = "BUY_ID_SHORT")]
            buy_id_short: String,
            #[serde(rename = "RECIPIENT_EMAIL")]
            recipient_email: String,
        }

        // Helper function to mask PIX key
        let mask_pix_key = |pix_key: &str| -> String {
            if pix_key.len() <= 4 {
                return pix_key.to_string();
            }
            format!("****{}", &pix_key[pix_key.len()-4..])
        };

        // Helper function to shorten Buy ID
        let shorten_buy_id = |buy_id: &str| -> String {
            if buy_id.len() <= 8 {
                return buy_id.to_string();
            }
            buy_id[..8].to_string()
        };

        let params = SellSuccessParams {
            date: date_str,
            brl_value,
            btc_sold,
            pix_key_masked: mask_pix_key(buy.pix_key.as_str()),
            buy_id_short: shorten_buy_id(&buy.id.to_string()),
            recipient_email: invite.email().to_string(),
        };

        let recipient = Recipient {
            email: invite.email().to_string(),
            name: None,
        };

        self.email_service
            .send_transactional_email(
                TemplateId::PaymentSellerSuccess,
                &params,
                &[recipient],
            )
            .await
            .map_err(|e| {
                tracing::error!(
                    buy_id = %buy.id,
                    seller_address = %seller_address,
                    error = %e,
                    "Failed to send sell success email"
                );
                EventHandlerError::ExternalService(e.to_string())
            })?;

        Ok(())
    }

    fn handler_name(&self) -> &'static str {
        "PaymentSellerSuccessEmailHandler"
    }
}
