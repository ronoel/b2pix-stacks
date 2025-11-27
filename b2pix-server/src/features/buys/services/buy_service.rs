use std::sync::Arc;

use crate::{
    common::errors::{ApiError, BuyError},
    config::Config,
    features::{
        advertisements::{
            domain::entities::AdvertisementId, ports::repositories::AdvertisementRepository,
        },
        buys::{
            domain::entities::{Buy, BuyId, BuyStatus},
            ports::repositories::BuyRepository,
        },
        invites::ports::InviteRepository,
        payment_requests::{
            domain::entities::SourceType,
            services::PaymentRequestService,
        },
        shared::{value_objects::StacksAddress, CryptoAddress},
    },
    infrastructure::storage::GcsManager,
    publisher::EventPublisher,
    services::{efi_pay_service::EfiPayService, trello::{TrelloCardService, TrelloConfig}},
};

pub struct BuyService {
    buy_repository: Arc<dyn BuyRepository>,
    advertisement_repository: Arc<dyn AdvertisementRepository>,
    invite_repository: Arc<dyn InviteRepository>,
    payment_request_service: Arc<PaymentRequestService>,
    event_publisher: Arc<EventPublisher>,
    config: Arc<Config>,
    efi_pay_service: Arc<EfiPayService>,
}

impl BuyService {
    pub fn new(
        buy_repository: Arc<dyn BuyRepository>,
        advertisement_repository: Arc<dyn AdvertisementRepository>,
        invite_repository: Arc<dyn InviteRepository>,
        payment_request_service: Arc<PaymentRequestService>,
        event_publisher: Arc<EventPublisher>,
        config: Arc<Config>,
        efi_pay_service: Arc<EfiPayService>,
    ) -> Self {
        Self {
            buy_repository,
            advertisement_repository,
            invite_repository,
            payment_request_service,
            event_publisher,
            config,
            efi_pay_service,
        }
    }

    pub async fn start(
        &self,
        advertisement_id: AdvertisementId,
        pay_value: u128,
        address_buy: CryptoAddress,
    ) -> Result<Buy, ApiError> {
        // Validate pay_value
        if pay_value == 0 {
            return Err(ApiError::BadRequest(
                "Pay value must be greater than zero".to_string(),
            ));
        }

        // First, get the advertisement to calculate the amount
        let advertisement = self
            .advertisement_repository
            .find_by_id(&advertisement_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to find advertisement: {}", e))
            })?
            .ok_or(ApiError::NotFound)?;

        // Calculate the amount based on pay_value and advertisement price
        // pay_value = (amount * price / 100_000_000)
        // So: amount = pay_value * 100_000_000 / price
        let amount = pay_value * 100_000_000 / advertisement.price;

        // Reserve funds from advertisement (atomic operation)
        let advertisement = self
            .advertisement_repository
            .update_available_amount(&advertisement_id, &amount)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!(
                    "Failed to reserve funds from advertisement: {}",
                    e
                ))
            })?
            .ok_or(ApiError::NotFound)?;

        tracing::warn!("TO-DO: Get a new fresh PIX key");
        // tracing::warn!("TO-DO: Must allow only one buy per advertisement per buyer");

        // The pay_value is already provided, no need to calculate it

        // Create buy order - if this fails, we need to refund
        let buy = match Buy::new(
            advertisement_id.clone(),
            amount,
            advertisement.price,
            0, // No fee for now
            pay_value,
            address_buy,
            advertisement.pix_key.clone(),
        ) {
            Ok(buy) => buy,
            Err(e) => {
                // Refund the amount back to the advertisement
                if let Err(refund_err) = self
                    .advertisement_repository
                    .refund_available_amount(&advertisement_id, &amount)
                    .await
                {
                    tracing::error!(
                        "Failed to refund amount {} to advertisement {}: {}",
                        amount,
                        advertisement_id,
                        refund_err
                    );
                }
                tracing::error!("Failed to create buy order: {}", e);
                return Err(ApiError::InternalServerError(format!(
                    "Failed to create buy order: {}",
                    e
                )));
            }
        };

        // Save it to the repository - if this fails, we need to refund
        if let Err(save_err) = self.buy_repository.save(&buy).await {
            // Refund the amount back to the advertisement
            if let Err(refund_err) = self
                .advertisement_repository
                .refund_available_amount(&advertisement_id, &amount)
                .await
            {
                tracing::error!(
                    "Failed to refund amount {} to advertisement {}: {}",
                    amount,
                    advertisement_id,
                    refund_err
                );
            }
            tracing::error!("Failed to save buy order: {}", save_err);
            return Err(ApiError::InternalServerError(format!(
                "Failed to save buy order: {}",
                save_err
            )));
        }

        // and possibly publishing an event.

        Ok(buy) // Return the created buy order
    }

    /// Get a buy by ID
    pub async fn get_by_id(&self, buy_id: BuyId) -> Result<Option<Buy>, ApiError> {
        self.buy_repository
            .find_by_id(&buy_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find buy {}: {}", buy_id, e);
                ApiError::InternalServerError(format!("Failed to find buy: {}", e))
            })
    }

    /// Get buys by status
    pub async fn get_buys_by_status(&self, status: &BuyStatus) -> Result<Vec<Buy>, ApiError> {

        self.buy_repository
            .find_by_status(&status)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find buys by status {}", e);
                ApiError::InternalServerError(format!("Failed to find buys by status: {}", e))
            })
    }

    pub async fn get_buys_by_advertisement_id(&self, advertisement_id: AdvertisementId) -> Result<Vec<Buy>, ApiError> {
        self.buy_repository
            .find_by_advertisement_id(&advertisement_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find buys by advertisement ID {}: {}", advertisement_id.to_string(), e);
                ApiError::InternalServerError(format!("Failed to find buys by advertisement ID: {}", e))
            })
    }

    pub async fn get_buys_by_address_paginated(
        &self,
        address: CryptoAddress,
        skip: u64,
        limit: u64,
        sort_by: Option<String>,
        sort_order: Option<i32>,
    ) -> Result<Vec<Buy>, ApiError> {
        self.buy_repository
            .find_by_buyer_address_paginated(&address, skip, limit, sort_by, sort_order)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find buys by address {} with pagination: {}", address.as_str(), e);
                ApiError::InternalServerError(format!("Failed to find buys by address with pagination: {}", e))
            })
    }

    // pub async fn confirm(
    //     &self,
    //     buy_id: BuyId,
    //     address_buy: CryptoAddress,
    //     confirmation_code: String,
    // ) -> Result<Buy, ApiError> {
    //     // Validate confirmation code
    //     if confirmation_code.is_empty() {
    //         return Err(ApiError::BadRequest(
    //             "Confirmation code must be provided".to_string(),
    //         ));
    //     }

    //     // Find the buy order
    //     let mut buy = self
    //         .buy_repository
    //         .find_by_id(&buy_id)
    //         .await
    //         .map_err(|e| ApiError::InternalServerError(format!("Failed to find buy order: {}", e)))?
    //         .ok_or(ApiError::NotFound)?;

    //     if buy.address_buy != address_buy {
    //         return Err(ApiError::Unauthorized);
    //     }

    //     // verify if the status of buy is pending
    //     if buy.status != BuyStatus::Pending {
    //         return Err(ApiError::BadRequest("Buy order is not pending".to_string()));
    //     }

    //     // get the advertisement
    //     let advertisement = self
    //         .advertisement_repository
    //         .find_by_id(&buy.advertisement_id)
    //         .await
    //         .map_err(|e| {
    //             ApiError::InternalServerError(format!("Failed to find advertisement: {}", e))
    //         })?
    //         .ok_or(ApiError::NotFound)?;

    //     // get the invite by address
    //     let seller_stacks_address = StacksAddress::from_string(advertisement.seller_address);
    //     let invite = self
    //         .invite_repository
    //         .find_by_address(&seller_stacks_address)
    //         .await
    //         .map_err(|e| ApiError::InternalServerError(format!("Failed to find invite: {}", e)))?
    //         .ok_or(ApiError::NotFound)?;

    //     // Download certificate from GCS
    //     let gcs_manager = GcsManager::new().await.map_err(|e| {
    //         tracing::error!("Failed to initialize GCS manager: {}", e);
    //         ApiError::InternalServerError(
    //             "Failed to access banking credentials storage".to_string(),
    //         )
    //     })?;

    //     let certificate_gcs_path = invite.certificate_gcs_path.as_ref().ok_or_else(|| {
    //         ApiError::BadRequest("No certificate found for this seller".to_string())
    //     })?;

    //     let certificate_data = gcs_manager
    //         .download_certificate(certificate_gcs_path)
    //         .await
    //         .map_err(|e| {
    //             tracing::error!("Failed to download certificate from GCS: {}", e);
    //             ApiError::InternalServerError("Failed to retrieve banking credentials".to_string())
    //         })?;

    //     // Create EfiPayClient
    //     let base_url = "https://pix.api.efipay.com.br".to_string();

    //     let client_id = invite.client_id.ok_or_else(|| {
    //         ApiError::BadRequest("No client ID found for this seller".to_string())
    //     })?;

    //     let client_secret = invite.client_secret.ok_or_else(|| {
    //         ApiError::BadRequest("No client secret found for this seller".to_string())
    //     })?;

    //     let efi_client = EfiPayClient::new(base_url, client_id, client_secret, certificate_data)
    //         .map_err(|e| {
    //             tracing::error!("Failed to create EFI Pay client: {:?}", e);
    //             ApiError::InternalServerError("Failed to initialize banking client".to_string())
    //         })?;
    //     // Authenticate with EFI Pay
    //     let oauth_response = efi_client.authenticate().await.map_err(|e| {
    //         tracing::error!("EFI Pay authentication failed: {:?}", e);
    //         ApiError::BadRequest(
    //             "Failed to authenticate with bank. Please check your banking credentials."
    //                 .to_string(),
    //         )
    //     })?;

    //     let start_date: String = buy.created_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    //     let end_date: String = chrono::Utc::now()
    //         .format("%Y-%m-%dT%H:%M:%S%.3fZ")
    //         .to_string();

    //     // get the list of pix received
    //     let pix_received = efi_client
    //         .query_pix(&oauth_response.access_token, &start_date, &end_date)
    //         .await
    //         .map_err(|e| {
    //             tracing::error!("Failed to get PIX received: {:?}", e);
    //             ApiError::InternalServerError("Failed to retrieve PIX received".to_string())
    //         })?;

    //     // Convert amount (sats) to BTC and multiply by price (in cents) to get total in cents
    //     // Then convert to BRL string format
    //     let total_cents = (buy.amount * buy.price) / 100_000_000; // amount in sats to BTC, then multiply by price in cents
    //     let value = format!("{:.2}", total_cents as f64 / 100.0); // Convert cents to BRL with 2 decimal places

    //     // verify if any pix end contains at the end it the confirmation_code
    //     if !pix_received.pix.iter().any(|pix| {
    //         pix.valor == value && pix.end_to_end_id.to_string().ends_with(&confirmation_code)
    //     }) {
    //         return Err(ApiError::BadRequest(
    //             "Invalid confirmation code".to_string(),
    //         ));
    //     }

    //     // If all checks pass, confirm the buy order
    //     buy.status = BuyStatus::Completed;

    //     self.buy_repository.save(&buy).await.map_err(|e| {
    //         ApiError::InternalServerError(format!("Failed to update buy order: {}", e))
    //     })?;

    //     tracing::warn!("Buy order completed successfully - TO-DO: Implement the transfer of the tokens for the buyer");

    //     Ok(buy)
    // }

    /// Mark a buy as paid
    pub async fn mark_as_paid(
        &self,
        buy_id: BuyId,
        pix_confirmation_code: Option<String>,
    ) -> Result<Buy, ApiError> {
        // Call the repository to mark as paid
        let updated_buy = self.buy_repository.mark_as_paid(&buy_id, pix_confirmation_code).await
            .map_err(|e| {
                tracing::error!("Failed to mark buy as paid: {}", e);
                ApiError::InternalServerError(format!("Failed to mark buy as paid: {}", e))
            })?
            .ok_or(ApiError::NotFound)?;

        Ok(updated_buy)
    }

    /// Expires a buy and refunds the amount to the advertisement if successful
    pub async fn expire_buy(&self, buy: &Buy) -> Result<Option<Buy>, ApiError> {
        // Call the repository's expire function
        let expired_buy = self.buy_repository.expire(&buy.id).await.map_err(|e| {
            tracing::error!("Failed to expire buy {}: {}", buy.id, e);
            ApiError::InternalServerError(format!("Failed to expire buy: {}", e))
        })?;

        // If a buy was expired (returned), refund the amount to the advertisement
        if let Some(ref updated_buy) = expired_buy {
            if let Err(refund_err) = self
                .advertisement_repository
                .refund_available_amount(&updated_buy.advertisement_id, &updated_buy.amount)
                .await
            {
                tracing::error!(
                    "Failed to refund amount {} to advertisement {} after expiring buy {}: {}",
                    updated_buy.amount,
                    updated_buy.advertisement_id,
                    updated_buy.id,
                    refund_err
                );
                // Note: The buy is already expired in the database, so we don't return an error
                // but we log it for monitoring
            }
        }

        Ok(expired_buy)
    }

    /// Cancels a buy and refunds the amount to the advertisement if successful
    pub async fn cancel_buy(&self, buy_id: BuyId, address_buy: CryptoAddress) -> Result<Buy, ApiError> {
        // Call the repository's cancel function (atomic operation)
        let cancelled_buy = self.buy_repository.cancel(&buy_id, &address_buy).await.map_err(|e| {
            tracing::error!("Failed to cancel buy {}: {}", buy_id, e);
            ApiError::InternalServerError(format!("Failed to cancel buy: {}", e))
        })?
        .ok_or_else(|| {
            ApiError::BadRequest(
                "Buy not found, does not belong to this address, or is not in pending status".to_string()
            )
        })?;

        // Refund the amount to the advertisement
        if let Err(refund_err) = self
            .advertisement_repository
            .refund_available_amount(&cancelled_buy.advertisement_id, &cancelled_buy.amount)
            .await
        {
            tracing::error!(
                "Failed to refund amount {} to advertisement {} after cancelling buy {}: {}",
                cancelled_buy.amount,
                cancelled_buy.advertisement_id,
                cancelled_buy.id,
                refund_err
            );
            // Note: The buy is already cancelled in the database, so we don't return an error
            // but we log it for monitoring
        }

        Ok(cancelled_buy)
    }

    /// Processes pending buys older than 15 minutes and expires them
    pub async fn process_pending(&self) -> Result<(), ApiError> {
        // Find all pending buys older than 15 minutes
        let old_pending_buys = self
            .buy_repository
            .find_pending_older_than_minutes(15)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find pending buys older than 15 minutes: {}", e);
                ApiError::InternalServerError(format!("Failed to find old pending buys: {}", e))
            })?;

        if old_pending_buys.is_empty() {
            return Ok(());
        }

        let mut expired_count = 0;
        let mut error_count = 0;

        // Process each old pending buy
        for buy in old_pending_buys {
            match self.expire_buy(&buy).await {
                Ok(Some(_expired_buy)) => {
                    expired_count += 1;
                }
                Ok(None) => {
                    tracing::warn!(
                        "Buy {} was not expired (possibly already expired or completed)",
                        buy.id
                    );
                }
                Err(e) => {
                    error_count += 1;
                    tracing::error!("Failed to expire buy {}: {}", buy.id, e);
                    // Continue processing other buys even if one fails
                }
            }
        }

        // Return error only if all operations failed
        if error_count > 0 && expired_count == 0 {
            return Err(ApiError::InternalServerError(
                "Failed to expire any pending buys".to_string(),
            ));
        }

        Ok(())
    }

    /// Verify payment for a buy by querying PIX transactions
    /// 
    /// This function:
    /// 1. Loads the advertisement related to the buy
    /// 2. Uses efi_client.query_pix with date range from buy.created_at to buy.updated_at
    /// 3. Searches for PIX transactions with valor equal to buy.pay_value and end_to_end_id ending with buy.pix_confirmation_code
    /// 4. If found, changes buy status to PaymentConfirmed and stores the complete pix_end_to_end_id
    /// 5. Otherwise, increments buy.pix_verification_attempts
    /// 
    /// Note: This function logs all errors but does not return them
    pub async fn payment_verification(&self, buy: &Buy) {
        // Load the advertisement related to this buy
        let advertisement = match self.advertisement_repository.find_by_id(&buy.advertisement_id).await {
            Ok(Some(ad)) => ad,
            Ok(None) => {
                tracing::error!("Advertisement {} not found for buy {}", buy.advertisement_id, buy.id);
                return;
            }
            Err(e) => {
                tracing::error!("Failed to find advertisement {}: {}", buy.advertisement_id, e);
                return;
            }
        };

        // Get the invite by seller address to get EFI credentials
        let seller_stacks_address = StacksAddress::from_string(advertisement.seller_address);

        // Set date range for PIX query: from buy created_at to buy updated_at
        let start_date = buy.created_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
        let end_date = buy.updated_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

        // Query PIX transactions using the service (handles client creation, auth, and query)
        let pix_received = match self.efi_pay_service.query_pix(&seller_stacks_address, &start_date, &end_date).await {
            Ok(pix) => pix,
            Err(e) => {
                tracing::error!("Failed to query PIX for seller {}: {:?}", seller_stacks_address, e);

                // Create Trello card to report the error
                let trello_config = TrelloConfig::new(
                    self.config.trello_api_key.clone(),
                    self.config.trello_token.clone(),
                    self.config.trello_list_id.clone(),
                );
                if let Err(trello_err) = TrelloCardService::new(trello_config).create_card(
                    format!("B2PIX - Buy {} PIX Query Error", buy.id),
                    format!(
                        "🚨 ERROR QUERYING PIX TRANSACTIONS\n\n\
                        Buy ID: {}\n\
                        Advertisement ID: {}\n\
                        Amount: {} sats\n\
                        Pay Value: {} cents (R$ {:.2})\n\
                        PIX ID: {:?}\n\
                        Seller Address: {}\n\
                        Query Period:\n\
                          Start: {}\n\
                          End: {}\n\
                        Error: {:?}\n\n\
                        Status: Will retry on next verification cycle",
                        buy.id,
                        buy.advertisement_id,
                        buy.amount,
                        buy.pay_value,
                        buy.pay_value as f64 / 100.0,
                        buy.pix_confirmation_code,
                        seller_stacks_address,
                        start_date,
                        end_date,
                        e
                    )
                ).await {
                    tracing::error!("Failed to create Trello card for PIX query error on buy {}: {}", buy.id, trello_err);
                }

                // Return without incrementing attempts - will retry on next cycle
                return;
            }
        };

        // log all pix received for debugging
        for pix in &pix_received.pix {
            tracing::debug!("PIX transaction: end_to_end_id={}, valor={}, data_hora={}", 
                          pix.end_to_end_id, pix.valor, pix.horario);
        }

        // Convert pay_value (in cents) to BRL string format for comparison
        let expected_value = format!("{:.2}", buy.pay_value as f64 / 100.0);

        // Handle different cases based on whether we have a pix_confirmation_code or not
        let matching_pix = match buy.pix_confirmation_code.as_ref() {
            Some(confirmation_code) => {
                // Check if any PIX transaction matches our criteria (value + end_to_end_id)
                // Case-insensitive comparison for confirmation_code
                let confirmation_code_lower = confirmation_code.to_lowercase();
                pix_received.pix.iter().find(|pix| {
                    let value_matches = pix.valor == expected_value;
                    let end_to_end_matches = pix.end_to_end_id.to_lowercase().ends_with(&confirmation_code_lower);

                    tracing::debug!("PIX check for buy {}: valor={}, expected={}, end_to_end_id={}, expected_suffix={}, value_match={}, end_match={}",
                                  buy.id, pix.valor, expected_value, pix.end_to_end_id, confirmation_code, value_matches, end_to_end_matches);

                    value_matches && end_to_end_matches
                })
            }
            None => {
                // Collect all PIX transactions that match the value
                let value_matching_pix: Vec<_> = pix_received.pix.iter().filter(|pix| {
                    let value_matches = pix.valor == expected_value;

                    tracing::debug!("PIX check for buy {} (no confirmation code): valor={}, expected={}, value_match={}",
                                  buy.id, pix.valor, expected_value, value_matches);

                    value_matches
                }).collect();

                // If we found PIX transactions with matching value
                if !value_matching_pix.is_empty() {
                    // Check if there are multiple PIX with the same value
                    if value_matching_pix.len() > 1 {
                        tracing::error!("Found {} PIX transactions with matching value for buy {} but no confirmation code to confirm which one. Sending to dispute immediately.",
                                      value_matching_pix.len(), buy.id);

                        // Mark buy as in dispute immediately
                        match self.buy_repository.mark_as_in_dispute(&buy.id).await {
                            Ok(Some(_)) => {}
                            Ok(None) => {
                                tracing::error!("Buy {} not found when trying to mark as in dispute", buy.id);
                            }
                            Err(e) => {
                                tracing::error!("Failed to mark buy {} as in dispute: {}", buy.id, e);
                            }
                        }

                        // Build detailed PIX list for the Trello card
                        let mut pix_details = String::from("\n\n📋 ALL PIX TRANSACTIONS FOUND:\n");
                        pix_details.push_str(&format!("Total PIX transactions in period: {}\n\n", pix_received.pix.len()));

                        for (index, pix) in pix_received.pix.iter().enumerate() {
                            let is_matching = pix.valor == expected_value;
                            let marker = if is_matching { "⚠️ MATCHES VALUE" } else { "" };

                            pix_details.push_str(&format!(
                                "{}. {} {}\n   End-to-End ID: {}\n   Valor: {}\n   Horário: {}\n\n",
                                index + 1,
                                marker,
                                if is_matching { "⚠️" } else { "" },
                                pix.end_to_end_id,
                                pix.valor,
                                pix.horario
                            ));
                        }

                        // Create Trello card with detailed PIX information
                        let trello_config = TrelloConfig::new(
                            self.config.trello_api_key.clone(),
                            self.config.trello_token.clone(),
                            self.config.trello_list_id.clone(),
                        );
                        if let Err(e) = TrelloCardService::new(trello_config).create_card(
                            format!("B2PIX - Buy {} in Dispute (Multiple PIX Found)", buy.id),
                            format!(
                                "🚨 MULTIPLE PIX WITH SAME VALUE DETECTED\n\n\
                                Buy ID: {}\n\
                                Advertisement ID: {}\n\
                                Amount: {} sats\n\
                                Pay Value: {} cents (R$ {:.2})\n\
                                PIX Confirmation Code: None (NOT PROVIDED)\n\
                                Query Period:\n\
                                  Start: {}\n\
                                  End: {}\n\
                                Status: In Dispute - Found {} PIX transactions with matching value\n\
                                {}",
                                buy.id,
                                buy.advertisement_id,
                                buy.amount,
                                buy.pay_value,
                                buy.pay_value as f64 / 100.0,
                                start_date,
                                end_date,
                                value_matching_pix.len(),
                                pix_details
                            )
                        ).await {
                            tracing::error!("Failed to create Trello card for buy {} in dispute (multiple PIX found): {}", buy.id, e);
                        }

                        return; // Exit early since we handled this case
                    } else {
                        // Only one PIX found with matching value
                        let found_pix = value_matching_pix[0];
                        tracing::warn!("Found PIX with matching value for buy {} but no confirmation code to confirm. PIX end_to_end_id: {}",
                                      buy.id, found_pix.end_to_end_id);

                        // Mark buy as in dispute since we found a PIX but can't confirm it's the right one
                        match self.buy_repository.mark_as_in_dispute(&buy.id).await {
                            Ok(Some(_)) => {}
                            Ok(None) => {
                                tracing::error!("Buy {} not found when trying to mark as in dispute", buy.id);
                            }
                            Err(e) => {
                                tracing::error!("Failed to mark buy {} as in dispute: {}", buy.id, e);
                            }
                        }

                        // Build detailed PIX list for the Trello card
                        let mut pix_details = String::from("\n\n📋 ALL PIX TRANSACTIONS FOUND:\n");
                        pix_details.push_str(&format!("Total PIX transactions in period: {}\n\n", pix_received.pix.len()));

                        for (index, pix) in pix_received.pix.iter().enumerate() {
                            let is_matching = pix.valor == expected_value;
                            let marker = if is_matching { "⚠️ MATCHES VALUE" } else { "" };

                            pix_details.push_str(&format!(
                                "{}. {} {}\n   End-to-End ID: {}\n   Valor: {}\n   Horário: {}\n\n",
                                index + 1,
                                marker,
                                if is_matching { "⚠️" } else { "" },
                                pix.end_to_end_id,
                                pix.valor,
                                pix.horario
                            ));
                        }

                        let trello_config = TrelloConfig::new(
                            self.config.trello_api_key.clone(),
                            self.config.trello_token.clone(),
                            self.config.trello_list_id.clone(),
                        );
                        if let Err(e) = TrelloCardService::new(trello_config).create_card(
                            format!("B2PIX - Buy {} in Dispute (PIX Found)", buy.id),
                            format!(
                                "Buy ID: {}\n\
                                Advertisement ID: {}\n\
                                Amount: {} sats\n\
                                Pay Value: {} cents (R$ {:.2})\n\
                                PIX Confirmation Code: None (NOT PROVIDED)\n\
                                Query Period:\n\
                                  Start: {}\n\
                                  End: {}\n\
                                Found PIX Transaction: {} (valor: {})\n\
                                Status: In Dispute - Found PIX with matching value but no confirmation code to confirm\n\
                                {}",
                                buy.id,
                                buy.advertisement_id,
                                buy.amount,
                                buy.pay_value,
                                buy.pay_value as f64 / 100.0,
                                start_date,
                                end_date,
                                found_pix.end_to_end_id,
                                found_pix.valor,
                                pix_details
                            )
                        ).await {
                            tracing::error!("Failed to create Trello card for buy {} in dispute (PIX found): {}", buy.id, e);
                        }

                        return; // Exit early since we handled this case
                    }
                }

                // No PIX found with matching value, return None to continue with normal flow
                None
            }
        };

        if let Some(matching_pix) = matching_pix {
            // Mark buy as payment confirmed with the complete end-to-end transaction ID
            match self.buy_repository.mark_as_payment_confirmed_with_transaction(&buy.id, &matching_pix.end_to_end_id).await {
                Ok(Some(updated_buy)) => {
                    // Create PaymentRequest for the confirmed payment
                    let description = format!(
                        "Payment for Buy ID: {}\nAdvertisement ID: {}\nAmount: {} sats\nPay Value: {} cents\nPIX Confirmation Code: {:?}\nPIX Transaction: {}\nStatus: Payment confirmed via PIX verification",
                        updated_buy.id,
                        updated_buy.advertisement_id,
                        updated_buy.amount,
                        updated_buy.pay_value,
                        updated_buy.pix_confirmation_code,
                        matching_pix.end_to_end_id
                    );

                    match self.payment_request_service.create_payment_request(
                        SourceType::Buy,
                        updated_buy.id.as_object_id().clone(),
                        updated_buy.address_buy.as_str().to_string(),
                        updated_buy.amount as u64,
                        description,
                        true, // Attempt automatic payment first
                    ).await {
                        Ok(_payment_request) => {}
                        Err(e) => {
                            tracing::error!(
                                "Failed to create payment request for payment confirmed buy {}: {}",
                                updated_buy.id,
                                e
                            );
                        }
                    }
                }
                Ok(None) => {
                    tracing::error!("Buy {} not found when trying to mark as payment confirmed", buy.id);
                }
                Err(e) => {
                    tracing::error!("Failed to mark buy {} as payment confirmed: {}", buy.id, e);
                }
            }

            let trello_config = TrelloConfig::new(
                self.config.trello_api_key.clone(),
                self.config.trello_token.clone(),
                self.config.trello_list_id.clone(),
            );
            if let Err(e) = TrelloCardService::new(trello_config).create_card(
                format!("B2PIX - Buy {} Payment Confirmed", buy.id),
                format!("Buy ID: {}\nAdvertisement ID: {}\nAmount: {}\nPay Value: {}\nPIX Confirmation Code: {:?}\nPIX Transaction: {}\nStatus: Payment confirmed via PIX verification",
                    buy.id,
                    buy.advertisement_id,
                    buy.amount,
                    buy.pay_value,
                    buy.pix_confirmation_code,
                    matching_pix.end_to_end_id
                )
            ).await {
                tracing::error!("Failed to create Trello card for buy {} payment confirmation: {}", buy.id, e);
            }

        } else {
            let confirmation_code_info = match buy.pix_confirmation_code.as_ref() {
                Some(code) => format!("with confirmation code {}", code),
                None => "without confirmation code".to_string(),
            };

            tracing::warn!("No matching PIX transaction found for buy {} {}. Marking as in dispute immediately.",
                          buy.id, confirmation_code_info);

            // Mark buy as in dispute immediately (no retry attempts)
            match self.buy_repository.mark_as_in_dispute(&buy.id).await {
                Ok(Some(_)) => {}
                Ok(None) => {
                    tracing::error!("Buy {} not found when trying to mark as in dispute", buy.id);
                }
                Err(e) => {
                    tracing::error!("Failed to mark buy {} as in dispute: {}", buy.id, e);
                }
            }

            let dispute_reason = match buy.pix_confirmation_code.as_ref() {
                Some(_) => "In Dispute - No matching PIX transaction found",
                None => "In Dispute - No matching PIX transaction found (no confirmation code provided)",
            };

            // Build detailed PIX list for the Trello card
            let mut pix_details = String::from("\n\n📋 ALL PIX TRANSACTIONS FOUND:\n");
            pix_details.push_str(&format!("Total PIX transactions in period: {}\n\n", pix_received.pix.len()));

            for (index, pix) in pix_received.pix.iter().enumerate() {
                let is_matching = pix.valor == expected_value;
                let marker = if is_matching { "**⚠️ MATCHES VALUE**" } else { "" };

                pix_details.push_str(&format!(
                    "{}. {}\n   End-to-End ID: {}\n   Valor: {}{}{}\n   Horário: {}\n\n",
                    index + 1,
                    marker,
                    pix.end_to_end_id,
                    if is_matching { "**" } else { "" },
                    pix.valor,
                    if is_matching { "**" } else { "" },
                    pix.horario
                ));
            }

            let trello_config = TrelloConfig::new(
                self.config.trello_api_key.clone(),
                self.config.trello_token.clone(),
                self.config.trello_list_id.clone(),
            );
            if let Err(e) = TrelloCardService::new(trello_config).create_card(
                format!("B2PIX - Buy {} in Dispute", buy.id),
                format!("Buy ID: {}\nAdvertisement ID: {}\nAmount: {} sats\nPay Value: {} cents (R$ {:.2})\nPIX Confirmation Code: {:?}\nQuery Period:\n  Start: {}\n  End: {}\nStatus: {}{}",
                    buy.id,
                    buy.advertisement_id,
                    buy.amount,
                    buy.pay_value,
                    buy.pay_value as f64 / 100.0,
                    buy.pix_confirmation_code,
                    start_date,
                    end_date,
                    dispute_reason,
                    pix_details
                )
            ).await {
                tracing::error!("Failed to create Trello card for buy {} in dispute: {}", buy.id, e);
            }
        }
    }

    /// Mark a dispute as resolved in favor of the seller and refund the amount to the advertisement
    pub async fn mark_as_dispute_resolved_seller(&self, buy: &Buy) {
        // Update the buy status to DisputeResolvedSeller using repository
        let updated_buy = match self
            .buy_repository
            .mark_as_dispute_resolved_seller(&buy.id)
            .await
        {
            Ok(Some(buy)) => buy,
            Ok(None) => {
                tracing::error!(
                    "Buy {} not found when trying to mark as DisputeResolvedSeller",
                    buy.id
                );
                return;
            }
            Err(e) => {
                tracing::error!(
                    "Failed to update buy {} status to DisputeResolvedSeller: {}",
                    buy.id,
                    e
                );
                return;
            }
        };

        // Refund the amount to the advertisement using the updated buy data
        if let Err(refund_err) = self
            .advertisement_repository
            .refund_available_amount(&updated_buy.advertisement_id, &updated_buy.amount)
            .await
        {
            tracing::error!(
                "Failed to refund amount {} to advertisement {} after resolving dispute for buy {}: {}",
                updated_buy.amount,
                updated_buy.advertisement_id,
                updated_buy.id,
                refund_err
            );
            return;
        }
    }


    pub async fn mark_as_dispute_resolved_buyer(&self, buy: &Buy) {
        // Update the buy status to DisputeResolvedBuyer using repository
        let updated_buy = match self
            .buy_repository
            .mark_as_dispute_resolved_buyer(&buy.id)
            .await
        {
            Ok(Some(buy)) => buy,
            Ok(None) => {
                tracing::error!(
                    "Buy {} not found when trying to mark as DisputeResolvedBuyer",
                    buy.id
                );
                return;
            }
            Err(e) => {
                tracing::error!(
                    "Failed to update buy {} status to DisputeResolvedBuyer: {}",
                    buy.id,
                    e
                );
                return;
            }
        };
    }

    /// Mark a buy as dispute favor buyer (change from in_dispute to dispute_favor_buyer)
    pub async fn mark_as_dispute_favor_buyer(&self, buy_id: BuyId) -> Result<Buy, BuyError> {
        match self.buy_repository.mark_as_dispute_favor_buyer(&buy_id).await {
            Ok(Some(buy)) => {
                // Create PaymentRequest for the refund using the service
                let description = format!(
                    "Refund for Buy ID: {}\nAdvertisement ID: {}\nAmount: {} sats\nPay Value: {} cents\nPIX Confirmation Code: {:?}\nStatus: Dispute resolved in favor of buyer",
                    buy.id,
                    buy.advertisement_id,
                    buy.amount,
                    buy.pay_value,
                    buy.pix_confirmation_code
                );

                match self.payment_request_service.create_payment_request(
                    SourceType::Buy,
                    buy.id.as_object_id().clone(),
                    buy.address_buy.as_str().to_string(),
                    buy.amount as u64,
                    description,
                    true, // Attempt automatic payment first
                ).await {
                    Ok(_payment_request) => {}
                    Err(e) => {
                        tracing::error!(
                            "Failed to create payment request for dispute favor buyer {}: {}",
                            buy.id,
                            e
                        );
                    }
                }
                
                // Create Trello card for tracking
                // if let Err(e) = TrelloCardService::new().create_card(
                //     format!("B2PIX - Buy {} Dispute Favor Buyer", buy.id),
                //     format!("Buy ID: {}\nAdvertisement ID: {}\nAmount: {}\nPay Value: {}\nStatus: Dispute resolved in favor of buyer", 
                //         buy.id, 
                //         buy.advertisement_id, 
                //         buy.amount, 
                //         buy.pay_value
                //     )
                // ).await {
                //     tracing::error!("Failed to create Trello card for buy {} dispute favor buyer: {}", buy.id, e);
                // }

                Ok(buy)
            }
            Ok(None) => {
                tracing::error!("Buy {} not found or not in dispute status when trying to mark as dispute favor buyer", buy_id);
                Err(BuyError::NotFound)
            }
            Err(e) => {
                tracing::error!("Failed to mark buy {} as dispute favor buyer: {}", buy_id, e);
                Err(e)
            }
        }
    }

    /// Mark a buy as dispute favor seller (change from in_dispute to dispute_favor_seller)
    pub async fn mark_as_dispute_favor_seller(&self, buy_id: BuyId) -> Result<Buy, BuyError> {
        match self.buy_repository.mark_as_dispute_favor_seller(&buy_id).await {
            Ok(Some(buy)) => {
                // Create Trello card for tracking
                let trello_config = TrelloConfig::new(
                    self.config.trello_api_key.clone(),
                    self.config.trello_token.clone(),
                    self.config.trello_list_id.clone(),
                );
                if let Err(e) = TrelloCardService::new(trello_config).create_card(
                    format!("B2PIX - Buy {} Dispute Favor Seller", buy.id),
                    format!("Buy ID: {}\nAdvertisement ID: {}\nAmount: {}\nPay Value: {}\nStatus: Dispute resolved in favor of seller",
                        buy.id,
                        buy.advertisement_id,
                        buy.amount,
                        buy.pay_value
                    )
                ).await {
                    tracing::error!("Failed to create Trello card for buy {} dispute favor seller: {}", buy.id, e);
                }

                Ok(buy)
            }
            Ok(None) => {
                tracing::error!("Buy {} not found or not in dispute status when trying to mark as dispute favor seller", buy_id);
                Err(BuyError::NotFound)
            }
            Err(e) => {
                tracing::error!("Failed to mark buy {} as dispute favor seller: {}", buy_id, e);
                Err(e)
            }
        }
    }

    /// Process dispute favor seller for all buys with "DisputeFavorSeller" status
    /// 
    /// This function:
    /// 1. Loads all buys with status "DisputeFavorSeller"
    /// 2. Calls mark_as_dispute_resolved_seller for each buy
    ///
    /// Note: This function logs all errors but does not return them
    pub async fn process_dispute_favor_seller(&self) {
        // Find all buys with "DisputeFavorSeller" status
        let dispute_favor_seller_buys = match self.buy_repository.find_by_status(&BuyStatus::DisputeFavorSeller).await {
            Ok(buys) => buys,
            Err(e) => {
                tracing::error!("Failed to find buys with DisputeFavorSeller status: {}", e);
                return;
            }
        };

        if dispute_favor_seller_buys.is_empty() {
            return;
        }

        // Process each dispute favor seller buy
        for buy in dispute_favor_seller_buys {
            // Call mark_as_dispute_resolved_seller for this buy
            self.mark_as_dispute_resolved_seller(&buy).await;
        }
    }
}
