use std::sync::Arc;

use crate::{
    common::errors::{ApiError, AdvertisementDepositError},
    config::Config,
    events::publisher::EventPublisher,
    features::{
        advertisement_deposits::{
            domain::{
                entities::AdvertisementDeposit,
                events::AdvertisementDepositCreatedEvent,
            },
            ports::repositories::AdvertisementDepositRepository,
        },
        advertisements::{
            domain::entities::{Advertisement, AdvertisementId, AdvertisementStatus},
            ports::repositories::AdvertisementRepository,
        },
    },
    services::bolt_transaction_b2pix::{call_deposit_endpoint, get_detail_transaction, TransactionDetailResponse},
};

pub struct AdvertisementDepositService {
    deposit_repository: Arc<dyn AdvertisementDepositRepository>,
    advertisement_repository: Arc<dyn AdvertisementRepository>,
    event_publisher: Arc<EventPublisher>,
    config: Arc<Config>,
}

impl AdvertisementDepositService {
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
            config,
        }
    }

    /// Create initial deposit for a new advertisement
    /// This is called during advertisement creation with the initial funding transaction
    pub async fn create_initial_deposit(
        &self,
        advertisement: &Advertisement,
        serialized_transaction: String,
    ) -> Result<AdvertisementDeposit, ApiError> {
        // Validate advertisement is in Draft status
        if advertisement.status != AdvertisementStatus::Draft {
            tracing::error!("Advertisement {} is not in draft status", advertisement.id);
            return Err(ApiError::BadRequest(
                "Can only create initial deposit for draft advertisements".to_string(),
            ));
        }

        // Get transaction details to extract amount
        let transaction_detail = get_detail_transaction(&serialized_transaction, Arc::clone(&self.config))
            .await
            .map_err(|e| {
                tracing::error!("Failed to get transaction detail: {}", e);
                ApiError::BadRequest(format!("Failed to get transaction detail: {}", e))
            })?;

        // Create the deposit entity (without amount initially)
        let mut deposit = AdvertisementDeposit::new(
            advertisement.id.clone(),
            advertisement.seller_address.clone(),
            serialized_transaction,
        )
        .map_err(|e| {
            tracing::error!("Failed to create deposit entity: {}", e);
            ApiError::InternalServerError(format!("Failed to create deposit: {}", e))
        })?;

        // Set the amount from transaction detail
        // Note: For initial deposit, we don't have blockchain_tx_id yet, it will be set when broadcasted
        deposit.amount = Some(transaction_detail.amount);

        // Save the deposit
        self.deposit_repository
            .save(&deposit)
            .await
            .map_err(|e| {
                tracing::error!("Failed to save deposit: {}", e);
                ApiError::InternalServerError(format!("Failed to save deposit: {}", e))
            })?;

        // Publish AdvertisementDepositCreatedEvent
        let event = AdvertisementDepositCreatedEvent {
            deposit_id: deposit.id.clone(),
            advertisement_id: advertisement.id.clone(),
        };

        let event_data = serde_json::to_value(&event).map_err(|e| {
            ApiError::InternalServerError(format!("Failed to serialize event: {}", e))
        })?;

        if let Err(e) = self
            .event_publisher
            .publish(
                event_data,
                "AdvertisementDepositCreated".to_string(),
                "AdvertisementDepositService::create_initial_deposit".to_string(),
                Some("advertisement_deposit".to_string()),
                None,
                None,
                None,
                None,
            )
            .await
        {
            tracing::warn!("Failed to publish deposit created event: {:?}", e);
        }

        Ok(deposit)
    }

    /// Create a recharge deposit for an existing advertisement
    /// This is called when a seller wants to add more crypto to their active advertisement
    /// New implementation: Uses Bolt Protocol deposit endpoint for validation and broadcasting
    pub async fn create_recharge_deposit(
        &self,
        advertisement_id: AdvertisementId,
        serialized_transaction: String,
    ) -> Result<AdvertisementDeposit, ApiError> {
        // Step 1: Atomically lock the advertisement (Ready → ProcessingDeposit)
        let advertisement = self
            .advertisement_repository
            .lock_for_deposit(&advertisement_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to lock advertisement {}: {}", advertisement_id, e);
                ApiError::InternalServerError(format!("Failed to lock advertisement: {}", e))
            })?
            .ok_or_else(|| {
                tracing::error!("Advertisement {} not found or not in Ready status", advertisement_id);
                ApiError::BadRequest("Advertisement is not available for deposits. It may be processing another deposit or not in Ready status.".to_string())
            })?;

        tracing::info!("Advertisement {} locked for deposit processing", advertisement_id);

        // Step 2: Create deposit entity (without amount, will be set after Bolt response)
        let mut deposit = match AdvertisementDeposit::new(
            advertisement_id.clone(),
            advertisement.seller_address.clone(),
            serialized_transaction.clone(),
        ) {
            Ok(d) => d,
            Err(e) => {
                tracing::error!("Failed to create deposit entity: {}", e);
                // Unlock advertisement on error
                let _ = self.unlock_advertisement(&advertisement_id).await;
                return Err(ApiError::InternalServerError(format!("Failed to create deposit: {}", e)));
            }
        };

        // Step 3: Call Bolt deposit endpoint (validates recipient and broadcasts)
        let deposit_response = match call_deposit_endpoint(
            &serialized_transaction,
            &self.config.address_manager, // Bolt validates this is the recipient
            Arc::clone(&self.config),
        )
        .await
        {
            Ok(response) => response,
            Err(e) => {
                tracing::error!("Bolt deposit endpoint failed for advertisement {}: {}", advertisement_id, e);
                // Unlock advertisement on error
                let _ = self.unlock_advertisement(&advertisement_id).await;
                return Err(ApiError::BadRequest(format!("Failed to broadcast deposit transaction: {}", e)));
            }
        };

        // Step 4: Set broadcast info (txid and amount from Bolt)
        if let Err(e) = deposit.set_broadcast_info(deposit_response.txid.clone(), deposit_response.amount) {
            tracing::error!("Failed to set broadcast info: {}", e);
            let _ = self.unlock_advertisement(&advertisement_id).await;
            return Err(ApiError::InternalServerError(format!("Failed to set deposit info: {}", e)));
        }

        // Step 5: Mark deposit as pending
        if let Err(e) = deposit.mark_pending() {
            tracing::error!("Failed to mark deposit as pending: {}", e);
            let _ = self.unlock_advertisement(&advertisement_id).await;
            return Err(ApiError::InternalServerError(format!("Failed to update deposit status: {}", e)));
        }

        // Step 6: Save the deposit
        if let Err(e) = self.deposit_repository.save(&deposit).await {
            tracing::error!("Failed to save deposit: {}", e);
            // Unlock advertisement on error
            let _ = self.unlock_advertisement(&advertisement_id).await;
            return Err(ApiError::InternalServerError(format!("Failed to save deposit: {}", e)));
        }

        tracing::info!(
            "Deposit created successfully - id: {}, txid: {}, amount: {}",
            deposit.id,
            deposit_response.txid,
            deposit_response.amount
        );

        // Step 7: Publish AdvertisementDepositCreatedEvent
        // This will trigger background task to monitor confirmation
        let event = AdvertisementDepositCreatedEvent {
            deposit_id: deposit.id.clone(),
            advertisement_id: advertisement_id.clone(),
        };

        let event_data = serde_json::to_value(&event).map_err(|e| {
            ApiError::InternalServerError(format!("Failed to serialize event: {}", e))
        })?;

        if let Err(e) = self
            .event_publisher
            .publish(
                event_data,
                "AdvertisementDepositCreated".to_string(),
                "AdvertisementDepositService::create_recharge_deposit".to_string(),
                Some("advertisement_deposit".to_string()),
                None,
                None,
                None,
                None,
            )
            .await
        {
            tracing::warn!("Failed to publish deposit created event: {:?}", e);
        }

        Ok(deposit)
    }

    /// Get all deposits for an advertisement
    /// Returns deposits sorted by created_at in descending order (newest first)
    /// Uses the compound index: advertisement_id + created_at (DESC)
    pub async fn get_deposits_by_advertisement(
        &self,
        advertisement_id: &AdvertisementId,
    ) -> Result<Vec<AdvertisementDeposit>, ApiError> {
        self.deposit_repository
            .find_by_advertisement_id(advertisement_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to get deposits for advertisement {}: {}", advertisement_id, e);
                ApiError::InternalServerError(format!("Failed to get deposits: {}", e))
            })
    }

    /// Helper method to unlock an advertisement by changing status back to Ready
    async fn unlock_advertisement(&self, advertisement_id: &AdvertisementId) -> Result<(), ApiError> {
        let mut advertisement = self
            .advertisement_repository
            .find_by_id(advertisement_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find advertisement for unlock: {}", e);
                ApiError::InternalServerError(format!("Failed to find advertisement: {}", e))
            })?
            .ok_or_else(|| {
                tracing::error!("Advertisement not found for unlock: {}", advertisement_id);
                ApiError::NotFound
            })?;

        if advertisement.status == AdvertisementStatus::ProcessingDeposit {
            advertisement
                .change_status(AdvertisementStatus::Ready)
                .map_err(|e| {
                    tracing::error!("Failed to unlock advertisement: {}", e);
                    ApiError::InternalServerError(format!("Failed to unlock advertisement: {}", e))
                })?;

            self.advertisement_repository
                .save(&advertisement)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to save unlocked advertisement: {}", e);
                    ApiError::InternalServerError(format!("Failed to save advertisement: {}", e))
                })?;
        }

        Ok(())
    }
}
