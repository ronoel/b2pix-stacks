use async_trait::async_trait;
use std::marker::PhantomData;
use std::sync::Arc;

use super::domain_event::DomainEvent;
use super::handlers::{EventHandler, EventHandlerError};
use super::store::StoredEvent;

/// Trait for handlers that work with strongly-typed domain events
/// 
/// This eliminates boilerplate by handling deserialization automatically
#[async_trait]
pub trait TypedEventHandler<E: DomainEvent>: Send + Sync {
    /// Handle a strongly-typed domain event
    /// 
    /// The event is already deserialized and validated
    async fn handle_typed(&self, event: &E) -> Result<(), EventHandlerError>;
    
    /// Optional: Handler name for logging/debugging
    /// Defaults to the type name
    fn handler_name(&self) -> &'static str {
        std::any::type_name::<Self>()
    }
}

/// Generic wrapper that converts a TypedEventHandler into an EventHandler
/// 
/// This allows typed handlers to work with the existing event system
pub struct GenericEventHandler<E, H> 
where
    E: DomainEvent,
    H: TypedEventHandler<E>,
{
    handler: Arc<H>,
    _phantom: PhantomData<E>,
}

impl<E, H> GenericEventHandler<E, H>
where
    E: DomainEvent,
    H: TypedEventHandler<E>,
{
    pub fn new(handler: H) -> Self {
        Self {
            handler: Arc::new(handler),
            _phantom: PhantomData,
        }
    }
    
    pub fn from_arc(handler: Arc<H>) -> Self {
        Self {
            handler,
            _phantom: PhantomData,
        }
    }
}

#[async_trait]
impl<E, H> EventHandler for GenericEventHandler<E, H>
where
    E: DomainEvent,
    H: TypedEventHandler<E> + 'static,
{
    fn can_handle(&self, event_type: &str) -> bool {
        event_type == E::event_type()
    }

    async fn handle(&self, event: &StoredEvent) -> Result<(), EventHandlerError> {
        // Deserialize the event data into the strongly-typed event
        let typed_event: E = serde_json::from_value(event.event_data.clone())
            .map_err(|e| {
                tracing::error!(
                    event_id = %event.id,
                    event_type = %event.event_type,
                    error = %e,
                    "Failed to deserialize event data"
                );
                EventHandlerError::Deserialization(e)
            })?;
        
        // Delegate to the typed handler
        self.handler.handle_typed(&typed_event).await
    }

    fn name(&self) -> &'static str {
        self.handler.handler_name()
    }
}

/// Helper trait to easily register typed handlers
pub trait TypedHandlerExt<E: DomainEvent> {
    fn into_event_handler(self) -> Arc<dyn EventHandler>;
}

impl<E, H> TypedHandlerExt<E> for H
where
    E: DomainEvent,
    H: TypedEventHandler<E> + 'static,
{
    fn into_event_handler(self) -> Arc<dyn EventHandler> {
        Arc::new(GenericEventHandler::new(self))
    }
}
