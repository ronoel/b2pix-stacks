use std::sync::Arc;
use tokio::time::Duration;
use tracing;
use crate::common::periodic_task::PeriodicTaskHandler;

/// Handler for periodically expiring old pending buy orders
pub struct BuyExpirationTaskHandler {
    buy_service: Arc<crate::features::buys::services::buy_service::BuyService>,
}

impl BuyExpirationTaskHandler {
    pub fn new(
        buy_service: Arc<crate::features::buys::services::buy_service::BuyService>,
    ) -> Self {
        Self {
            buy_service,
        }
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for BuyExpirationTaskHandler {
    fn name(&self) -> &str {
        "Buy Expiration"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(30) // 30 seconds interval
    }

    async fn execute(&self) -> anyhow::Result<()> {
        tracing::debug!("Running periodic buy expiration task");
        self.buy_service.process_pending().await?;
        Ok(())
    }
}