use std::sync::Arc;
use tokio::time::Duration;
use tracing;
use crate::common::periodic_task::PeriodicTaskHandler;
use crate::features::payment_requests::{
    domain::entities::PaymentStatus,
    ports::repositories::PaymentRequestRepository,
};
use crate::config::Config;
use crate::infrastructure::blockchain::stacks::{TransactionStatus, TransactionVerifier};

/// Handler for periodically verifying payment transaction status for PaymentRequests in Broadcast status
pub struct PaymentRequestTransactionVerifierTaskHandler {
    payment_request_repository: Arc<dyn PaymentRequestRepository>,
    config: Arc<Config>,
}

impl PaymentRequestTransactionVerifierTaskHandler {
    pub fn new(
        payment_request_repository: Arc<dyn PaymentRequestRepository>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            payment_request_repository,
            config,
        }
    }

    /// Fetch all payment requests with Broadcast status
    async fn fetch_broadcast_payment_requests(&self) -> anyhow::Result<Vec<crate::features::payment_requests::domain::entities::PaymentRequest>> {
        self.payment_request_repository
            .find_by_status(&PaymentStatus::Broadcast)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find payment requests with Broadcast status: {}", e);
                anyhow::anyhow!("Failed to find payment requests with Broadcast status: {}", e)
            })
    }

    /// Verify a single payment request transaction
    async fn verify_payment_transaction(
        &self,
        payment_request: &crate::features::payment_requests::domain::entities::PaymentRequest,
        transaction_verifier: &TransactionVerifier,
    ) {
        // Check if payment request has a blockchain transaction ID
        let transaction_id = match payment_request.blockchain_tx_id() {
            Some(id) => id,
            None => {
                tracing::warn!(
                    "PaymentRequest {} has Broadcast status but no blockchain transaction ID",
                    payment_request.id().as_str()
                );
                return;
            }
        };

        match transaction_verifier
            .verify_transaction_status(transaction_id)
            .await
        {
            Ok(response) => {
                self.handle_transaction_status(payment_request, transaction_id, response.status).await;
            }
            Err(e) => {
                tracing::error!(
                    "Failed to verify payment transaction status for {}: {:?}",
                    transaction_id,
                    e
                );
            }
        }
    }

    /// Handle transaction status and update payment request accordingly
    async fn handle_transaction_status(
        &self,
        payment_request: &crate::features::payment_requests::domain::entities::PaymentRequest,
        transaction_id: &str,
        status: TransactionStatus,
    ) {
        match status {
            TransactionStatus::Pending => {
                tracing::info!(
                    "Payment transaction {} is still pending for PaymentRequest {}",
                    transaction_id,
                    payment_request.id().as_str()
                );
                // Do not change status - keep as Broadcast
            }
            TransactionStatus::Success => {
                self.update_to_confirmed(payment_request, transaction_id).await;
            }
            TransactionStatus::AbortByPostCondition
            | TransactionStatus::AbortByResponse
            | TransactionStatus::DroppedReplaceByFee
            | TransactionStatus::UnknownStatus => {
                self.update_to_failed(payment_request, transaction_id, status).await;
            }
        }
    }

    /// Update payment request status to Confirmed
    async fn update_to_confirmed(
        &self,
        payment_request: &crate::features::payment_requests::domain::entities::PaymentRequest,
        transaction_id: &str,
    ) {
        tracing::info!(
            "Payment transaction {} succeeded for PaymentRequest {}",
            transaction_id,
            payment_request.id().as_str()
        );

        let mut updated_payment = payment_request.clone();
        updated_payment.set_status(PaymentStatus::Confirmed);

        if let Err(e) = self
            .payment_request_repository
            .save(&updated_payment)
            .await
        {
            tracing::error!(
                "Failed to update PaymentRequest {} status to Confirmed: {}",
                payment_request.id().as_str(),
                e
            );
        }
    }

    /// Update payment request status to Failed
    async fn update_to_failed(
        &self,
        payment_request: &crate::features::payment_requests::domain::entities::PaymentRequest,
        transaction_id: &str,
        status: TransactionStatus,
    ) {
        tracing::warn!(
            "Payment transaction {} failed for PaymentRequest {} with status: {:?}",
            transaction_id,
            payment_request.id().as_str(),
            status
        );

        let mut updated_payment = payment_request.clone();
        updated_payment.set_status(PaymentStatus::Failed);

        if let Err(e) = self
            .payment_request_repository
            .save(&updated_payment)
            .await
        {
            tracing::error!(
                "Failed to update PaymentRequest {} status to Failed: {}",
                payment_request.id().as_str(),
                e
            );
            return;
        }

        // Create a new payment request with the same information
        let new_payment_request = crate::features::payment_requests::domain::entities::PaymentRequest::new(
            payment_request.source_type().clone(),
            payment_request.source_id().clone(),
            payment_request.receiver_address().to_string(),
            payment_request.amount(),
            payment_request.description.clone(),
        );

        tracing::info!(
            "Creating new PaymentRequest {} to replace failed PaymentRequest {}",
            new_payment_request.id().as_str(),
            payment_request.id().as_str()
        );

        if let Err(e) = self
            .payment_request_repository
            .save(&new_payment_request)
            .await
        {
            tracing::error!(
                "Failed to create new PaymentRequest to replace {}: {}",
                payment_request.id().as_str(),
                e
            );
        }
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for PaymentRequestTransactionVerifierTaskHandler {
    fn name(&self) -> &str {
        "Payment Request Transaction Verifier"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(30) // 30 seconds interval
    }

    async fn execute(&self) -> anyhow::Result<()> {
        tracing::debug!("Running periodic payment request transaction verification task");

        let payment_requests_to_verify = self.fetch_broadcast_payment_requests().await?;

        if payment_requests_to_verify.is_empty() {
            return Ok(());
        }

        tracing::debug!(
            "Found {} payment requests with Broadcast status to verify transactions",
            payment_requests_to_verify.len()
        );

        let transaction_verifier = TransactionVerifier::from_config(&self.config);

        for payment_request in payment_requests_to_verify {
            self.verify_payment_transaction(&payment_request, &transaction_verifier).await;
        }

        Ok(())
    }
}
