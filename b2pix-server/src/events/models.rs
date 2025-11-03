use serde::{Deserialize, Serialize};
use mongodb::bson;
use chrono::Utc;

/// Core event document - represents a business event that occurred in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<bson::oid::ObjectId>,
    pub event_name: String,        // e.g., "InviteRequested"
    pub event_origin: String,      // e.g., "InviteService::request_invite"
    pub application_name: String,  // e.g., "b2pix-rust-server"
    pub service_name: String,      // e.g., "EVTS:InviteRequested"
    pub event_data: serde_json::Value,
    pub aggregate_type: Option<String>,
    pub aggregate_id: Option<String>,
    pub correlation_id: Option<String>,
    pub causation_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub date: i64, // Unix timestamp in milliseconds
}

impl Event {
    pub fn new(
        event_name: String,
        event_origin: String,
        event_data: serde_json::Value,
        aggregate_type: Option<String>,
        aggregate_id: Option<String>,
        correlation_id: Option<String>,
        causation_id: Option<String>,
        metadata: Option<serde_json::Value>,
    ) -> Self {
        Self {
            id: None,
            event_name: event_name.clone(),
            event_origin,
            application_name: "b2pix-rust-server".to_string(),
            service_name: format!("EVTS:{}", event_name),
            event_data,
            aggregate_type,
            aggregate_id,
            correlation_id,
            causation_id,
            metadata,
            date: Utc::now().timestamp_millis(),
        }
    }
}

/// Event consumer record - tracks the processing of an event by a specific handler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventConsumer {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<bson::oid::ObjectId>,
    pub event_id: bson::oid::ObjectId,
    pub endpoint: String,       // e.g., "EmailHandler::handle"
    pub status: ConsumerStatus,
    pub retry: i32,
    pub date: i64,          // Unix timestamp in milliseconds
    pub error_message: Option<String>,
    pub execution_time_ms: Option<i64>,
    pub next_retry_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ConsumerStatus {
    Pending,
    Success,
    Failed,
    Skipped,
}

impl EventConsumer {
    pub fn new(event_id: bson::oid::ObjectId, endpoint: String) -> Self {
        Self {
            id: None,
            event_id,
            endpoint,
            status: ConsumerStatus::Pending,
            retry: 0,
            date: Utc::now().timestamp_millis(),
            error_message: None,
            execution_time_ms: None,
            next_retry_at: None,
        }
    }

    pub fn mark_success(&mut self, execution_time_ms: Option<i64>) {
        self.status = ConsumerStatus::Success;
        self.execution_time_ms = execution_time_ms;
        self.date = Utc::now().timestamp_millis();
    }

    pub fn mark_failed(&mut self, error_message: String, next_retry_at: Option<i64>) {
        self.status = ConsumerStatus::Failed;
        self.error_message = Some(error_message);
        self.retry += 1;
        self.next_retry_at = next_retry_at;
        self.date = Utc::now().timestamp_millis();
    }

    pub fn should_retry(&self, max_retries: i32) -> bool {
        matches!(self.status, ConsumerStatus::Failed) && self.retry < max_retries
    }

    pub fn calculate_next_retry(&self) -> i64 {
        // Exponential backoff: 1min, 2min, 4min, 8min, 16min, then 30min max
        let delay_minutes = match self.retry {
            1 => 1,
            2 => 2,
            3 => 4,
            4 => 8,
            5 => 16,
            _ => 30,
        };
        
        Utc::now().timestamp_millis() + (delay_minutes * 60 * 1000)
    }
}

// Legacy types for backward compatibility - to be removed
pub type EventRecord = Event;
pub type HandlerExecution = EventConsumer;
pub type HandlerStatus = ConsumerStatus;
