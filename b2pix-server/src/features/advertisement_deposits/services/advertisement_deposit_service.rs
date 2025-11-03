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
    services::bolt_transaction_b2pix::{get_detail_transaction, TransactionDetailResponse},
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

        // Create the deposit entity
        let deposit = AdvertisementDeposit::new(
            advertisement.id.clone(),
            advertisement.seller_address.clone(),
            serialized_transaction,
            transaction_detail.amount,
        )
        .map_err(|e| {
            tracing::error!("Failed to create deposit entity: {}", e);
            ApiError::InternalServerError(format!("Failed to create deposit: {}", e))
        })?;

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
    pub async fn create_recharge_deposit(
        &self,
        advertisement_id: AdvertisementId,
        serialized_transaction: String,
        seller_address: &str,
    ) -> Result<AdvertisementDeposit, ApiError> {
        // Find the advertisement
        let mut advertisement = self
            .advertisement_repository
            .find_by_id(&advertisement_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find advertisement: {}", e);
                ApiError::InternalServerError(format!("Failed to find advertisement: {}", e))
            })?
            .ok_or_else(|| {
                tracing::error!("Advertisement not found: {}", advertisement_id);
                ApiError::NotFound
            })?;

        // Verify the seller address matches
        if advertisement.seller_address != seller_address {
            tracing::error!(
                "Seller address mismatch. Expected: {}, Got: {}",
                advertisement.seller_address,
                seller_address
            );
            return Err(ApiError::Forbidden);
        }

        // Verify advertisement is in Ready status (not already processing a deposit)
        if advertisement.status != AdvertisementStatus::Ready {
            tracing::error!(
                "Advertisement {} is not in ready status. Current status: {:?}",
                advertisement_id,
                advertisement.status
            );
            return Err(ApiError::BadRequest(format!(
                "Can only add deposits to ready advertisements. Current status: {:?}",
                advertisement.status
            )));
        }

        // Change advertisement status to ProcessingDeposit to lock it
        advertisement
            .change_status(AdvertisementStatus::ProcessingDeposit)
            .map_err(|e| {
                tracing::error!("Failed to change advertisement status: {}", e);
                ApiError::InternalServerError(format!("Failed to change advertisement status: {}", e))
            })?;

        // Save the locked advertisement
        self.advertisement_repository
            .save(&advertisement)
            .await
            .map_err(|e| {
                tracing::error!("Failed to save advertisement: {}", e);
                ApiError::InternalServerError(format!("Failed to save advertisement: {}", e))
            })?;

        // Get transaction details to extract amount
        let transaction_detail = match get_detail_transaction(&serialized_transaction, Arc::clone(&self.config)).await {
            Ok(detail) => detail,
            Err(e) => {
                tracing::error!("Failed to get transaction detail: {}", e);
                // Unlock the advertisement on error
                let _ = self.unlock_advertisement(&advertisement_id).await;
                return Err(ApiError::BadRequest(format!("Failed to get transaction detail: {}", e)));
            }
        };

        // Validate the transaction recipient is the ADDRESS_MANAGER (escrow address)
        if transaction_detail.recipient != self.config.address_manager {
            tracing::error!(
                "Transaction recipient {} does not match ADDRESS_MANAGER {}",
                transaction_detail.recipient,
                self.config.address_manager
            );
            // Unlock the advertisement on error
            let _ = self.unlock_advertisement(&advertisement_id).await;
            return Err(ApiError::BadRequest(format!(
                "Invalid transaction recipient. Expected: {}, Got: {}",
                self.config.address_manager, transaction_detail.recipient
            )));
        }

        // Validate the sender matches the seller address
        if transaction_detail.sender != seller_address {
            tracing::error!(
                "Transaction sender {} does not match seller address {}",
                transaction_detail.sender,
                seller_address
            );
            // Unlock the advertisement on error
            let _ = self.unlock_advertisement(&advertisement_id).await;
            return Err(ApiError::BadRequest(format!(
                "Transaction sender does not match seller address"
            )));
        }

        // Create the deposit entity
        let deposit = match AdvertisementDeposit::new(
            advertisement_id.clone(),
            seller_address.to_string(),
            serialized_transaction,
            transaction_detail.amount,
        ) {
            Ok(d) => d,
            Err(e) => {
                tracing::error!("Failed to create deposit entity: {}", e);
                // Unlock the advertisement on error
                let _ = self.unlock_advertisement(&advertisement_id).await;
                return Err(ApiError::InternalServerError(format!("Failed to create deposit: {}", e)));
            }
        };

        // Save the deposit
        if let Err(e) = self.deposit_repository.save(&deposit).await {
            tracing::error!("Failed to save deposit: {}", e);
            // Unlock the advertisement on error
            let _ = self.unlock_advertisement(&advertisement_id).await;
            return Err(ApiError::InternalServerError(format!("Failed to save deposit: {}", e)));
        }

        // Publish AdvertisementDepositCreatedEvent
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
