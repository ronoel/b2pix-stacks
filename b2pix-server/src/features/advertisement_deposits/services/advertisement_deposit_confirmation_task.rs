use std::sync::Arc;
use tokio::time::Duration;
use tracing;

use crate::{
    common::periodic_task::PeriodicTaskHandler,
    config::Config,
    events::publisher::EventPublisher,
    features::{
        advertisement_deposits::{
            domain::{entities::AdvertisementDepositStatus, events::AdvertisementDepositConfirmedEvent},
            ports::repositories::AdvertisementDepositRepository,
        },
        advertisements::{
            domain::entities::AdvertisementStatus,
            ports::repositories::AdvertisementRepository,
        },
    },
    infrastructure::blockchain::stacks::{TransactionStatus, TransactionVerifier},
};

/// Background task that periodically checks pending deposits and confirms them when on-chain
pub struct AdvertisementDepositConfirmationTaskHandler {
    deposit_repository: Arc<dyn AdvertisementDepositRepository>,
    advertisement_repository: Arc<dyn AdvertisementRepository>,
    event_publisher: Arc<EventPublisher>,
    transaction_verifier: Arc<TransactionVerifier>,
}

impl AdvertisementDepositConfirmationTaskHandler {
    pub fn new(
        deposit_repository: Arc<dyn AdvertisementDepositRepository>,
        advertisement_repository: Arc<dyn AdvertisementRepository>,
        event_publisher: Arc<EventPublisher>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            deposit_repository,
            advertisement_repository,
            event_publisher,
            transaction_verifier: Arc::new(TransactionVerifier::from_config(&config)),
        }
    }

    /// Process all pending deposits
    async fn process_pending_deposits(&self) -> anyhow::Result<()> {
        // Find all deposits with Pending status
        let pending_deposits = self
            .deposit_repository
            .find_by_status(&AdvertisementDepositStatus::Pending)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find pending deposits: {}", e);
                anyhow::anyhow!("Failed to find pending deposits: {}", e)
            })?;

        if pending_deposits.is_empty() {
            return Ok(());
        }

        tracing::debug!("Found {} pending deposits to verify", pending_deposits.len());

        // Process each pending deposit
        for mut deposit in pending_deposits {
            // Skip if no transaction_id (shouldn't happen in Pending status)
            let transaction_id = match &deposit.transaction_id {
                Some(tx_id) => tx_id.clone(),
                None => {
                    tracing::warn!("Deposit {} in Pending status has no transaction_id", deposit.id);
                    continue;
                }
            };

            // Verify transaction status
            match self
                .transaction_verifier
                .verify_transaction_status(&transaction_id)
                .await
            {
                Ok(response) if response.status == TransactionStatus::Success => {
                    // Transaction confirmed! Update deposit and advertisement
                    if let Err(e) = self.confirm_deposit(&mut deposit).await {
                        tracing::error!("Failed to confirm deposit {}: {}", deposit.id, e);
                    }
                }
                Ok(response) if response.status == TransactionStatus::Pending => {
                    // Still pending, do nothing
                    tracing::debug!("Deposit {} transaction {} still pending", deposit.id, transaction_id);
                }
                Ok(response) => {
                    // Transaction failed on-chain (abort or dropped)
                    tracing::error!("Deposit {} transaction {} failed on-chain with status: {:?}", deposit.id, transaction_id, response.status);
                    if let Err(e) = self.fail_deposit(&mut deposit).await {
                        tracing::error!("Failed to mark deposit {} as failed: {}", deposit.id, e);
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to verify transaction {} for deposit {}: {}", transaction_id, deposit.id, e);
                    // Don't fail the deposit yet - might be a temporary API error
                }
            }
        }

        Ok(())
    }

    /// Confirm a deposit by updating its status and adding funds to the advertisement
    async fn confirm_deposit(
        &self,
        deposit: &mut crate::features::advertisement_deposits::domain::entities::AdvertisementDeposit,
    ) -> Result<(), String> {
        // Update deposit status to Confirmed
        deposit
            .confirm()
            .map_err(|e| format!("Failed to confirm deposit: {}", e))?;

        // Save the confirmed deposit
        self.deposit_repository
            .save(deposit)
            .await
            .map_err(|e| format!("Failed to save confirmed deposit: {}", e))?;

        // // Fetch the advertisement to check its current status BEFORE adding amount
        // let advertisement_before = self
        //     .advertisement_repository
        //     .find_by_id(&deposit.advertisement_id)
        //     .await
        //     .map_err(|e| format!("Failed to find advertisement: {}", e))?
        //     .ok_or_else(|| format!("Advertisement not found: {}", deposit.advertisement_id))?;

        // let status_before = advertisement_before.status.clone();

        // Add the deposit amount to the advertisement
        let updated_advertisement = self
            .advertisement_repository
            .add_deposited_amount(&deposit.advertisement_id, &deposit.amount)
            .await
            .map_err(|e| format!("Failed to add deposited amount: {}", e))?
            .ok_or_else(|| format!("Advertisement not found: {}", deposit.advertisement_id))?;

        // tracing::info!(
        //     "Confirmed deposit {} with amount {} for advertisement {}. New total: {}",
        //     deposit.id,
        //     deposit.amount,
        //     deposit.advertisement_id,
        //     updated_advertisement.total_deposited
        // );

        // // Determine if we need to change status based on the status BEFORE adding the amount
        // // If this is the first deposit (advertisement was in Draft or Pending), change status to Ready
        // if status_before == AdvertisementStatus::Draft
        //     || status_before == AdvertisementStatus::Pending
        // {
        //     let mut ad = updated_advertisement;
        //     ad.change_status(AdvertisementStatus::Ready)
        //         .map_err(|e| format!("Failed to change advertisement status to Ready: {}", e))?;

        //     self.advertisement_repository
        //         .save(&ad)
        //         .await
        //         .map_err(|e| format!("Failed to save advertisement: {}", e))?;

        //     tracing::info!("Advertisement {} is now Ready after first deposit confirmation", ad.id);
        // }
        // // If advertisement was in ProcessingDeposit (recharge), unlock it back to Ready
        // else if status_before == AdvertisementStatus::ProcessingDeposit {
        //     let mut ad = updated_advertisement;
        //     ad.change_status(AdvertisementStatus::Ready)
        //         .map_err(|e| format!("Failed to unlock advertisement: {}", e))?;

        //     self.advertisement_repository
        //         .save(&ad)
        //         .await
        //         .map_err(|e| format!("Failed to save advertisement: {}", e))?;

        //     tracing::info!("Advertisement {} unlocked after recharge deposit confirmation", ad.id);
        // }
        // // If the advertisement is already in Ready status, it means it was already confirmed or unlocked
        // // This can happen in edge cases (e.g., manual intervention or retry). Just log it.
        // else if status_before == AdvertisementStatus::Ready {
        //     tracing::warn!(
        //         "Advertisement {} was already in Ready status when confirming deposit {}. Skipping status change.",
        //         deposit.advertisement_id,
        //         deposit.id
        //     );
        // }

        // Publish AdvertisementDepositConfirmedEvent
        let event = AdvertisementDepositConfirmedEvent {
            deposit_id: deposit.id.clone(),
            advertisement_id: deposit.advertisement_id.clone(),
            amount: deposit.amount,
        };

        let event_data = serde_json::to_value(&event)
            .map_err(|e| format!("Failed to serialize event: {}", e))?;

        if let Err(e) = self
            .event_publisher
            .publish(
                event_data,
                "AdvertisementDepositConfirmed".to_string(),
                "AdvertisementDepositConfirmationTask".to_string(),
                Some("advertisement_deposit".to_string()),
                None,
                None,
                None,
                None,
            )
            .await
        {
            tracing::warn!("Failed to publish deposit confirmed event: {:?}", e);
        }

        Ok(())
    }

    /// Mark a deposit as failed and unlock the advertisement if needed
    async fn fail_deposit(
        &self,
        deposit: &mut crate::features::advertisement_deposits::domain::entities::AdvertisementDeposit,
    ) -> Result<(), String> {
        // Update deposit status to Failed
        deposit
            .fail()
            .map_err(|e| format!("Failed to mark deposit as failed: {}", e))?;

        // Save the failed deposit
        self.deposit_repository
            .save(deposit)
            .await
            .map_err(|e| format!("Failed to save failed deposit: {}", e))?;

        tracing::info!("Marked deposit {} as failed", deposit.id);

        // Find the advertisement to unlock it if needed
        let advertisement = self
            .advertisement_repository
            .find_by_id(&deposit.advertisement_id)
            .await
            .map_err(|e| format!("Failed to find advertisement: {}", e))?;

        if let Some(mut ad) = advertisement {
            // If advertisement is in ProcessingDeposit, unlock it
            if ad.status == AdvertisementStatus::ProcessingDeposit {
                ad.change_status(AdvertisementStatus::Ready)
                    .map_err(|e| format!("Failed to unlock advertisement: {}", e))?;

                self.advertisement_repository
                    .save(&ad)
                    .await
                    .map_err(|e| format!("Failed to save advertisement: {}", e))?;

                tracing::info!("Unlocked advertisement {} after deposit failure", ad.id);
            }
            // If it was the initial deposit and advertisement is still in Draft/Pending
            else if ad.status == AdvertisementStatus::Draft || ad.status == AdvertisementStatus::Pending {
                ad.change_status(AdvertisementStatus::DepositFailed)
                    .map_err(|e| format!("Failed to mark advertisement as deposit failed: {}", e))?;

                self.advertisement_repository
                    .save(&ad)
                    .await
                    .map_err(|e| format!("Failed to save advertisement: {}", e))?;

                tracing::info!("Marked advertisement {} as DepositFailed", ad.id);
            }
        }

        Ok(())
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for AdvertisementDepositConfirmationTaskHandler {
    fn name(&self) -> &str {
        "Advertisement Deposit Confirmation"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(60) // Check every 60 seconds
    }

    async fn execute(&self) -> anyhow::Result<()> {
        tracing::debug!("Running periodic advertisement deposit confirmation task");
        self.process_pending_deposits().await?;
        Ok(())
    }
}
