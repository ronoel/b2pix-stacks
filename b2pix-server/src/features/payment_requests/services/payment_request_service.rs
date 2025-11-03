use std::sync::Arc;
use mongodb::bson::oid::ObjectId;

use crate::config::Config;
use crate::features::payment_requests::domain::entities::{PaymentRequest, PaymentRequestId, PaymentStatus, SourceType};
use crate::features::payment_requests::domain::events::PaymentRequestCreatedEvent;
use crate::features::payment_requests::ports::{PaymentRequestRepository, PaymentRequestError};
use crate::services::bolt_transaction_b2pix::validate_and_broadcast_transaction;
use crate::events::publisher::EventPublisher;
use crate::events::publisher_ext::EventPublisherExt;

pub struct PaymentRequestService {
    payment_request_repository: Arc<dyn PaymentRequestRepository>,
    event_publisher: Arc<EventPublisher>,
    config: Arc<Config>,
}

impl PaymentRequestService {
    pub fn new(
        payment_request_repository: Arc<dyn PaymentRequestRepository>,
        event_publisher: Arc<EventPublisher>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            payment_request_repository,
            event_publisher,
            config,
        }
    }

    pub async fn list_payment_requests(
        &self,
        page: u64,
        limit: u64,
        status_filter: Option<Vec<PaymentStatus>>,
        sort_order: String,
    ) -> Result<(Vec<PaymentRequest>, bool), PaymentRequestError> {
        // Fetch one extra to check if there are more results
        let fetch_limit = limit + 1;

        let mut results = self.payment_request_repository
            .list(page, fetch_limit, status_filter, &sort_order)
            .await?;

        let has_more = results.len() > limit as usize;

        // Remove the extra item if present
        if has_more {
            results.pop();
        }

        Ok((results, has_more))
    }

    pub async fn get_payment_request_by_id(
        &self,
        id: &PaymentRequestId,
    ) -> Result<Option<PaymentRequest>, PaymentRequestError> {
        self.payment_request_repository.find_by_id(id).await
    }

    pub async fn process_payment(
        &self,
        id: &PaymentRequestId,
        transaction: String,
    ) -> Result<PaymentRequest, PaymentRequestError> {
        // Atomically update status from waiting/failed to processing
        let allowed_statuses = vec![PaymentStatus::Waiting, PaymentStatus::Failed];
        let payment_request = self.payment_request_repository
            .update_status_atomic(id, allowed_statuses, PaymentStatus::Processing)
            .await?
            .ok_or(PaymentRequestError::NotFound)?;

        // Validate and broadcast transaction
        match validate_and_broadcast_transaction(
            transaction,
            payment_request.receiver_address().to_string(),
            payment_request.amount() as u128,
            Arc::clone(&self.config),
        ).await {
            Ok(tx_id) => {
                // Success - update to broadcast status and set tx_id
                let mut updated_payment = payment_request.clone();
                updated_payment.set_status(PaymentStatus::Broadcast);
                updated_payment.set_blockchain_tx_id(tx_id);
                self.payment_request_repository.save(&updated_payment).await?;
                Ok(updated_payment)
            }
            Err(e) => {
                tracing::error!("Failed to broadcast payment transaction for {}: {}", id.as_str(), e);
                // Failed - update to failed status
                let mut updated_payment = payment_request.clone();
                updated_payment.set_status(PaymentStatus::Failed);
                self.payment_request_repository.save(&updated_payment).await?;
                Err(PaymentRequestError::Internal(format!("Transaction broadcast failed: {}", e)))
            }
        }
    }

    pub async fn get_payment_requests_by_source(
        &self,
        source_type: &SourceType,
        source_id: &ObjectId,
    ) -> Result<Vec<PaymentRequest>, PaymentRequestError> {
        self.payment_request_repository
            .find_by_source(source_type, source_id)
            .await
    }

    /// Create a new payment request and Trello card
    pub async fn create_payment_request(
        &self,
        source_type: SourceType,
        source_id: ObjectId,
        receiver_address: String,
        amount: u64,
        description: String,
    ) -> Result<PaymentRequest, PaymentRequestError> {
        // Create the payment request
        let payment_request = PaymentRequest::new(
            source_type.clone(),
            source_id.clone(),
            receiver_address.clone(),
            amount,
            description.clone(),
        );

        // Save to repository
        self.payment_request_repository.save(&payment_request).await?;

        // Publish PaymentRequestCreated event
        let event = PaymentRequestCreatedEvent {
            payment_request_id: payment_request.id().as_str().to_string(),
            source_type: source_type.to_string(),
            source_id: source_id.to_string(),
            receiver_address,
            amount,
            description,
            status: payment_request.status().to_string(),
        };

        if let Err(e) = self.event_publisher
            .publish_domain_event(&event, "PaymentRequestService::create_payment_request")
            .await 
        {
            tracing::warn!("Failed to publish payment request created event: {:?}", e);
        }

        Ok(payment_request)
    }
}
