use std::sync::Arc;

use futures::FutureExt;

use crate::{
    common::errors::ApiError,
    config::Config,
    events::{handlers::EventHandlerRegistry, publisher::EventPublisher},
    features::{
        advertisements::{
            domain::{
                entities::{Advertisement, AdvertisementId, AdvertisementStatus},
                events::AdvertisementCreateEvent,
            },
            ports::repositories::AdvertisementRepository,
            services::AdvertisementCreateHandler,
        },
        bank_credentials::ports::BankCredentialsRepository,
        invites::{
            ports::repositories::InviteRepository,
            domain::entities::BankStatus,
        },
        shared::StacksAddress,
    },
    infrastructure::{
        blockchain::stacks::{TransactionStatus, TransactionVerifier},
        storage::gcs_manager::GcsManager,
    },
    services::{
        efi_pay_service::EfiPayService,
        bolt_transaction_b2pix::{get_detail_transaction, TransactionDetailResponse},
    },
};

pub struct AdvertisementService {
    advertisement_repository: Arc<dyn AdvertisementRepository>,
    invite_repository: Arc<dyn InviteRepository>,
    bank_credentials_repository: Arc<dyn BankCredentialsRepository>,
    event_publisher: Arc<EventPublisher>,
    config: Arc<Config>,
    efi_pay_service: Arc<EfiPayService>,
}

impl AdvertisementService {
    pub fn new(
        advertisement_repository: Arc<dyn AdvertisementRepository>,
        invite_repository: Arc<dyn InviteRepository>,
        bank_credentials_repository: Arc<dyn BankCredentialsRepository>,
        event_publisher: Arc<EventPublisher>,
        config: Arc<Config>,
        efi_pay_service: Arc<EfiPayService>,
    ) -> Self {
        Self {
            advertisement_repository,
            invite_repository,
            bank_credentials_repository,
            event_publisher,
            config,
            efi_pay_service,
        }
    }

    pub fn register_handlers(self: Arc<Self>, registry: &EventHandlerRegistry) {
        // Register all advertisement-related handlers
        registry.register(Arc::new(AdvertisementCreateHandler::new(
            Arc::clone(&self.advertisement_repository),
            Arc::clone(&self.config),
        )));
    }

    pub async fn get_by_id(&self, id: AdvertisementId) -> Result<Option<Advertisement>, ApiError> {
        self.advertisement_repository
            .find_by_id(&id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find advertisement by ID {}: {}", id.to_string(), e);
                ApiError::InternalServerError(format!("Failed to find advertisement by ID: {}", e))
            })
    }

    pub async fn create_advertisement_command(
        &self,
        serialized_transaction: &str,
        min_amount: i64,
        max_amount: i64,
        pricing_mode_str: String,
    ) -> Result<Advertisement, ApiError> {
        use crate::features::advertisements::domain::entities::PricingMode;

        let transaction_detail: TransactionDetailResponse =
            get_detail_transaction(&serialized_transaction, Arc::clone(&self.config))
                .await
                .map_err(|e| {
                    tracing::error!("Failed to get transaction detail: {}", e);
                    ApiError::BadRequest(format!("Failed to get transaction detail: {}", e))
                })?;

        // Validate that the transaction recipient is the ADDRESS_MANAGER (escrow address)
        if transaction_detail.recipient != self.config.address_manager {
            tracing::error!(
                "Transaction recipient {} does not match ADDRESS_MANAGER {}",
                transaction_detail.recipient,
                self.config.address_manager
            );
            return Err(ApiError::BadRequest(format!(
                "Invalid transaction recipient. Expected: {}, Got: {}",
                self.config.address_manager,
                transaction_detail.recipient
            )));
        }

        // Interpret the price field based on pricing_mode
        let pricing_mode = match pricing_mode_str.to_lowercase().as_str() {
            "fixed" => {
                // For fixed mode, price is the fixed price in cents (must be positive)
                if transaction_detail.price <= 0 {
                    return Err(ApiError::BadRequest(
                        "Fixed price must be positive".to_string()
                    ));
                }
                PricingMode::Fixed {
                    price: transaction_detail.price as u128,
                }
            }
            "dynamic" => {
                // For dynamic mode, price is the percentage offset in basis points
                // e.g., 315 => 3.15%, -500 => -5.00%, 0 => 0%
                let percentage_offset = transaction_detail.price as f64 / 100.0;
                PricingMode::Dynamic { percentage_offset }
            }
            _ => {
                return Err(ApiError::BadRequest(format!(
                    "Invalid pricing_mode: {}. Must be 'fixed' or 'dynamic'",
                    pricing_mode_str
                )));
            }
        };

        // Get invite by sender address to retrieve banking credentials
        let sender_address = StacksAddress::from_string(transaction_detail.sender.clone());
        let invite = self.invite_repository
            .find_by_address(&sender_address)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find invite for address {}: {}", transaction_detail.sender, e);
                ApiError::InternalServerError(format!("Failed to find invite for address: {}", e))
            })?
            .ok_or_else(|| {
                tracing::error!("No invite found for address: {}", transaction_detail.sender);
                ApiError::BadRequest("No invite found for this address. Please complete the invitation process first.".to_string())
            })?;

        // Check if banking setup is complete
        if invite.bank_status() != &BankStatus::SUCCESS {
            tracing::error!("Banking setup not complete for address: {}", transaction_detail.sender);
            return Err(ApiError::BadRequest("Banking setup is not complete. Please complete bank setup first.".to_string()));
        }

        // Get latest bank credentials for the seller
        let bank_credentials = self.bank_credentials_repository
            .find_latest_by_address(&sender_address)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find bank credentials for address {}: {}", sender_address, e);
                ApiError::InternalServerError(format!("Failed to find bank credentials: {}", e))
            })?
            .ok_or_else(|| {
                tracing::error!("No bank credentials found for address: {}", sender_address);
                ApiError::BadRequest("No bank credentials found for this address.".to_string())
            })?;

        // Get EFI Pay client using the service
        let efi_client = self.efi_pay_service
            .get_efi_client(&sender_address)
            .await
            .map_err(|e| {
                tracing::error!("Failed to get EFI Pay client: {:?}", e);
                ApiError::InternalServerError("Failed to initialize banking client".to_string())
            })?;

        // Authenticate with EFI Pay
        let oauth_response = efi_client.authenticate().await
            .map_err(|e| {
                tracing::error!("EFI Pay authentication failed: {:?}", e);
                ApiError::BadRequest("Failed to authenticate with bank. Please check your banking credentials.".to_string())
            })?;

        // Get existing PIX key or create a new one
        let pix_key = efi_client.get_or_create_pix_key(&oauth_response.access_token)
            .await
            .map_err(|e| {
                tracing::error!("Failed to get or create PIX key: {}", e);
                ApiError::BadRequest(format!("Failed to get or create PIX key: {}", e))
            })?;


        let advertisement: Advertisement = Advertisement::new(
            transaction_detail.sender,
            "BTC".to_string(), // Assuming BTC for simplicity, adjust as needed
            transaction_detail.currency,
            pricing_mode,
            pix_key, // Use the PIX key (either existing or newly created)
            Some(bank_credentials.id().clone()), // Store the credentials ID
            min_amount,
            max_amount,
        )
        .map_err(|e| {
            tracing::error!("Failed to create advertisement: {}", e);
            ApiError::InternalServerError(format!("Failed to create advertisement: {}", e))
        })?;

        // Save the advertisement with the serialized transaction
        self.advertisement_repository
            .save(&advertisement)
            .await
            .map_err(|e| {
                tracing::error!("Failed to save advertisement: {}", e);
                ApiError::InternalServerError(format!("Failed to save advertisement: {}", e))
            })?;

        let event: AdvertisementCreateEvent = AdvertisementCreateEvent {
            id: advertisement.id.clone(),
        };

        let event_data = serde_json::to_value(&event).map_err(|e| {
            ApiError::InternalServerError(format!("Failed to serialize event: {}", e))
        })?;

        if let Err(e) = self
            .event_publisher
            .publish(
                event_data,
                "AdvertisementCreateEvent".to_string(),
                "AdvertisementService::create_advertisement".to_string(),
                Some("advertisement".to_string()),
                None,
                None,
                None,
                None,
            )
            .await
        {
            tracing::warn!("Failed to publish create advertisement event: {:?}", e);
        }

        Ok(advertisement)
    }

    // NOTE: process_pending() is no longer needed
    // Deposit processing is now handled by the AdvertisementDeposit feature

    pub async fn list_advertisements(
        &self,
        status_filters: Option<Vec<String>>,
        active_only: Option<bool>,
        page: u64,
        limit: u64,
        sort_by: Option<String>,
        sort_order: Option<String>,
    ) -> Result<(Vec<Advertisement>, u64), ApiError> {
        // Parse status filters
        let mut advertisements = Vec::new();
        let total_count: u64;

        // Validate and parse status filters
        let statuses: Option<Vec<AdvertisementStatus>> = if let Some(status_strs) = status_filters {
            let parsed_statuses: Result<Vec<AdvertisementStatus>, _> = status_strs
                .iter()
                .map(|s| match s.to_lowercase().as_str() {
                    "draft" => Ok(AdvertisementStatus::Draft),
                    "pending" => Ok(AdvertisementStatus::Pending),
                    "ready" => Ok(AdvertisementStatus::Ready),
                    "bank_failed" => Ok(AdvertisementStatus::BankFailed),
                    "deposit_failed" => Ok(AdvertisementStatus::DepositFailed),
                    "closed" => Ok(AdvertisementStatus::Closed),
                    "disabled" => Ok(AdvertisementStatus::Disabled),
                    _ => Err(ApiError::BadRequest(format!("Invalid status: {}", s))),
                })
                .collect();
            
            Some(parsed_statuses?)
        } else {
            None
        };

        // Calculate skip for pagination
        let skip = (page - 1) * limit;

        // Convert sort_order string to i32
        let sort_order_num = match sort_order.as_deref() {
            Some("desc") => Some(-1),
            Some("asc") => Some(1),
            _ => Some(1), // Default to ascending
        };

        // If specific statuses are provided, query by each status
        if let Some(status_list) = statuses {
            for status in status_list {
                let status_ads = self
                    .advertisement_repository
                    .find_by_status(&status)
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to find advertisements by status: {}", e);
                        ApiError::InternalServerError(format!(
                            "Failed to find advertisements by status: {}",
                            e
                        ))
                    })?;
                advertisements.extend(status_ads);
            }

            // Filter by active status if requested
            if let Some(true) = active_only {
                advertisements.retain(|ad| ad.is_active);
            }

            total_count = advertisements.len() as u64;

            // Apply sorting
            if let Some(sort_field) = sort_by.as_deref() {
                match sort_field {
                    "created_at" => {
                        if sort_order_num == Some(-1) {
                            advertisements.sort_by(|a, b| b.created_at.cmp(&a.created_at));
                        } else {
                            advertisements.sort_by(|a, b| a.created_at.cmp(&b.created_at));
                        }
                    }
                    "updated_at" => {
                        if sort_order_num == Some(-1) {
                            advertisements.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
                        } else {
                            advertisements.sort_by(|a, b| a.updated_at.cmp(&b.updated_at));
                        }
                    }
                    "price" => {
                        use crate::features::advertisements::domain::entities::PricingMode;
                        // For price sorting, we can only sort fixed-price advertisements
                        // Dynamic ads don't have a fixed price to sort by
                        if sort_order_num == Some(-1) {
                            advertisements.sort_by(|a, b| {
                                match (&a.pricing_mode, &b.pricing_mode) {
                                    (PricingMode::Fixed { price: price_a }, PricingMode::Fixed { price: price_b }) => {
                                        price_b.cmp(price_a)
                                    }
                                    (PricingMode::Fixed { .. }, PricingMode::Dynamic { .. }) => std::cmp::Ordering::Less,
                                    (PricingMode::Dynamic { .. }, PricingMode::Fixed { .. }) => std::cmp::Ordering::Greater,
                                    (PricingMode::Dynamic { .. }, PricingMode::Dynamic { .. }) => std::cmp::Ordering::Equal,
                                }
                            });
                        } else {
                            advertisements.sort_by(|a, b| {
                                match (&a.pricing_mode, &b.pricing_mode) {
                                    (PricingMode::Fixed { price: price_a }, PricingMode::Fixed { price: price_b }) => {
                                        price_a.cmp(price_b)
                                    }
                                    (PricingMode::Fixed { .. }, PricingMode::Dynamic { .. }) => std::cmp::Ordering::Less,
                                    (PricingMode::Dynamic { .. }, PricingMode::Fixed { .. }) => std::cmp::Ordering::Greater,
                                    (PricingMode::Dynamic { .. }, PricingMode::Dynamic { .. }) => std::cmp::Ordering::Equal,
                                }
                            });
                        }
                    }
                    "total_deposited" | "total_amount" => {
                        if sort_order_num == Some(-1) {
                            advertisements.sort_by(|a, b| b.total_deposited.cmp(&a.total_deposited));
                        } else {
                            advertisements.sort_by(|a, b| a.total_deposited.cmp(&b.total_deposited));
                        }
                    }
                    _ => {
                        // Default sort by created_at descending
                        advertisements.sort_by(|a, b| b.created_at.cmp(&a.created_at));
                    }
                }
            } else {
                // Default sort by created_at descending
                advertisements.sort_by(|a, b| b.created_at.cmp(&a.created_at));
            }

            // Apply pagination
            let start = skip as usize;
            let end = std::cmp::min(start + limit as usize, advertisements.len());
            if start < advertisements.len() {
                advertisements = advertisements[start..end].to_vec();
            } else {
                advertisements.clear();
            }
        } else {
            // No status filter - use repository pagination method
            if let Some(true) = active_only {
                // Get all available (active) advertisements
                advertisements = self
                    .advertisement_repository
                    .find_available()
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to find available advertisements: {}", e);
                        ApiError::InternalServerError(format!(
                            "Failed to find available advertisements: {}",
                            e
                        ))
                    })?;

                total_count = advertisements.len() as u64;

                // Apply sorting and pagination manually for available ads
                if let Some(sort_field) = sort_by.as_deref() {
                    match sort_field {
                        "created_at" => {
                            if sort_order_num == Some(-1) {
                                advertisements.sort_by(|a, b| b.created_at.cmp(&a.created_at));
                            } else {
                                advertisements.sort_by(|a, b| a.created_at.cmp(&b.created_at));
                            }
                        }
                        "updated_at" => {
                            if sort_order_num == Some(-1) {
                                advertisements.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
                            } else {
                                advertisements.sort_by(|a, b| a.updated_at.cmp(&b.updated_at));
                            }
                        }
                        "price" => {
                            use crate::features::advertisements::domain::entities::PricingMode;
                            // For price sorting, we can only sort fixed-price advertisements
                            // Dynamic ads don't have a fixed price to sort by
                            if sort_order_num == Some(-1) {
                                advertisements.sort_by(|a, b| {
                                    match (&a.pricing_mode, &b.pricing_mode) {
                                        (PricingMode::Fixed { price: price_a }, PricingMode::Fixed { price: price_b }) => {
                                            price_b.cmp(price_a)
                                        }
                                        (PricingMode::Fixed { .. }, PricingMode::Dynamic { .. }) => std::cmp::Ordering::Less,
                                        (PricingMode::Dynamic { .. }, PricingMode::Fixed { .. }) => std::cmp::Ordering::Greater,
                                        (PricingMode::Dynamic { .. }, PricingMode::Dynamic { .. }) => std::cmp::Ordering::Equal,
                                    }
                                });
                            } else {
                                advertisements.sort_by(|a, b| {
                                    match (&a.pricing_mode, &b.pricing_mode) {
                                        (PricingMode::Fixed { price: price_a }, PricingMode::Fixed { price: price_b }) => {
                                            price_a.cmp(price_b)
                                        }
                                        (PricingMode::Fixed { .. }, PricingMode::Dynamic { .. }) => std::cmp::Ordering::Less,
                                        (PricingMode::Dynamic { .. }, PricingMode::Fixed { .. }) => std::cmp::Ordering::Greater,
                                        (PricingMode::Dynamic { .. }, PricingMode::Dynamic { .. }) => std::cmp::Ordering::Equal,
                                    }
                                });
                            }
                        }
                        "total_deposited" | "total_amount" => {
                            if sort_order_num == Some(-1) {
                                advertisements.sort_by(|a, b| b.total_deposited.cmp(&a.total_deposited));
                            } else {
                                advertisements.sort_by(|a, b| a.total_deposited.cmp(&b.total_deposited));
                            }
                        }
                        _ => {
                            advertisements.sort_by(|a, b| b.created_at.cmp(&a.created_at));
                        }
                    }
                } else {
                    advertisements.sort_by(|a, b| b.created_at.cmp(&a.created_at));
                }

                let start = skip as usize;
                let end = std::cmp::min(start + limit as usize, advertisements.len());
                if start < advertisements.len() {
                    advertisements = advertisements[start..end].to_vec();
                } else {
                    advertisements.clear();
                }
            } else {
                // Use repository pagination for all advertisements
                advertisements = self
                    .advertisement_repository
                    .find_paginated(skip, limit, sort_by, sort_order_num)
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to find paginated advertisements: {}", e);
                        ApiError::InternalServerError(format!(
                            "Failed to find paginated advertisements: {}",
                            e
                        ))
                    })?;

                total_count = self
                    .advertisement_repository
                    .count()
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to count advertisements: {}", e);
                        ApiError::InternalServerError(format!(
                            "Failed to count advertisements: {}",
                            e
                        ))
                    })?;
            }
        }

        Ok((advertisements, total_count))
    }

    /// Get advertisements by seller address
    pub async fn get_advertisements_by_address(
        &self,
        address: &str,
    ) -> Result<Vec<Advertisement>, ApiError> {
        // Parse and validate the crypto address
        let crypto_address = crate::features::shared::value_objects::CryptoAddress::new(address.to_string())
            .map_err(|e| {
                tracing::warn!("Invalid address format: {}", e);
                ApiError::BadRequest(format!("Invalid address format: {}", e))
            })?;

        // Get advertisements from repository
        let advertisements = self
            .advertisement_repository
            .find_by_seller_address(&crypto_address)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find advertisements by address: {}", e);
                ApiError::InternalServerError(format!(
                    "Failed to find advertisements by address: {}",
                    e
                ))
            })?;

        Ok(advertisements)
    }

    /// Change advertisement status to Finishing
    /// Only allowed if current status is Ready and the wallet matches seller_address
    pub async fn finish_advertisement(
        &self,
        id: AdvertisementId,
        wallet_address: &str,
    ) -> Result<Advertisement, ApiError> {
        // Find the advertisement by ID
        let mut advertisement = self.advertisement_repository
            .find_by_id(&id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find advertisement by ID {}: {}", id.to_string(), e);
                ApiError::InternalServerError(format!("Failed to find advertisement by ID: {}", e))
            })?
            .ok_or(ApiError::NotFound)?;

        // Verify the wallet address matches the seller_address
        if advertisement.seller_address != wallet_address {
            return Err(ApiError::Forbidden);
        }

        // Verify the current status is Ready
        if advertisement.status != AdvertisementStatus::Ready {
            return Err(ApiError::BadRequest(format!(
                "Advertisement must be in 'ready' status to be finished. Current status: {:?}",
                advertisement.status
            )));
        }

        // Change status to Finishing
        advertisement.change_status(AdvertisementStatus::Finishing)
            .map_err(|e| {
                tracing::error!("Failed to change advertisement status to Finishing: {}", e);
                ApiError::BadRequest(format!("Failed to change advertisement status: {}", e))
            })?;

        // Save the updated advertisement
        self.advertisement_repository
            .save(&advertisement)
            .await
            .map_err(|e| {
                tracing::error!("Failed to save updated advertisement: {}", e);
                ApiError::InternalServerError(format!("Failed to save updated advertisement: {}", e))
            })?;

        Ok(advertisement)
    }

    /// Get advertisements by status
    pub async fn get_advertisements_by_status(
        &self,
        status: &AdvertisementStatus,
    ) -> Result<Vec<Advertisement>, ApiError> {
        self.advertisement_repository
            .find_by_status(status)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find advertisements by status {:?}: {}", status, e);
                ApiError::InternalServerError(format!("Failed to find advertisements by status: {}", e))
            })
    }

    /// Close advertisement by changing status to Closed
    /// Only allowed if current status is Finishing
    pub async fn close_advertisement(
        &self,
        id: AdvertisementId,
    ) -> Result<Advertisement, ApiError> {
        // Find the advertisement by ID
        let mut advertisement = self.advertisement_repository
            .find_by_id(&id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find advertisement by ID {}: {}", id.to_string(), e);
                ApiError::InternalServerError(format!("Failed to find advertisement by ID: {}", e))
            })?
            .ok_or(ApiError::NotFound)?;

        // Verify the current status is Finishing
        if advertisement.status != AdvertisementStatus::Finishing {
            return Err(ApiError::BadRequest(format!(
                "Advertisement must be in 'finishing' status to be closed. Current status: {:?}",
                advertisement.status
            )));
        }

        // Change status to Closed
        advertisement.change_status(AdvertisementStatus::Closed)
            .map_err(|e| {
                tracing::error!("Failed to change advertisement status to Closed: {}", e);
                ApiError::BadRequest(format!("Failed to change advertisement status: {}", e))
            })?;

        // Save the updated advertisement
        self.advertisement_repository
            .save(&advertisement)
            .await
            .map_err(|e| {
                tracing::error!("Failed to save closed advertisement: {}", e);
                ApiError::InternalServerError(format!("Failed to save closed advertisement: {}", e))
            })?;

        Ok(advertisement)
    }
}
