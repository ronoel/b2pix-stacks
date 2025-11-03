use std::sync::Arc;
use tokio::time::Duration;
use tracing;
use crate::common::periodic_task::PeriodicTaskHandler;

/// Handler for periodically verifying advertisement transactions
pub struct AdvertisementTransactionVerifierTaskHandler {
    advertisement_service: Arc<crate::features::advertisements::services::AdvertisementService>,
}

impl AdvertisementTransactionVerifierTaskHandler {
    pub fn new(
        advertisement_service: Arc<crate::features::advertisements::services::AdvertisementService>,
    ) -> Self {
        Self {
            advertisement_service,
        }
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for AdvertisementTransactionVerifierTaskHandler {
    fn name(&self) -> &str {
        "Advertisement Transaction Verifier"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(30) // 30 seconds interval (as in original)
    }

    async fn execute(&self) -> anyhow::Result<()> {
        // NOTE: This task is now a no-op. Transaction verification has been moved
        // to the AdvertisementDeposit feature. A separate background task will:
        // 1. Find deposits with Pending status
        // 2. Verify their on-chain confirmation
        // 3. Update deposit status to Confirmed
        // 4. Add confirmed amount to advertisement via add_deposited_amount()

        tracing::debug!("Advertisement transaction verification is handled by deposit feature");
        Ok(())
    }
}
