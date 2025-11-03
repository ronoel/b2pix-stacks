use async_trait::async_trait;
use std::sync::{Arc, Mutex};
use thiserror::Error;
use tracing::{error, info};

#[derive(Debug, Error)]
pub enum EventHandlerError {
    #[error("Handler error: {0}")]
    Handler(String),
    #[error("Deserialization error: {0}")]
    Deserialization(#[from] serde_json::Error),
    #[error("External service error: {0}")]
    ExternalService(String),
}

#[async_trait]
pub trait EventHandler: Send + Sync {
    fn can_handle(&self, event_type: &str) -> bool;
    async fn handle(&self, event: &crate::events::store::StoredEvent) -> Result<(), EventHandlerError>;
    fn name(&self) -> &'static str;
}

pub struct EventHandlerRegistry {
    handlers: Mutex<Vec<Arc<dyn EventHandler>>>,
}

impl EventHandlerRegistry {
    pub fn new() -> Self {
        Self {
            handlers: Mutex::new(Vec::new()),
        }
    }

    pub fn register(&self, handler: Arc<dyn EventHandler>) {
        let handler_name = handler.name();
        info!("Registering event handler: {}", handler_name);
        let mut handlers = self.handlers.lock().unwrap();
        handlers.push(handler);
        info!("Total handlers registered: {}", handlers.len());
    }

    pub fn get_handlers_for(&self, event_type: &str) -> Vec<Arc<dyn EventHandler>> {
        let handlers = self.handlers.lock().unwrap();
        info!(
            "Searching for handlers for event type '{}' among {} total handlers",
            event_type,
            handlers.len()
        );

        let matching_handlers: Vec<Arc<dyn EventHandler>> = handlers
            .iter()
            .filter(|h| {
                let can_handle = h.can_handle(event_type);
                info!(
                    "Handler '{}' can_handle('{}') = {}",
                    h.name(),
                    event_type,
                    can_handle
                );
                can_handle
            })
            .cloned()
            .collect();

        info!(
            "Found {} matching handlers for event type '{}'",
            matching_handlers.len(),
            event_type
        );

        matching_handlers
    }

    pub fn get_all_handlers(&self) -> Vec<Arc<dyn EventHandler>> {
        let handlers = self.handlers.lock().unwrap();
        handlers.clone()
    }
}


// Audit Log Handler - logs all events for audit trail
pub struct AuditLogHandler;

impl AuditLogHandler {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl EventHandler for AuditLogHandler {
    fn can_handle(&self, _event_type: &str) -> bool {
        true // Handle all events for audit
    }

    async fn handle(&self, event: &crate::events::store::StoredEvent) -> Result<(), EventHandlerError> {
        info!(
            event_id = %event.id,
            event_type = %event.event_type,
            aggregate_id = ?event.aggregate_id,
            aggregate_type = ?event.aggregate_type,
            correlation_id = ?event.correlation_id,
            timestamp = %event.timestamp,
            "Audit log entry"
        );

        // In a production system, you might want to store this in a separate audit log
        // or send it to an external audit service
        Ok(())
    }

    fn name(&self) -> &'static str {
        "AuditLogHandler"
    }
}

// Metrics Handler - tracks event metrics
pub struct MetricsHandler;

impl MetricsHandler {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl EventHandler for MetricsHandler {
    fn can_handle(&self, _event_type: &str) -> bool {
        true // Handle all events for metrics
    }

    async fn handle(&self, event: &crate::events::store::StoredEvent) -> Result<(), EventHandlerError> {
        // In a production system, you would send metrics to your monitoring system
        // For now, we'll just log some basic metrics
        info!(
            event_type = %event.event_type,
            processing_attempts = %event.processing_attempts,
            "Event processed for metrics"
        );

        Ok(())
    }

    fn name(&self) -> &'static str {
        "MetricsHandler"
    }
}

// The existing handlers (InviteEmailHandler, AuditLogHandler, MetricsHandler) 
// now automatically benefit from the improved handler execution tracking.
// 
// Key improvements:
// 1. If InviteEmailHandler fails but AuditLogHandler succeeds, 
//    only InviteEmailHandler will be retried on the next attempt
// 2. Each handler execution is tracked with timestamps and retry counts
// 3. No duplicate processing occurs - successful handlers are skipped during retries
// 4. Complete audit trail of which handlers succeeded/failed and when
