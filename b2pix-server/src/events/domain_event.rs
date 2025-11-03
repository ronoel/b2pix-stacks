use serde::{Serialize, de::DeserializeOwned};

/// Trait for domain events that can be published and handled
/// 
/// This trait provides type safety and reduces boilerplate by:
/// - Enforcing compile-time event type checking
/// - Providing automatic serialization/deserialization
/// - Standardizing aggregate information extraction
pub trait DomainEvent: Serialize + DeserializeOwned + Send + Sync + 'static {
    /// The unique name/type of this event
    /// This is used for routing events to handlers
    fn event_type() -> &'static str where Self: Sized;
    
    /// Optional: Extract aggregate information from the event
    /// Returns (aggregate_type, aggregate_id) if applicable
    /// 
    /// Example: Some(("invite".to_string(), self.invite_id.to_string()))
    fn aggregate_info(&self) -> Option<(String, String)> {
        None
    }
    
    /// Optional: Extract correlation ID for event tracking
    fn correlation_id(&self) -> Option<String> {
        None
    }
    
    /// Optional: Extract causation ID (the event that caused this one)
    fn causation_id(&self) -> Option<String> {
        None
    }
    
    /// Optional: Additional metadata for the event
    fn metadata(&self) -> Option<serde_json::Value> {
        None
    }
}
