use std::sync::Arc;
use tokio::time::{interval, Duration, sleep};
use tracing;

/// Trait that defines a periodic task handler
#[async_trait::async_trait]
pub trait PeriodicTaskHandler: Send + Sync {
    /// The name of this task for logging
    fn name(&self) -> &str;
    
    /// How often this task should run
    fn interval(&self) -> Duration;
    
    /// Optional startup delay to stagger task initialization
    fn startup_delay(&self) -> Duration {
        Duration::from_secs(0)
    }
    
    /// The actual work to be performed
    async fn execute(&self) -> anyhow::Result<()>;
}

/// Generic periodic task that runs a handler at specified intervals
pub struct PeriodicTask<T: PeriodicTaskHandler> {
    handler: Arc<T>,
}

impl<T: PeriodicTaskHandler> PeriodicTask<T> {
    pub fn new(handler: T) -> Self {
        Self {
            handler: Arc::new(handler),
        }
    }

    /// Starts the periodic task with optional startup delay
    pub async fn start(&self) {
        let startup_delay = self.handler.startup_delay();
        
        if startup_delay > Duration::from_secs(0) {
            tracing::info!("{} task waiting {} seconds before starting", 
                          self.handler.name(), 
                          startup_delay.as_secs());
            sleep(startup_delay).await;
        }

        let mut interval = interval(self.handler.interval());
        
        tracing::info!("{} task started", self.handler.name());

        loop {
            interval.tick().await;

            if let Err(e) = self.handler.execute().await {
                tracing::error!("{} processing failed: {}", self.handler.name(), e);
            }
        }
    }
}