use std::sync::Arc;
use tokio::time::Duration;
use tracing;
use crate::common::periodic_task::PeriodicTaskHandler;
use crate::features::payment_requests::{
    domain::entities::{PaymentRequestId, PaymentStatus},
    ports::repositories::PaymentRequestRepository,
};
use crate::services::b2pix_transfer_service::B2PixTransferService;
use crate::config::Config;

/// Handler for retrying PaymentRequests stuck in PendingAutomaticPayment status
/// This provides resilience against server crashes and event processing failures
pub struct PendingAutomaticPaymentRetryTaskHandler {
    payment_request_repository: Arc<dyn PaymentRequestRepository>,
    b2pix_transfer_service: Arc<B2PixTransferService>,
    config: Arc<Config>,
    stuck_timeout_minutes: i64,
}

impl PendingAutomaticPaymentRetryTaskHandler {
    pub fn new(
        payment_request_repository: Arc<dyn PaymentRequestRepository>,
        b2pix_transfer_service: Arc<B2PixTransferService>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            payment_request_repository,
            b2pix_transfer_service,
            config,
            stuck_timeout_minutes: 5, // Default: consider stuck after 5 minutes
        }
    }

    /// Process a single stuck payment request
    async fn process_stuck_payment(&self, payment_request_id: &PaymentRequestId) {
        tracing::info!(
            payment_request_id = %payment_request_id.as_str(),
            "Retrying stuck automatic payment"
        );

        // Atomically claim the payment for processing - prevents dual spending
        // Only updates if status is still PendingAutomaticPayment
        let mut payment_request = match self
            .payment_request_repository
            .update_status_atomic(
                payment_request_id,
                vec![PaymentStatus::PendingAutomaticPayment],
                PaymentStatus::Processing,
            )
            .await
        {
            Ok(Some(pr)) => pr,
            Ok(None) => {
                tracing::debug!(
                    payment_request_id = %payment_request_id.as_str(),
                    "Payment request already being processed by another handler, skipping to prevent dual spending"
                );
                return;
            }
            Err(e) => {
                tracing::error!(
                    payment_request_id = %payment_request_id.as_str(),
                    error = %e,
                    "Failed to atomically claim payment request for retry"
                );
                return;
            }
        };

        // Attempt automatic transfer
        match self
            .b2pix_transfer_service
            .transfer(
                payment_request.receiver_address().to_string(),
                payment_request.amount(),
            )
            .await
        {
            Ok(txid) => {
                // Success - update to Broadcast status
                tracing::info!(
                    payment_request_id = %payment_request_id.as_str(),
                    txid = %txid,
                    "Automatic payment retry successful"
                );

                payment_request.set_status(PaymentStatus::Broadcast);
                payment_request.set_blockchain_tx_id(txid);

                if let Err(e) = self.payment_request_repository.save(&payment_request).await {
                    tracing::error!(
                        payment_request_id = %payment_request_id.as_str(),
                        error = %e,
                        "Failed to save payment request after successful transfer"
                    );
                }
            }
            Err(e) => {
                // Failed - mark original as Failed and create NEW PaymentRequest for manual processing
                let error_message = e.to_string();
                tracing::warn!(
                    payment_request_id = %payment_request_id.as_str(),
                    error = %error_message,
                    "Automatic payment retry failed, marking as Failed (new manual PaymentRequest will be created by automatic_payment_handler)"
                );

                // Mark original as Failed
                payment_request.set_status(PaymentStatus::Failed);
                payment_request.set_failure_reason(format!(
                    "Automatic payment retry failed: {}",
                    error_message
                ));

                if let Err(e) = self.payment_request_repository.save(&payment_request).await {
                    tracing::error!(
                        payment_request_id = %payment_request_id.as_str(),
                        error = %e,
                        "Failed to save payment request as Failed"
                    );
                }

                // Note: We do NOT create a new PaymentRequest here because the event handler
                // or another retry cycle will handle it. This prevents creating duplicate requests.
            }
        }
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for PendingAutomaticPaymentRetryTaskHandler {
    fn name(&self) -> &str {
        "Pending Automatic Payment Retry"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(120) // Run every 2 minutes
    }

    async fn execute(&self) -> anyhow::Result<()> {
        tracing::debug!("Running periodic pending automatic payment retry task");

        // Find all PaymentRequests with PendingAutomaticPayment status
        let pending_payments = self
            .payment_request_repository
            .find_by_status(&PaymentStatus::PendingAutomaticPayment)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find pending automatic payments: {}", e);
                anyhow::anyhow!("Failed to find pending automatic payments: {}", e)
            })?;

        if pending_payments.is_empty() {
            return Ok(());
        }

        // Filter payments older than timeout threshold
        let now = chrono::Utc::now();
        let timeout = chrono::Duration::minutes(self.stuck_timeout_minutes);

        let mut stuck_count = 0;
        for payment_request in pending_payments {
            let age = now - *payment_request.created_at();

            if age > timeout {
                stuck_count += 1;
                tracing::warn!(
                    payment_request_id = %payment_request.id().as_str(),
                    age_minutes = %age.num_minutes(),
                    "Found stuck automatic payment, retrying"
                );

                self.process_stuck_payment(payment_request.id()).await;
            }
        }

        if stuck_count > 0 {
            tracing::info!(
                "Processed {} stuck automatic payment(s)",
                stuck_count
            );
        }

        Ok(())
    }
}
