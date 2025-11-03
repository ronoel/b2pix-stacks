use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::features::payment_requests::domain::entities::PaymentStatus;

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionRequest {
    pub transaction: String
}

/// Query parameters for listing payment requests
#[derive(Debug, Deserialize)]
pub struct ListPaymentsRequestedQuery {
    pub page: Option<u64>,
    pub limit: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_comma_separated")]
    pub status: Option<Vec<String>>,
    pub sort_order: Option<String>,
}

fn deserialize_comma_separated<'de, D>(deserializer: D) -> Result<Option<Vec<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::Deserialize;

    // Deserialize as optional string
    let opt: Option<String> = Option::deserialize(deserializer)?;

    match opt {
        Some(s) if !s.is_empty() => {
            // Split by comma and trim whitespace
            let vec: Vec<String> = s.split(',')
                .map(|item| item.trim().to_string())
                .filter(|item| !item.is_empty())
                .collect();

            if vec.is_empty() {
                Ok(None)
            } else {
                Ok(Some(vec))
            }
        }
        _ => Ok(None),
    }
}

impl ListPaymentsRequestedQuery {
    pub fn get_page(&self) -> u64 {
        self.page.unwrap_or(1)
    }

    pub fn get_limit(&self) -> u64 {
        self.limit.unwrap_or(5)
    }

    pub fn get_sort_order(&self) -> String {
        self.sort_order.clone().unwrap_or_else(|| "desc".to_string())
    }

    pub fn parse_status_filter(&self) -> Result<Option<Vec<PaymentStatus>>, String> {
        if let Some(status_strings) = &self.status {
            let mut statuses = Vec::new();
            for status_str in status_strings {
                let status = PaymentStatus::from_string(status_str)?;
                statuses.push(status);
            }
            Ok(Some(statuses))
        } else {
            Ok(None)
        }
    }
}

/// Response for a single payment request
#[derive(Debug, Serialize)]
pub struct PaymentRequestedResponse {
    pub id: String,
    pub source_type: String,
    pub source_id: String,
    pub receiver_address: String,
    pub amount: u64,
    pub status: String,
    pub blockchain_tx_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Response for paginated listings
#[derive(Debug, Serialize)]
pub struct ListPaymentsRequestedResponse {
    pub data: Vec<PaymentRequestedResponse>,
    pub page: u64,
    pub limit: u64,
    pub has_more: bool,
}

/// Query parameters for getting payment requests by source
#[derive(Debug, Deserialize)]
pub struct GetBySourceQuery {
    pub source_type: String,
    pub source_id: String,
}

/// Response for source-based queries
#[derive(Debug, Serialize)]
pub struct GetBySourceResponse {
    pub data: Vec<PaymentRequestedResponse>,
}

impl From<crate::features::payment_requests::domain::entities::PaymentRequest> for PaymentRequestedResponse {
    fn from(payment_request: crate::features::payment_requests::domain::entities::PaymentRequest) -> Self {
        Self {
            id: payment_request.id.as_str().to_string(),
            source_type: payment_request.source_type.to_string(),
            source_id: payment_request.source_id.to_string(),
            receiver_address: payment_request.receiver_address,
            amount: payment_request.amount,
            status: payment_request.status.to_string(),
            blockchain_tx_id: payment_request.blockchain_tx_id,
            created_at: payment_request.created_at,
            updated_at: payment_request.updated_at,
        }
    }
}

impl From<Vec<crate::features::payment_requests::domain::entities::PaymentRequest>> for GetBySourceResponse {
    fn from(payment_requests: Vec<crate::features::payment_requests::domain::entities::PaymentRequest>) -> Self {
        Self {
            data: payment_requests
                .into_iter()
                .map(PaymentRequestedResponse::from)
                .collect(),
        }
    }
}

impl ListPaymentsRequestedResponse {
    pub fn from_payment_requests(
        payment_requests: Vec<crate::features::payment_requests::domain::entities::PaymentRequest>,
        page: u64,
        limit: u64,
        has_more: bool,
    ) -> Self {
        Self {
            data: payment_requests
                .into_iter()
                .map(PaymentRequestedResponse::from)
                .collect(),
            page,
            limit,
            has_more,
        }
    }
}
