use std::sync::Arc;
use tokio::time::Duration;
use tracing;
use crate::{common::periodic_task::PeriodicTaskHandler, features::buys::domain::entities::BuyStatus};

/// Handler for periodically verifying payments for paid buy orders
pub struct BuyPaymentVerificationTaskHandler {
    buy_service: Arc<crate::features::buys::services::buy_service::BuyService>,
}

impl BuyPaymentVerificationTaskHandler {
    pub fn new(
        buy_service: Arc<crate::features::buys::services::buy_service::BuyService>,
    ) -> Self {
        Self {
            buy_service,
        }
    }

    /// Processes all buys with paid status for payment verification
    pub async fn process_payment_verification(&self) -> anyhow::Result<()> {

        // Find all buys with "paid" status
        let paid_buys = match self.buy_service.get_buys_by_status(&BuyStatus::Paid).await {
            Ok(buys) => buys,
            Err(e) => {
                tracing::error!("Failed to find buys with paid status: {}", e);
                return Ok(());
            }
        };

        if paid_buys.is_empty() {
            return Ok(());
        }

        // Process each paid buy
        for buy in paid_buys {
            
            // Call payment_verification for this buy
            self.buy_service.payment_verification(&buy).await;
        }
        
        Ok(())
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for BuyPaymentVerificationTaskHandler {
    fn name(&self) -> &str {
        "Buy Payment Verification"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(60) // 1 minute interval
    }

    async fn execute(&self) -> anyhow::Result<()> {
        tracing::debug!("Running periodic payment verification task");
        self.process_payment_verification().await?;
        Ok(())
    }
}
