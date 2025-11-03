use std::sync::Arc;
use tracing::{info, error, warn};
use thiserror::Error;

use super::models::Event;
use super::store::{EventStore, EventStoreError};
use super::handlers::EventHandlerRegistry;

#[derive(Debug, Error)]
pub enum PublisherError {
    #[error("Store error: {0}")]
    Store(#[from] EventStoreError),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

pub struct EventPublisher {
    event_store: Arc<EventStore>,
    handler_registry: Arc<EventHandlerRegistry>,
}

impl EventPublisher {
    pub fn new(
        event_store: Arc<EventStore>,
        handler_registry: Arc<EventHandlerRegistry>,
    ) -> Self {
        Self {
            event_store,
            handler_registry,
        }
    }

    pub async fn publish(
        &self,
        event_data: serde_json::Value,
        event_name: String,
        event_origin: String, // NEW: Track where the event came from
        aggregate_type: Option<String>,
        aggregate_id: Option<String>,
        correlation_id: Option<String>,
        causation_id: Option<String>,
        metadata: Option<serde_json::Value>,
    ) -> Result<mongodb::bson::oid::ObjectId, PublisherError> {
        // Create the event
        let event = Event::new(
            event_name.clone(),
            event_origin,
            event_data,
            aggregate_type,
            aggregate_id,
            correlation_id,
            causation_id,
            metadata,
        );

        // Get all registered handlers for this event type
        let handlers = self.handler_registry.get_handlers_for(&event_name);

        info!(
            event_name = %event_name,
            handlers_found = handlers.len(),
            "Looking for handlers for event type"
        );

        let handler_endpoints: Vec<String> = handlers
            .iter()
            .map(|h| {
                let name = h.name();
                info!("Found handler: {}", name);
                format!("{}::handle", name)
            })
            .collect();

        if handler_endpoints.is_empty() {
            warn!(
                event_name = %event_name,
                "No handlers registered for this event type!"
            );
        }

        // Store event with consumer records
        let event_id = self.event_store
            .store_event_with_consumers(event, handler_endpoints.clone())
            .await?;

        info!(
            event_id = %event_id,
            event_name = %event_name,
            handlers_count = handlers.len(),
            handlers = ?handler_endpoints,
            "Event published with consumer tracking"
        );

        Ok(event_id)
    }

    /// Get the event store reference for direct access
    pub fn event_store(&self) -> Arc<EventStore> {
        Arc::clone(&self.event_store)
    }

    /// Get the handler registry reference
    pub fn handler_registry(&self) -> Arc<EventHandlerRegistry> {
        Arc::clone(&self.handler_registry)
    }
}
