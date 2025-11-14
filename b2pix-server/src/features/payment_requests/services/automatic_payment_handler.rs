use std::sync::Arc;
use async_trait::async_trait;

use crate::events::typed_handler::TypedEventHandler;
use crate::events::handlers::EventHandlerError;
use crate::features::payment_requests::domain::entities::{PaymentRequestId, PaymentStatus};
use crate::features::payment_requests::domain::events::PaymentRequestCreatedEvent;
use crate::features::payment_requests::ports::PaymentRequestRepository;
use crate::features::payment_requests::services::PaymentRequestService;
use crate::services::b2pix_transfer_service::B2PixTransferService;

pub struct AutomaticPaymentHandler {
    payment_request_repository: Arc<dyn PaymentRequestRepository>,
    payment_request_service: Arc<PaymentRequestService>,
    b2pix_transfer_service: Arc<B2PixTransferService>,
}

impl AutomaticPaymentHandler {
    pub fn new(
        payment_request_repository: Arc<dyn PaymentRequestRepository>,
        payment_request_service: Arc<PaymentRequestService>,
        b2pix_transfer_service: Arc<B2PixTransferService>,
    ) -> Self {
        Self {
            payment_request_repository,
            payment_request_service,
            b2pix_transfer_service,
        }
    }
}

#[async_trait]
impl TypedEventHandler<PaymentRequestCreatedEvent> for AutomaticPaymentHandler {
    async fn handle_typed(
        &self,
        event: &PaymentRequestCreatedEvent,
    ) -> Result<(), EventHandlerError> {
        // Only process if status is pending_automatic_payment
        if event.status != "pending_automatic_payment" {
            tracing::debug!(
                payment_request_id = %event.payment_request_id,
                status = %event.status,
                "Skipping automatic payment - status is not pending_automatic_payment"
            );
            return Ok(());
        }

        tracing::info!(
            payment_request_id = %event.payment_request_id,
            receiver_address = %event.receiver_address,
            amount = %event.amount,
            "Processing automatic payment"
        );

        let payment_request_id = PaymentRequestId::from_string(event.payment_request_id.clone());

        // Atomically claim the payment for processing - prevents dual spending
        // Only updates if status is still PendingAutomaticPayment
        let payment_request = self
            .payment_request_repository
            .update_status_atomic(
                &payment_request_id,
                vec![PaymentStatus::PendingAutomaticPayment],
                PaymentStatus::Processing,
            )
            .await
            .map_err(|e| EventHandlerError::Handler(e.to_string()))?;

        // If None, another process already claimed this payment - exit to prevent dual spending
        let mut payment_request = match payment_request {
            Some(pr) => pr,
            None => {
                tracing::info!(
                    payment_request_id = %event.payment_request_id,
                    "Payment request already being processed by another handler, skipping to prevent dual spending"
                );
                return Ok(());
            }
        };

        // Attempt automatic transfer
        match self
            .b2pix_transfer_service
            .transfer(event.receiver_address.clone(), event.amount)
            .await
        {
            Ok(txid) => {
                // Success - update to Broadcast status
                tracing::info!(
                    payment_request_id = %event.payment_request_id,
                    txid = %txid,
                    "Automatic payment successful"
                );

                payment_request.set_status(PaymentStatus::Broadcast);
                payment_request.set_blockchain_tx_id(txid);
                self.payment_request_repository
                    .save(&payment_request)
                    .await
                    .map_err(|e| EventHandlerError::Handler(e.to_string()))?;

                // No need to publish additional events - payment is now in progress
                Ok(())
            }
            Err(e) => {
                // Failed - mark original as Failed and create NEW PaymentRequest for manual processing
                let error_message = e.to_string();
                tracing::warn!(
                    payment_request_id = %event.payment_request_id,
                    error = %error_message,
                    "Automatic payment failed, creating new PaymentRequest for manual processing"
                );

                // Mark original as Failed
                payment_request.set_status(PaymentStatus::Failed);
                payment_request.set_failure_reason(format!(
                    "Automatic payment failed: {}",
                    error_message
                ));
                self.payment_request_repository
                    .save(&payment_request)
                    .await
                    .map_err(|e| EventHandlerError::Handler(e.to_string()))?;

                // Create NEW PaymentRequest with attempt_automatic_payment=false (status will be Waiting)
                // This will automatically publish PaymentRequestCreatedEvent which triggers Trello card
                match self.payment_request_service
                    .create_payment_request(
                        payment_request.source_type().clone(),
                        payment_request.source_id().clone(),
                        payment_request.receiver_address().to_string(),
                        payment_request.amount(),
                        format!(
                            "Retry after automatic payment failure. Original: {}. Reason: {}",
                            event.payment_request_id,
                            error_message
                        ),
                        false, // Do NOT attempt automatic payment for retry
                    )
                    .await
                {
                    Ok(new_payment) => {
                        tracing::info!(
                            original_payment_request_id = %event.payment_request_id,
                            new_payment_request_id = %new_payment.id().as_str(),
                            "Created new PaymentRequest for manual processing"
                        );
                    }
                    Err(create_err) => {
                        tracing::error!(
                            original_payment_request_id = %event.payment_request_id,
                            error = %create_err,
                            "Failed to create new PaymentRequest for manual processing"
                        );
                        return Err(EventHandlerError::Handler(format!(
                            "Failed to create retry PaymentRequest: {}",
                            create_err
                        )));
                    }
                }

                Ok(())
            }
        }
    }
}
