use std::sync::Arc;
use tokio::time::Duration;
use tracing;
use crate::common::periodic_task::PeriodicTaskHandler;

/// Handler for periodically processing disputes resolved in favor of sellers
pub struct DisputeFavorSellerTaskHandler {
    buy_service: Arc<crate::features::buys::services::buy_service::BuyService>,
}

impl DisputeFavorSellerTaskHandler {
    pub fn new(
        buy_service: Arc<crate::features::buys::services::buy_service::BuyService>,
    ) -> Self {
        Self {
            buy_service,
        }
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for DisputeFavorSellerTaskHandler {
    fn name(&self) -> &str {
        "Dispute Favor Seller"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(60) // 60 seconds interval (as in original)
    }

    async fn execute(&self) -> anyhow::Result<()> {
        tracing::debug!("Running periodic dispute favor seller task");
        self.buy_service.process_dispute_favor_seller().await;
        Ok(())
    }
}