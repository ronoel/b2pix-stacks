use std::sync::Arc;
use axum::{extract::{State, Query, Path}, Json, response::IntoResponse};
use mongodb::bson::oid::ObjectId;

use crate::api::v1::payment_requests::dto::{
    ListPaymentsRequestedQuery,
    ListPaymentsRequestedResponse,
    PaymentRequestedResponse,
    TransactionRequest,
    GetBySourceQuery,
    GetBySourceResponse
};
use crate::common::errors::ApiError;
use crate::features::payment_requests::domain::entities::{PaymentRequestId, SourceType};
use crate::features::payment_requests::services::PaymentRequestService;

pub struct PaymentRequestHandlers {
    payment_request_service: Arc<PaymentRequestService>,
}

impl PaymentRequestHandlers {
    pub fn new(
        payment_request_service: Arc<PaymentRequestService>,
    ) -> Self {
        Self {
            payment_request_service,
        }
    }
}

pub async fn list_payment_requests(
    State(handlers): State<Arc<PaymentRequestHandlers>>,
    Query(query): Query<ListPaymentsRequestedQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let page = query.get_page();
    let limit = query.get_limit();
    let sort_order = query.get_sort_order();

    // Parse status filter
    let status_filter = query.parse_status_filter()
        .map_err(|e| ApiError::BadRequest(format!("Invalid status filter: {}", e)))?;

    // Get payment requests from service
    let (payment_requests, has_more) = handlers.payment_request_service
        .list_payment_requests(page, limit, status_filter, sort_order)
        .await
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?;

    // Create response using From implementation
    let response = ListPaymentsRequestedResponse::from_payment_requests(
        payment_requests,
        page,
        limit,
        has_more,
    );

    Ok(Json(response))
}

pub async fn process_payment(
    State(handlers): State<Arc<PaymentRequestHandlers>>,
    Path(id): Path<String>,
    Json(request): Json<TransactionRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let payment_id = PaymentRequestId::from_string(id);

    let payment_request = handlers.payment_request_service
        .process_payment(&payment_id, request.transaction)
        .await
        .map_err(|e| match e {
            crate::features::payment_requests::ports::PaymentRequestError::NotFound => {
                ApiError::BadRequest("Payment request not found or not in valid status (waiting/failed)".to_string())
            }
            _ => ApiError::InternalServerError(e.to_string())
        })?;

    let response = PaymentRequestedResponse::from(payment_request);

    Ok(Json(response))
}

pub async fn get_payment_requests_by_source(
    State(handlers): State<Arc<PaymentRequestHandlers>>,
    Query(query): Query<GetBySourceQuery>,
) -> Result<impl IntoResponse, ApiError> {
    // Parse source_type
    let source_type = SourceType::from_string(&query.source_type)
        .map_err(|e| ApiError::BadRequest(format!("Invalid source_type: {}", e)))?;

    // Parse source_id
    let source_id = ObjectId::parse_str(&query.source_id)
        .map_err(|e| ApiError::BadRequest(format!("Invalid source_id: {}", e)))?;

    // Get payment requests from service
    let payment_requests = handlers.payment_request_service
        .get_payment_requests_by_source(&source_type, &source_id)
        .await
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?;

    // Create response using From implementation
    let response = GetBySourceResponse::from(payment_requests);

    Ok(Json(response))
}
