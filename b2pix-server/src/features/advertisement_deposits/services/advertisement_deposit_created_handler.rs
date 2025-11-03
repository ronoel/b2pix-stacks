use std::sync::Arc;

use axum::async_trait;

use crate::{
    config::Config,
    features::{
        advertisement_deposits::{
            domain::{entities::AdvertisementDepositStatus, events::AdvertisementDepositCreatedEvent},
            ports::repositories::AdvertisementDepositRepository,
        },
        advertisements::{
            domain::entities::AdvertisementStatus,
            ports::repositories::AdvertisementRepository,
        },
    },
    handlers::{EventHandler, EventHandlerError},
    services::bolt_transaction_b2pix::broadcast_transaction,
};

pub struct AdvertisementDepositCreatedHandler {
    deposit_repository: Arc<dyn AdvertisementDepositRepository>,
    advertisement_repository: Arc<dyn AdvertisementRepository>,
    config: Arc<Config>,
}

impl AdvertisementDepositCreatedHandler {
    pub fn new(
        deposit_repository: Arc<dyn AdvertisementDepositRepository>,
        advertisement_repository: Arc<dyn AdvertisementRepository>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            deposit_repository,
            advertisement_repository,
            config,
        }
    }
}

#[async_trait]
impl EventHandler for AdvertisementDepositCreatedHandler {
    async fn handle(
        &self,
        event: &crate::events::store::StoredEvent,
    ) -> Result<(), EventHandlerError> {
        let deposit_created_event: AdvertisementDepositCreatedEvent =
            serde_json::from_value(event.event_data.clone())?;

        // Find the deposit by ID
        let mut deposit = self
            .deposit_repository
            .find_by_id(&deposit_created_event.deposit_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find deposit: {}", e);
                EventHandlerError::Handler(format!("Failed to find deposit: {}", e))
            })?
            .ok_or_else(|| {
                tracing::error!(
                    "Deposit not found with ID: {}",
                    deposit_created_event.deposit_id
                );
                EventHandlerError::Handler(format!(
                    "Deposit not found with ID: {}",
                    deposit_created_event.deposit_id
                ))
            })?;

        // Check if the deposit is in Draft status
        if deposit.status != AdvertisementDepositStatus::Draft {
            tracing::error!(
                "Deposit {} is not in draft status. Current status: {:?}",
                deposit_created_event.deposit_id,
                deposit.status
            );
            return Err(EventHandlerError::Handler(
                "Deposit is not in draft status".into(),
            ));
        }

        // Broadcast the transaction
        let broadcast_response = match broadcast_transaction(
            deposit.serialized_transaction.clone(),
            Arc::clone(&self.config),
        )
        .await
        {
            Ok(response) => response,
            Err(e) => {
                tracing::error!("Failed to broadcast transaction for deposit {}: {}", deposit.id, e);

                // Mark deposit as Failed
                if let Err(status_err) = deposit.fail() {
                    tracing::error!(
                        "Failed to change deposit status to Failed: {}",
                        status_err
                    );
                }

                // Save the failed deposit
                if let Err(save_err) = self.deposit_repository.save(&deposit).await {
                    tracing::error!(
                        "Failed to save deposit with Failed status: {}",
                        save_err
                    );
                }

                // Also unlock the advertisement if it was locked (for recharge deposits)
                if let Err(unlock_err) = self.unlock_advertisement_if_needed(&deposit_created_event.advertisement_id).await {
                    tracing::error!("Failed to unlock advertisement: {}", unlock_err);
                }

                // Don't return error - we handled it by marking deposit as failed
                return Ok(());
            }
        };

        // Update deposit with transaction ID and change status to Pending
        deposit.pending(broadcast_response.txid).map_err(|e| {
            tracing::error!("Failed to update deposit to pending: {}", e);
            EventHandlerError::Handler(format!("Failed to update deposit to pending: {}", e))
        })?;

        // Save the pending deposit
        self.deposit_repository
            .save(&deposit)
            .await
            .map_err(|e| {
                tracing::error!("Failed to save deposit: {}", e);
                EventHandlerError::Handler(format!("Failed to save deposit: {}", e))
            })?;

        tracing::info!(
            "Successfully broadcasted transaction for deposit {}. Tx ID: {:?}",
            deposit.id,
            deposit.transaction_id
        );

        Ok(())
    }

    fn can_handle(&self, event_type: &str) -> bool {
        event_type == "AdvertisementDepositCreated"
    }

    fn name(&self) -> &'static str {
        "AdvertisementDepositCreatedHandler"
    }
}

impl AdvertisementDepositCreatedHandler {
    /// Helper method to unlock advertisement if it's in ProcessingDeposit status
    async fn unlock_advertisement_if_needed(
        &self,
        advertisement_id: &crate::features::advertisements::domain::entities::AdvertisementId,
    ) -> Result<(), String> {
        let mut advertisement = self
            .advertisement_repository
            .find_by_id(advertisement_id)
            .await
            .map_err(|e| format!("Failed to find advertisement: {}", e))?
            .ok_or_else(|| format!("Advertisement not found: {}", advertisement_id))?;

        // Only unlock if it's in ProcessingDeposit status
        if advertisement.status == AdvertisementStatus::ProcessingDeposit {
            advertisement
                .change_status(AdvertisementStatus::Ready)
                .map_err(|e| format!("Failed to change status: {}", e))?;

            self.advertisement_repository
                .save(&advertisement)
                .await
                .map_err(|e| format!("Failed to save advertisement: {}", e))?;

            tracing::info!("Unlocked advertisement {} after deposit failure", advertisement_id);
        }

        Ok(())
    }
}
