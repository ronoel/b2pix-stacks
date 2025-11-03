use std::sync::Arc;
use tokio::time::Duration;
use tracing;
use crate::{common::periodic_task::PeriodicTaskHandler, features::buys::domain::entities::BuyStatus};

/// Handler for periodically processing disputes resolved in favor of buyers
pub struct DisputeFavorBuyerTaskHandler {
    buy_service: Arc<crate::features::buys::services::buy_service::BuyService>,
}

impl DisputeFavorBuyerTaskHandler {
    pub fn new(
        buy_service: Arc<crate::features::buys::services::buy_service::BuyService>,
    ) -> Self {
        Self {
            buy_service,
        }
    }

    /// Processes all buys with dispute_favor_buyer status
    pub async fn process_dispute_favor_buyer(&self) -> anyhow::Result<()> {
        tracing::info!("Starting processing of dispute_favor_buyer buys");
        
        // Load all buys with dispute_favor_buyer status
        let disputed_buys = self.buy_service.get_buys_by_status(&BuyStatus::DisputeFavorBuyer).await?;
        
        tracing::info!("Found {} buys with dispute_favor_buyer status", disputed_buys.len());
        
        let mut processed_count = 0;
        
        for buy in disputed_buys {
            self.buy_service.mark_as_dispute_resolved_buyer(&buy).await;
            processed_count += 1;
        }
        
        tracing::info!(
            "Completed processing dispute_favor_buyer buys. Processed: {}",
            processed_count
        );
        
        Ok(())
    }
}

#[async_trait::async_trait]
impl PeriodicTaskHandler for DisputeFavorBuyerTaskHandler {
    fn name(&self) -> &str {
        "Dispute Favor Buyer"
    }

    fn interval(&self) -> Duration {
        Duration::from_secs(60) // 60 seconds interval (as in original)
    }

    async fn execute(&self) -> anyhow::Result<()> {
        tracing::debug!("Running periodic dispute favor Buyer task");
        self.process_dispute_favor_buyer().await?;
        Ok(())
    }
}