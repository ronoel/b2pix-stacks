use serde::{Deserialize, Serialize};
use crate::features::advertisements::domain::entities::Advertisement;
use crate::features::advertisement_deposits::domain::entities::AdvertisementDeposit;
use crate::features::invites::services::ValidationService;

/// Request to create a new advertisement
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAdvertisementRequest {
    pub transaction: String,
    pub min_amount: i64,
    pub max_amount: i64,
}

/// Response for update operations
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAdvertisementResponse {
    pub id: String,
    pub status: String,
    pub message: String,
}

/// Request to add a recharge deposit to an existing advertisement
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDepositRequest {
    pub transaction: String,
}

/// Response for deposit creation
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDepositResponse {
    pub deposit_id: String,
    pub advertisement_id: String,
    pub amount: u128,
    pub status: String,
    pub message: String,
}

/// Payload structure for finishing an advertisement
pub struct FinishAdvertisementPayload {
    pub action: String,
    pub domain: String,
    pub advertisement_id: String,
    pub timestamp: String,
}

impl FinishAdvertisementPayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 4 {
            return Err("Payload must contain exactly 4 lines".to_string());
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let advertisement_id = lines[2].trim().to_string();
        let timestamp = lines[3].trim().to_string();

        // Validate action
        if action != "B2PIX - Finalizar Anúncio" {
            return Err(format!("Invalid action. Expected 'B2PIX - Finalizar Anúncio', got '{}'", action));
        }

        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;

        // Validate advertisement_id format (should be a valid ObjectId)
        if advertisement_id.trim().is_empty() {
            return Err("Advertisement ID cannot be empty".to_string());
        }

        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;
        
        Ok(FinishAdvertisementPayload {
            action,
            domain,
            advertisement_id,
            timestamp,
        })
    }
}

/// Response for advertisement data
#[derive(Debug, Serialize, Deserialize)]
pub struct AdvertisementResponse {
    pub id: String,
    pub seller_address: String,
    pub token: String,
    pub currency: String,
    pub price: u128,
    pub total_deposited: u128,
    pub available_amount: u128,
    pub min_amount: i64,
    pub max_amount: i64,
    pub status: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Query parameters for listing advertisements
#[derive(Debug, Serialize, Deserialize)]
pub struct ListAdvertisementsQuery {
    pub status: Option<Vec<String>>,
    pub active_only: Option<bool>,
    pub page: Option<u64>,
    pub limit: Option<u64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

/// Paginated response for listing advertisements
#[derive(Debug, Serialize, Deserialize)]
pub struct ListAdvertisementsResponse {
    pub data: Vec<AdvertisementResponse>,
    pub pagination: PaginationInfo,
}

/// Pagination information
#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationInfo {
    pub page: u64,
    pub limit: u64,
    pub total: u64,
    pub total_pages: u64,
}

/// Response for deposit data
#[derive(Debug, Serialize, Deserialize)]
pub struct DepositResponse {
    pub id: String,
    pub advertisement_id: String,
    pub seller_address: String,
    pub transaction_id: Option<String>,
    pub amount: u128,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub confirmed_at: Option<String>,
}

impl From<AdvertisementDeposit> for DepositResponse {
    fn from(deposit: AdvertisementDeposit) -> Self {
        Self {
            id: deposit.id.to_string(),
            advertisement_id: deposit.advertisement_id.to_string(),
            seller_address: deposit.seller_address,
            transaction_id: deposit.transaction_id,
            amount: deposit.amount,
            status: serde_json::to_value(&deposit.status)
                .unwrap()
                .as_str()
                .unwrap()
                .to_string(),
            created_at: deposit.created_at.to_rfc3339(),
            updated_at: deposit.updated_at.to_rfc3339(),
            confirmed_at: deposit.confirmed_at.map(|dt| dt.to_rfc3339()),
        }
    }
}

impl From<Advertisement> for AdvertisementResponse {
    fn from(advertisement: Advertisement) -> Self {
        Self {
            id: advertisement.id.to_string(),
            seller_address: advertisement.seller_address.as_str().to_string(),
            token: advertisement.token.as_str().to_string(),
            currency: advertisement.currency.as_str().to_string(),
            price: advertisement.price,
            total_deposited: advertisement.total_deposited,
            available_amount: advertisement.available_amount,
            min_amount: advertisement.min_amount,
            max_amount: advertisement.max_amount,
            status: serde_json::to_value(&advertisement.status)
                .unwrap()
                .as_str()
                .unwrap()
                .to_string(),
            is_active: advertisement.is_active,
            created_at: advertisement.created_at.to_rfc3339(),
            updated_at: advertisement.updated_at.to_rfc3339(),
        }
    }
}