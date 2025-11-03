use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::interval;
use tracing::{info, warn, error};
use mongodb::bson::oid::ObjectId;

use super::store::EventStore;
use super::handlers::EventHandlerRegistry;
use super::models::{Event, EventConsumer, ConsumerStatus};

pub struct EventProcessor {
    event_store: Arc<EventStore>,
    handler_registry: Arc<EventHandlerRegistry>,
    batch_size: i64,
    poll_interval: Duration,
    max_concurrent_consumers: usize,
    max_retries: i32,
}

impl EventProcessor {
    pub fn new(
        event_store: Arc<EventStore>,
        handler_registry: Arc<EventHandlerRegistry>,
    ) -> Self {
        Self {
            event_store,
            handler_registry,
            batch_size: 50,
            poll_interval: Duration::from_secs(5),
            max_concurrent_consumers: 10,
            max_retries: 10,
        }
    }

    pub fn with_batch_size(mut self, batch_size: i64) -> Self {
        self.batch_size = batch_size;
        self
    }

    pub fn with_poll_interval(mut self, poll_interval: Duration) -> Self {
        self.poll_interval = poll_interval;
        self
    }

    pub fn with_max_concurrent_consumers(mut self, max_concurrent_consumers: usize) -> Self {
        self.max_concurrent_consumers = max_concurrent_consumers;
        self
    }

    pub fn with_max_retries(mut self, max_retries: i32) -> Self {
        self.max_retries = max_retries;
        self
    }

    pub async fn start(&self) {
        info!("Starting improved event processor");
        let mut interval = interval(self.poll_interval);

        loop {
            interval.tick().await;
            
            if let Err(e) = self.process_pending_consumers().await {
                error!("Error processing consumers: {}", e);
            }
        }
    }

    async fn process_pending_consumers(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let pending_consumers = self.event_store.get_pending_consumers(self.batch_size).await?;
        
        if pending_consumers.is_empty() {
            return Ok(());
        }

        info!("Processing {} pending consumers", pending_consumers.len());

        // Process consumers with limited concurrency
        let semaphore = Arc::new(tokio::sync::Semaphore::new(self.max_concurrent_consumers));
        let mut tasks = Vec::new();

        for consumer in pending_consumers {
            let event_store = Arc::clone(&self.event_store);
            let handler_registry = Arc::clone(&self.handler_registry);
            let semaphore = Arc::clone(&semaphore);
            let max_retries = self.max_retries;

            let task = tokio::spawn(async move {
                let _permit = semaphore.acquire().await.unwrap();
                Self::process_single_consumer(consumer, event_store, handler_registry, max_retries).await;
            });

            tasks.push(task);
        }

        // Wait for all tasks to complete
        for task in tasks {
            if let Err(e) = task.await {
                error!("Consumer processing task error: {}", e);
            }
        }

        Ok(())
    }

    async fn process_single_consumer(
        mut consumer: EventConsumer,
        event_store: Arc<EventStore>,
        handler_registry: Arc<EventHandlerRegistry>,
        max_retries: i32,
    ) {
        let consumer_id = consumer.id.map(|id| id.to_string()).unwrap_or_else(|| "unknown".to_string());
        let endpoint = consumer.endpoint.clone();
        
        info!(
            consumer_id = %consumer_id,
            endpoint = %endpoint,
            retry = %consumer.retry,
            "Processing consumer"
        );

        // Get the event
        let event = match event_store.get_event_by_id(&consumer.event_id).await {
            Ok(Some(event)) => event,
            Ok(None) => {
                error!(
                    consumer_id = %consumer_id,
                    event_id = %consumer.event_id,
                    "Event not found for consumer"
                );
                return;
            }
            Err(e) => {
                error!(
                    consumer_id = %consumer_id,
                    event_id = %consumer.event_id,
                    error = %e,
                    "Failed to fetch event for consumer"
                );
                return;
            }
        };

        // Find the handler
        let handler_name = endpoint.split("::").next().unwrap_or(&endpoint);
        let handlers = handler_registry.get_handlers_for(&event.event_name);
        let handler = handlers.iter().find(|h| h.name() == handler_name);

        let handler = match handler {
            Some(handler) => handler,
            None => {
                warn!(
                    consumer_id = %consumer_id,
                    endpoint = %endpoint,
                    event_name = %event.event_name,
                    "No handler found for consumer"
                );
                consumer.status = ConsumerStatus::Skipped;
                consumer.error_message = Some("Handler not found".to_string());
                if let Err(e) = event_store.update_consumer_status(&consumer).await {
                    error!("Failed to update consumer status: {}", e);
                }
                return;
            }
        };

        // Execute the handler
        let start_time = Instant::now();
        match handler.handle(&Self::convert_event_for_handler(&event)).await {
            Ok(()) => {
                let execution_time = start_time.elapsed().as_millis() as i64;
                consumer.mark_success(Some(execution_time));
                info!(
                    consumer_id = %consumer_id,
                    endpoint = %endpoint,
                    execution_time_ms = %execution_time,
                    "Consumer succeeded"
                );
            }
            Err(e) => {
                let error_msg = e.to_string();
                let next_retry_at = if consumer.should_retry(max_retries) {
                    Some(consumer.calculate_next_retry())
                } else {
                    None
                };
                
                consumer.mark_failed(error_msg.clone(), next_retry_at);
                
                if consumer.should_retry(max_retries) {
                    warn!(
                        consumer_id = %consumer_id,
                        endpoint = %endpoint,
                        retry = %consumer.retry,
                        next_retry_at = ?next_retry_at,
                        error = %error_msg,
                        "Consumer failed - will retry"
                    );
                } else {
                    error!(
                        consumer_id = %consumer_id,
                        endpoint = %endpoint,
                        retry = %consumer.retry,
                        error = %error_msg,
                        "Consumer failed - max retries exceeded"
                    );
                }
            }
        }

        // Update consumer status
        if let Err(e) = event_store.update_consumer_status(&consumer).await {
            error!("Failed to update consumer status: {}", e);
        }
    }

    /// Convert Event to StoredEvent for handler compatibility
    fn convert_event_for_handler(event: &Event) -> crate::events::store::StoredEvent {
        event.into()
    }

    /// Replay events for specific aggregate
    pub async fn replay_events(
        &self,
        aggregate_type: &str,
        aggregate_id: &str,
        from_timestamp: Option<chrono::DateTime<chrono::Utc>>,
        force: bool,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let events = self.event_store.get_events_by_aggregate(aggregate_type, aggregate_id).await?;
        
        info!("Replaying {} events for {}:{}", events.len(), aggregate_type, aggregate_id);

        for event in events {
            if let Some(from_ts) = from_timestamp {
                let event_timestamp = chrono::DateTime::from_timestamp_millis(event.date).unwrap_or_default();
                if event_timestamp < from_ts {
                    continue;
                }
            }

            // Get consumers for this event
            let event_id = event.id.ok_or("Event missing ID")?;
            let consumers = self.event_store.get_consumers_by_event_id(&event_id).await?;

            for mut consumer in consumers {
                // Skip successful consumers unless forced
                if !force && matches!(consumer.status, ConsumerStatus::Success) {
                    info!(
                        event_id = %event_id,
                        endpoint = %consumer.endpoint,
                        "Skipping successful consumer during replay"
                    );
                    continue;
                }

                // Reset consumer for replay
                consumer.status = ConsumerStatus::Pending;
                consumer.retry = 0;
                consumer.error_message = None;
                consumer.next_retry_at = None;
                consumer.date = chrono::Utc::now().timestamp_millis();

                // Update in store
                self.event_store.update_consumer_status(&consumer).await?;
                
                info!(
                    event_id = %event_id,
                    endpoint = %consumer.endpoint,
                    "Reset consumer for replay"
                );
            }
        }

        Ok(())
    }

    /// Get processing statistics
    pub async fn get_processing_stats(&self) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
        let event_stats = self.event_store.get_event_stats().await?;
        let consumer_stats = self.event_store.get_consumer_stats().await?;
        
        Ok(serde_json::json!({
            "events": event_stats,
            "consumers": consumer_stats,
            "registered_handlers": self.handler_registry.get_all_handlers().len()
        }))
    }

    /// Reset specific consumer
    pub async fn reset_consumer(&self, consumer_id: &ObjectId) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.event_store.reset_consumer_status(consumer_id).await?;
        info!(consumer_id = %consumer_id, "Consumer reset for replay");
        Ok(())
    }
}
