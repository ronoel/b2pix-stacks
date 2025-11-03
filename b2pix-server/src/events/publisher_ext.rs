use async_trait::async_trait;
use mongodb::bson::oid::ObjectId;

use super::domain_event::DomainEvent;
use super::publisher::{EventPublisher, PublisherError};

/// Extension trait for EventPublisher to support strongly-typed domain events
/// 
/// This simplifies publishing by:
/// - Automatic serialization of domain events
/// - Automatic extraction of aggregate info
/// - Type-safe event publishing
/// - Reduced boilerplate in service code
#[async_trait]
pub trait EventPublisherExt {
    /// Publish a strongly-typed domain event
    /// 
    /// # Arguments
    /// * `event` - The domain event to publish
    /// * `origin` - Where the event originated (e.g., "InviteService::send_invite")
    /// 
    /// # Example
    /// ```rust
    /// let event = InviteSentEvent { ... };
    /// publisher.publish_domain_event(&event, "InviteService::send_invite").await?;
    /// ```
    async fn publish_domain_event<E: DomainEvent>(
        &self,
        event: &E,
        origin: &str,
    ) -> Result<ObjectId, PublisherError>;
    
    /// Publish with explicit correlation/causation IDs for event chains
    async fn publish_domain_event_with_correlation<E: DomainEvent>(
        &self,
        event: &E,
        origin: &str,
        correlation_id: Option<String>,
        causation_id: Option<String>,
    ) -> Result<ObjectId, PublisherError>;
}

#[async_trait]
impl EventPublisherExt for EventPublisher {
    async fn publish_domain_event<E: DomainEvent>(
        &self,
        event: &E,
        origin: &str,
    ) -> Result<ObjectId, PublisherError> {
        // Use correlation/causation IDs from the event itself, if provided
        let correlation_id = event.correlation_id();
        let causation_id = event.causation_id();
        
        self.publish_domain_event_with_correlation(
            event,
            origin,
            correlation_id,
            causation_id,
        ).await
    }
    
    async fn publish_domain_event_with_correlation<E: DomainEvent>(
        &self,
        event: &E,
        origin: &str,
        correlation_id: Option<String>,
        causation_id: Option<String>,
    ) -> Result<ObjectId, PublisherError> {
        // Serialize the event
        let event_data = serde_json::to_value(event)?;
        
        // Extract aggregate information from the event
        let (aggregate_type, aggregate_id) = event.aggregate_info()
            .map(|(t, i)| (Some(t), Some(i)))
            .unwrap_or((None, None));
        
        // Get metadata if provided
        let metadata = event.metadata();
        
        // Publish using the existing publisher
        self.publish(
            event_data,
            E::event_type().to_string(),
            origin.to_string(),
            aggregate_type,
            aggregate_id,
            correlation_id,
            causation_id,
            metadata,
        ).await
    }
}
