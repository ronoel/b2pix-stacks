use std::sync::Arc;
use axum::{routing::{get, post}, Router};

use crate::api::v1::payment_requests::handlers::{
    list_payment_requests,
    process_payment,
    get_payment_requests_by_source,
    PaymentRequestHandlers
};
use crate::features::payment_requests::services::PaymentRequestService;

pub fn payment_request_routes(
    payment_request_service: Arc<PaymentRequestService>,
) -> Router {
    let handlers = Arc::new(PaymentRequestHandlers::new(payment_request_service));

    Router::new()
        .route("/", get(list_payment_requests))
        .route("/by-source", get(get_payment_requests_by_source))
        .route("/:id/process", post(process_payment))
        .with_state(handlers)
}
