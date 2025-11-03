use mongodb::{Database, Collection, IndexModel};
use mongodb::bson::{doc, oid::ObjectId};
use futures::stream::TryStreamExt;
use tracing::{info, error};
use thiserror::Error;
use serde::{Serialize, Deserialize};

use super::models::{Event, EventConsumer};

#[derive(Debug, Error)]
pub enum EventStoreError {
    #[error("Database operation failed: {0}")]
    Database(#[from] mongodb::error::Error),
    #[error("Data serialization failed: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Event not found: {0}")]
    EventNotFound(String),
    #[error("Consumer not found: {0}")]
    ConsumerNotFound(String),
}

/// Event store for the two-document system with separate collections for events and consumers
pub struct EventStore {
    events_collection: Collection<Event>,
    consumers_collection: Collection<EventConsumer>,
}

impl EventStore {
    pub async fn new(database: Database) -> Result<Self, EventStoreError> {
        let events_collection = database.collection::<Event>("events");
        let consumers_collection = database.collection::<EventConsumer>("event_consumers");

        let store = Self {
            events_collection,
            consumers_collection,
        };

        // Create database indexes for optimal performance
        if let Err(e) = store.create_database_indexes().await {
            error!("Failed to create database indexes: {}", e);
        }

        Ok(store)
    }

    async fn create_database_indexes(&self) -> Result<(), EventStoreError> {
        // Event collection indexes
        let event_indexes = vec![
            IndexModel::builder()
                .keys(doc! { "event_name": 1 })
                .build(),
            IndexModel::builder()
                .keys(doc! { "event_origin": 1 })
                .build(),
            IndexModel::builder()
                .keys(doc! { "aggregate_type": 1, "aggregate_id": 1 })
                .build(),
            IndexModel::builder()
                .keys(doc! { "date": -1 })
                .build(),
            IndexModel::builder()
                .keys(doc! { "service_name": 1 })
                .build(),
        ];

        // Consumer collection indexes
        let consumer_indexes = vec![
            IndexModel::builder()
                .keys(doc! { "event_id": 1 })
                .build(),
            IndexModel::builder()
                .keys(doc! { "status": 1 })
                .build(),
            IndexModel::builder()
                .keys(doc! { "endpoint": 1 })
                .build(),
            IndexModel::builder()
                .keys(doc! { "next_retry_at": 1 })
                .build(),
            IndexModel::builder()
                .keys(doc! { "status": 1, "next_retry_at": 1 })
                .build(),
        ];

        self.events_collection.create_indexes(event_indexes, None).await?;
        self.consumers_collection.create_indexes(consumer_indexes, None).await?;

        Ok(())
    }

    /// Store an event and create consumer records for registered handlers
    pub async fn store_event_with_consumers(
        &self,
        event: Event,
        consumer_endpoints: Vec<String>,
    ) -> Result<ObjectId, EventStoreError> {
        // Insert the event record
        let insert_result = self.events_collection.insert_one(&event, None).await?;
        let event_id = insert_result.inserted_id.as_object_id()
            .ok_or_else(|| EventStoreError::EventNotFound("Failed to get event ID after insertion".to_string()))?;

        // Create consumer records for each registered handler
        if !consumer_endpoints.is_empty() {
            let consumers: Vec<EventConsumer> = consumer_endpoints
                .into_iter()
                .map(|endpoint| EventConsumer::new(event_id, endpoint))
                .collect();

            self.consumers_collection.insert_many(&consumers, None).await?;
            
            info!(
                event_id = %event_id,
                event_name = %event.event_name,
                consumer_count = consumers.len(),
                "Event stored with consumer records"
            );
        } else {
            info!(
                event_id = %event_id,
                event_name = %event.event_name,
                "Event stored without consumer records"
            );
        }

        Ok(event_id)
    }

    /// Get pending consumers that are ready for processing
    pub async fn get_pending_consumers(
        &self,
        limit: i64,
    ) -> Result<Vec<EventConsumer>, EventStoreError> {
        let current_time = chrono::Utc::now().timestamp_millis();
        
        let filter = doc! {
            "$or": [
                { "status": "PENDING" },
                { 
                    "status": "FAILED",
                    "$or": [
                        { "next_retry_at": { "$exists": false } },
                        { "next_retry_at": null },
                        { "next_retry_at": { "$lte": current_time } }
                    ]
                }
            ]
        };

        let find_options = mongodb::options::FindOptions::builder()
            .sort(doc! { "date": 1 })
            .limit(limit)
            .build();

        let cursor = self.consumers_collection.find(filter, find_options).await?;
        let consumers: Vec<EventConsumer> = cursor.try_collect().await?;

        Ok(consumers)
    }

    /// Get an event by its ID
    pub async fn get_event_by_id(
        &self,
        event_id: &ObjectId,
    ) -> Result<Option<Event>, EventStoreError> {
        let event = self.events_collection
            .find_one(doc! { "_id": event_id }, None).await?;
        Ok(event)
    }

    /// Update consumer status after processing
    pub async fn update_consumer_status(
        &self,
        consumer: &EventConsumer,
    ) -> Result<(), EventStoreError> {
        if let Some(consumer_id) = &consumer.id {
            self.consumers_collection
                .replace_one(doc! { "_id": consumer_id }, consumer, None).await?;
        }
        Ok(())
    }

    /// Get consumers by event ID
    pub async fn get_consumers_by_event_id(
        &self,
        event_id: &ObjectId,
    ) -> Result<Vec<EventConsumer>, EventStoreError> {
        let filter = doc! { "event_id": event_id };
        let cursor = self.consumers_collection.find(filter, None).await?;
        let consumers: Vec<EventConsumer> = cursor.try_collect().await?;
        Ok(consumers)
    }

    /// Get failed consumers for analysis and replay
    pub async fn get_failed_consumers(
        &self,
        endpoint_filter: Option<&str>,
        event_name_filter: Option<&str>,
        limit: Option<i64>,
    ) -> Result<Vec<EventConsumer>, EventStoreError> {
        let mut consumer_filter = doc! { "status": "FAILED" };
        
        if let Some(endpoint) = endpoint_filter {
            consumer_filter.insert("endpoint", endpoint);
        }

        let find_options = if let Some(limit) = limit {
            Some(mongodb::options::FindOptions::builder().limit(limit).build())
        } else {
            None
        };

        let cursor = self.consumers_collection.find(consumer_filter, find_options).await?;
        let failed_consumers: Vec<EventConsumer> = cursor.try_collect().await?;
        
        // If event_name_filter is provided, we need to filter by the event's name
        if let Some(event_name) = event_name_filter {
            let mut filtered_consumers = Vec::new();
            for consumer in failed_consumers {
                if let Some(event) = self.get_event_by_id(&consumer.event_id).await? {
                    if event.event_name == event_name {
                        filtered_consumers.push(consumer);
                    }
                }
            }
            Ok(filtered_consumers)
        } else {
            Ok(failed_consumers)
        }
    }

    /// Get event statistics
    pub async fn get_event_stats(&self) -> Result<serde_json::Value, EventStoreError> {
        let total_events = self.events_collection.count_documents(doc! {}, None).await?;
        Ok(serde_json::json!({
            "total_events": total_events
        }))
    }

    /// Get consumer statistics
    pub async fn get_consumer_stats(&self) -> Result<serde_json::Value, EventStoreError> {
        let total_consumers = self.consumers_collection.count_documents(doc! {}, None).await?;
        let succeeded_count = self.consumers_collection.count_documents(doc! { "status": "SUCCESS" }, None).await?;
        let failed_count = self.consumers_collection.count_documents(doc! { "status": "FAILED" }, None).await?;
        let pending_count = self.consumers_collection.count_documents(doc! { "status": "PENDING" }, None).await?;

        Ok(serde_json::json!({
            "total_consumers": total_consumers,
            "succeeded_count": succeeded_count,
            "failed_count": failed_count,
            "pending_count": pending_count,
            "success_rate": if total_consumers > 0 { succeeded_count as f64 / total_consumers as f64 } else { 0.0 }
        }))
    }

    /// Reset consumer status for replay scenarios
    pub async fn reset_consumer_status(
        &self,
        consumer_id: &ObjectId,
    ) -> Result<(), EventStoreError> {
        self.consumers_collection
            .update_one(
                doc! { "_id": consumer_id },
                doc! { 
                    "$set": { 
                        "status": "PENDING",
                        "retry": 0,
                        "error_message": null,
                        "next_retry_at": null,
                        "date": chrono::Utc::now().timestamp_millis()
                    }
                },
                None
            ).await?;
        Ok(())
    }

    /// Get events by aggregate for replay scenarios
    pub async fn get_events_by_aggregate(
        &self,
        aggregate_type: &str,
        aggregate_id: &str,
    ) -> Result<Vec<Event>, EventStoreError> {
        let filter = doc! {
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id
        };

        let find_options = mongodb::options::FindOptions::builder()
            .sort(doc! { "date": 1 })
            .build();

        let cursor = self.events_collection.find(filter, find_options).await?;
        let events: Vec<Event> = cursor.try_collect().await?;
        Ok(events)
    }
}

// Legacy type alias for backward compatibility with handlers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredEvent {
    pub id: String,
    pub event_type: String,
    pub event_data: serde_json::Value,
    pub aggregate_id: Option<String>,
    pub aggregate_type: Option<String>,
    pub version: i32,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub metadata: Option<serde_json::Value>,
    pub correlation_id: Option<String>,
    pub causation_id: Option<String>,
    pub processed: bool,
    pub processing_attempts: i32,
    pub last_attempt_at: Option<chrono::DateTime<chrono::Utc>>,
    pub next_retry_at: Option<chrono::DateTime<chrono::Utc>>,
    pub error_message: Option<String>,
    pub handler_executions: Vec<serde_json::Value>,
}

impl From<&Event> for StoredEvent {
    fn from(event: &Event) -> Self {
        Self {
            id: event.id.map(|id| id.to_string()).unwrap_or_default(),
            event_type: event.event_name.clone(),
            event_data: event.event_data.clone(),
            aggregate_id: event.aggregate_id.clone(),
            aggregate_type: event.aggregate_type.clone(),
            version: 1,
            timestamp: chrono::DateTime::from_timestamp_millis(event.date).unwrap_or_default(),
            metadata: event.metadata.clone(),
            correlation_id: event.correlation_id.clone(),
            causation_id: event.causation_id.clone(),
            processed: false,
            processing_attempts: 0,
            last_attempt_at: None,
            next_retry_at: None,
            error_message: None,
            handler_executions: Vec::new(),
        }
    }
}
