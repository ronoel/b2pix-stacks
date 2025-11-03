use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;

use crate::{config::Config, events::{
    models::{Event, EventConsumer}, processor::EventProcessor, store::EventStore
}};

#[derive(Clone)]
pub struct EventManagementState {
    pub event_store: Arc<EventStore>,
    pub event_processor: Arc<EventProcessor>,
    pub config: Arc<Config>,
}

#[derive(Serialize)]
pub struct EventResponse {
    pub id: String,
    pub event_name: String,
    pub event_origin: String,
    pub app: String,
    pub service_name: String,
    pub aggregate_id: Option<String>,
    pub aggregate_type: Option<String>,
    pub date: i64,
}

#[derive(Serialize)]
pub struct ConsumerResponse {
    pub id: String,
    pub event_id: String,
    pub endpoint: String,
    pub status: String,
    pub retry: i32,
    pub date: i64,
    pub error_message: Option<String>,
    pub execution_time_ms: Option<i64>,
    pub next_retry_at: Option<i64>,
}

#[derive(Serialize)]
pub struct EventWithConsumersResponse {
    pub event: EventResponse,
    pub consumers: Vec<ConsumerResponse>,
}

#[derive(Deserialize)]
pub struct ReplayQuery {
    pub aggregate_type: String,
    pub aggregate_id: String,
    pub from_timestamp: Option<DateTime<Utc>>,
    pub force: Option<bool>,
}

#[derive(Deserialize)]
pub struct ConsumerQuery {
    pub endpoint: Option<String>,
    pub event_name: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ApiResponse {
    pub success: bool,
    pub message: String,
}

impl From<Event> for EventResponse {
    fn from(event: Event) -> Self {
        Self {
            id: event.id.map(|id| id.to_string()).unwrap_or_default(),
            event_name: event.event_name,
            event_origin: event.event_origin,
            app: event.application_name,
            service_name: event.service_name,
            aggregate_id: event.aggregate_id,
            aggregate_type: event.aggregate_type,
            date: event.date,
        }
    }
}

impl From<EventConsumer> for ConsumerResponse {
    fn from(consumer: EventConsumer) -> Self {
        Self {
            id: consumer.id.map(|id| id.to_string()).unwrap_or_default(),
            event_id: consumer.event_id.to_string(),
            endpoint: consumer.endpoint,
            status: format!("{:?}", consumer.status).to_uppercase(),
            retry: consumer.retry,
            date: consumer.date,
            error_message: consumer.error_message,
            execution_time_ms: consumer.execution_time_ms,
            next_retry_at: consumer.next_retry_at,
        }
    }
}

pub async fn get_stats(
    State(state): State<EventManagementState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    match state.event_processor.get_processing_stats().await {
        Ok(stats) => Ok(Json(stats)),
        Err(e) => {
            tracing::error!("Failed to get stats: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_pending_consumers(
    State(state): State<EventManagementState>,
    Query(params): Query<ConsumerQuery>,
) -> Result<Json<Vec<ConsumerResponse>>, StatusCode> {
    let limit = params.limit.unwrap_or(50);
    
    match state.event_store.get_pending_consumers(limit).await {
        Ok(consumers) => {
            let response: Vec<ConsumerResponse> = consumers
                .into_iter()
                .map(ConsumerResponse::from)
                .collect();
            Ok(Json(response))
        }
        Err(e) => {
            tracing::error!("Failed to get pending consumers: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_failed_consumers(
    State(state): State<EventManagementState>,
    Query(params): Query<ConsumerQuery>,
) -> Result<Json<Vec<EventWithConsumersResponse>>, StatusCode> {
    match state.event_store.get_failed_consumers(
        params.endpoint.as_deref(),
        params.event_name.as_deref(),
        params.limit,
    ).await {
        Ok(failed_consumers) => {
            let mut response: Vec<EventWithConsumersResponse> = Vec::new();
            
            for consumer in failed_consumers {
                // Get the event for this consumer
                if let Ok(Some(event)) = state.event_store.get_event_by_id(&consumer.event_id).await {
                    response.push(EventWithConsumersResponse {
                        event: EventResponse::from(event),
                        consumers: vec![ConsumerResponse::from(consumer)],
                    });
                }
            }
            
            Ok(Json(response))
        }
        Err(e) => {
            tracing::error!("Failed to get failed consumers: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn replay_events(
    State(state): State<EventManagementState>,
    Query(params): Query<ReplayQuery>,
) -> Result<Json<ApiResponse>, StatusCode> {
    let force = params.force.unwrap_or(false);
    
    match state.event_processor.replay_events(
        &params.aggregate_type,
        &params.aggregate_id,
        params.from_timestamp,
        force,
    ).await {
        Ok(()) => Ok(Json(ApiResponse {
            success: true,
            message: if force {
                "Events force replayed successfully".to_string()
            } else {
                "Failed events replayed successfully".to_string()
            },
        })),
        Err(e) => {
            tracing::error!("Event replay failed: {}", e);
            Ok(Json(ApiResponse {
                success: false,
                message: format!("Event replay failed: {}", e),
            }))
        }
    }
}

pub async fn reset_consumer(
    State(state): State<EventManagementState>,
    Path(consumer_id): Path<String>,
) -> Result<Json<ApiResponse>, StatusCode> {
    let consumer_id = match ObjectId::parse_str(&consumer_id) {
        Ok(id) => id,
        Err(_) => {
            return Ok(Json(ApiResponse {
                success: false,
                message: "Invalid consumer ID format".to_string(),
            }));
        }
    };

    match state.event_processor.reset_consumer(&consumer_id).await {
        Ok(()) => Ok(Json(ApiResponse {
            success: true,
            message: "Consumer reset successfully".to_string(),
        })),
        Err(e) => {
            tracing::error!("Consumer reset failed: {}", e);
            Ok(Json(ApiResponse {
                success: false,
                message: format!("Consumer reset failed: {}", e),
            }))
        }
    }
}

pub async fn get_event_details(
    State(state): State<EventManagementState>,
    Path(event_id): Path<String>,
) -> Result<Json<EventWithConsumersResponse>, StatusCode> {
    let event_id = match ObjectId::parse_str(&event_id) {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    // Get event
    let event = match state.event_store.get_event_by_id(&event_id).await {
        Ok(Some(event)) => event,
        Ok(None) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to get event: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get consumers
    let consumers = match state.event_store.get_consumers_by_event_id(&event_id).await {
        Ok(consumers) => consumers,
        Err(e) => {
            tracing::error!("Failed to get consumers: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let response = EventWithConsumersResponse {
        event: EventResponse::from(event),
        consumers: consumers.into_iter().map(ConsumerResponse::from).collect(),
    };

    Ok(Json(response))
}

pub fn router() -> Router<EventManagementState> {
    Router::new()
        .route("/stats", get(get_stats))
        .route("/consumers/pending", get(get_pending_consumers))
        .route("/consumers/failed", get(get_failed_consumers))
        .route("/consumers/:consumer_id/reset", post(reset_consumer))
        .route("/events/:event_id", get(get_event_details))
        .route("/replay", post(replay_events))
}
