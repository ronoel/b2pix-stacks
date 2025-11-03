use std::sync::Arc;
use tokio::time::Duration;
use tracing;
use crate::{
    common::periodic_task::PeriodicTaskHandler,
    features::{
        advertisements::domain::entities::AdvertisementStatus,
        buys::services::buy_service::BuyService,
        payment_requests::{domain::entities::SourceType, services::PaymentRequestService},
    },
};

/// Handler for periodically checking advertisements with "Finishing" status
/// and closing them when all buys are final
pub struct AdvertisementFinishingTaskHandler {
    advertisement_service: Arc<crate::features::advertisements::services::AdvertisementService>,
    buy_service: Arc<BuyService>,
    payment_request_service: Arc<PaymentRequestService>,
}

impl AdvertisementFinishingTaskHandler {
    pub fn new(
        advertisement_service: Arc<crate::features::advertisements::services::AdvertisementService>,
        buy_service: Arc<BuyService>,
        payment_request_service: Arc<PaymentRequestService>,
    ) -> Self {
        Self {
            advertisement_service,
            buy_service,
            payment_request_service,
        }
    }

    /// Processes all advertisements with "Finishing" status
    pub async fn process_finishing_advertisements(&self) -> anyhow::Result<()> {
        // tracing::info!("Starting processing of advertisements with Finishing status");

        // Find all advertisements with "Finishing" status
        let finishing_advertisements = match self.advertisement_service.get_advertisements_by_status(&AdvertisementStatus::Finishing).await {
            Ok(ads) => ads,
            Err(e) => {
                tracing::error!("Failed to find advertisements with Finishing status: {}", e);
                return Ok(());
            }
        };

        if finishing_advertisements.is_empty() {
            return Ok(());
        }

        // Process each finishing advertisement
        for advertisement in finishing_advertisements {
            self.process_single_advertisement(&advertisement).await;
        }
        
        Ok(())
    }

    /// Processes a single advertisement to check if it can be closed
    /// Returns true if the advertisement was processed (closed or skipped), false if there was an error
    async fn process_single_advertisement(&self, advertisement: &crate::features::advertisements::domain::entities::Advertisement) -> bool {
        
        // Get all buys for this advertisement
        let buys = match self.buy_service.get_buys_by_advertisement_id(advertisement.id.clone()).await {
            Ok(buys) => buys,
            Err(e) => {
                tracing::error!("Failed to get buys for advertisement {}: {}", advertisement.id, e);
                return false;
            }
        };

        // Check if the advertisement can be closed
        if self.has_non_final_buys(&buys) {
            return true; // Processed (skipped), but not an error
        }

        // All buys are final (or no buys exist), close the advertisement
        self.close_and_notify_advertisement(advertisement).await
    }

    /// Checks if any buy in the list has is_final: false
    fn has_non_final_buys(&self, buys: &[crate::features::buys::domain::entities::Buy]) -> bool {
        buys.iter().any(|buy| !buy.is_final)
    }

    /// Closes an advertisement and creates a Trello notification card
    /// Returns true if successful, false if there was an error
    async fn close_and_notify_advertisement(&self, advertisement: &crate::features::advertisements::domain::entities::Advertisement) -> bool {

        match self.advertisement_service.close_advertisement(advertisement.id.clone()).await {
            Ok(closed_advertisement) => {
                // tracing::info!("Successfully closed advertisement {}", closed_advertisement.id);

                // Create PaymentRequest for the closed advertisement using the service
                let description = format!(
                    "Payment for Advertisement ID: {}\nSeller Address: {}\nToken: {}\nCurrency: {}\nTotal Deposited: {}\nAvailable Amount: {}\nPrice: {}\nStatus: Closed\nClosed automatically after all buys were finalized",
                    closed_advertisement.id,
                    closed_advertisement.seller_address,
                    closed_advertisement.token,
                    closed_advertisement.currency,
                    closed_advertisement.total_deposited,
                    closed_advertisement.available_amount,
                    closed_advertisement.price
                );

                match self.payment_request_service.create_payment_request(
                    SourceType::Advertisement,
                    closed_advertisement.id.as_object_id().clone(),
                    closed_advertisement.seller_address.clone(),
                    closed_advertisement.available_amount as u64,
                    description,
                ).await {
                    Ok(_payment_request) => {
                        // tracing::info!("Created payment request {} for closed advertisement {}", payment_request.id().as_str(), closed_advertisement.id);
                    }
                    Err(e) => {
                        tracing::error!("Failed to create payment request for closed advertisement {}: {}", closed_advertisement.id, e);
                    }
                }

                true
            }
            Err(e) => {
                tracing::error!("Failed to close advertisement {}: {}", advertisement.id, e);
                false
            }
        }
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for AdvertisementFinishingTaskHandler {
    fn name(&self) -> &str {
        "Advertisement Finishing"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(60) // 1 minute interval
    }

    async fn execute(&self) -> anyhow::Result<()> {
        tracing::debug!("Running periodic advertisement finishing task");
        self.process_finishing_advertisements().await?;
        Ok(())
    }
}