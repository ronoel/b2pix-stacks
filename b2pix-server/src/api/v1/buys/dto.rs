use serde::{Deserialize, Serialize};
use crate::features::invites::services::ValidationService;
use crate::features::buys::domain::entities::{BuyStatus};

/// Request to create a new buy order
#[derive(Debug, Deserialize)]
pub struct CreateBuyRequest {
    pub advertisement_id: String,
    pub amount: u128,
    pub address_buy: String,
    pub pix_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionRequest {
    pub transaction: String
}
/// Response for a successfully created buy
// #[derive(Debug, Serialize)]
// pub struct CreateBuyResponse {
//     pub buy_id: String,
//     pub advertisement_id: String,
//     pub amount: u128,
//     pub price: u128,
//     pub fee: u128,
//     pub total_fiat_amount: u128,
//     pub address_buy: String,
//     pub pix_key: String,
//     pub status: String,
//     pub expires_at: String,
//     pub created_at: String,
// }

pub struct BuyCreatePayload {
    pub action: String,
    pub domain: String,
    pub pay_value: u128,
    pub address_buy: String,
    pub advertisement_id: String,
    pub timestamp: String,
}

impl BuyCreatePayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 6 {
            return Err("Payload must contain exactly 6 lines".to_string());
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let pay_value: u128 = lines[2].trim().to_string().parse()
            .map_err(|e| format!("Invalid pay_value format: {}", e))?;
        let address_buy = lines[3].trim().to_string();
        let advertisement_id = lines[4].trim().to_string();
        let timestamp = lines[5].trim().to_string();

        // Validate action
        if action != "B2PIX - Comprar" {
            return Err(format!("Invalid action. Expected 'B2PIX - Comprar', got '{}'", action));
        }

        // Validate pay_value is greater than zero
        if pay_value == 0 {
            return Err("Pay value must be greater than zero".to_string());
        }

        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;


        // Validate Stacks address format
        ValidationService::validate_stacks_address(&address_buy)
            .map_err(|e| format!("Address validation failed: {}", e))?;
        
        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;
        
        Ok(BuyCreatePayload {
            action,
            domain,
            pay_value,
            address_buy,
            advertisement_id,
            timestamp,
        })
    }
}

pub struct BuyPaidPayload {
    pub action: String,
    pub domain: String,
    pub pix_id: String, // "NONE" if not provided
    pub buy_id: String,
    pub timestamp: String,
}

impl BuyPaidPayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();
        
        if lines.len() != 5 {
            return Err("Payload must contain exactly 5 lines".to_string());
        }
        
        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let pix_id = lines[2].trim().to_string();
        let buy_id = lines[3].trim().to_string();
        let timestamp = lines[4].trim().to_string();

        // Validate action
        if action != "B2PIX - Marcar como Pago" {
            return Err(format!("Invalid action. Expected 'B2PIX - Marcar como Pago', got '{}'", action));
        }

        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;

        // Validate buy_id format (should be a valid ObjectId)
        if buy_id.trim().is_empty() {
            return Err("Buy ID cannot be empty".to_string());
        }

        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;
        
        Ok(BuyPaidPayload {
            action,
            domain,
            pix_id,
            buy_id,
            timestamp,
        })
    }

    pub fn get_pix_id(&self) -> Option<String> {
        if self.pix_id == "NONE" || self.pix_id.trim().is_empty() {
            None
        } else {
            Some(self.pix_id.clone())
        }
    }
}

pub struct BuyResolveDisputePayload {
    pub action: String,
    pub domain: String,
    pub buy_id: String,
    pub resolution: String, // "buyer" or "seller"
    pub timestamp: String,
}

impl BuyResolveDisputePayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();

        if lines.len() != 5 {
            return Err("Payload must contain exactly 5 lines".to_string());
        }

        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let buy_id = lines[2].trim().to_string();
        let resolution = lines[3].trim().to_string();
        let timestamp = lines[4].trim().to_string();

        // Validate action
        if action != "B2PIX - Resolver Disputa" {
            return Err(format!("Invalid action. Expected 'B2PIX - Resolver Disputa', got '{}'", action));
        }

        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;

        // Validate buy_id format (should be a valid ObjectId)
        if buy_id.trim().is_empty() {
            return Err("Buy ID cannot be empty".to_string());
        }

        // Validate resolution
        if resolution != "buyer" && resolution != "seller" {
            return Err(format!("Invalid resolution. Expected 'buyer' or 'seller', got '{}'", resolution));
        }

        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;

        Ok(BuyResolveDisputePayload {
            action,
            domain,
            buy_id,
            resolution,
            timestamp,
        })
    }
}

pub struct BuyCancelPayload {
    pub action: String,
    pub domain: String,
    pub buy_id: String,
    pub timestamp: String,
}

impl BuyCancelPayload {
    pub fn parse(payload: &str) -> Result<Self, String> {
        let lines: Vec<&str> = payload.split('\n').collect();

        if lines.len() != 4 {
            return Err("Payload must contain exactly 4 lines".to_string());
        }

        let action = lines[0].trim().to_string();
        let domain = lines[1].trim().to_string();
        let buy_id = lines[2].trim().to_string();
        let timestamp = lines[3].trim().to_string();

        // Validate action
        if action != "B2PIX - Cancelar Compra" {
            return Err(format!("Invalid action. Expected 'B2PIX - Cancelar Compra', got '{}'", action));
        }

        // Validate domain
        ValidationService::validate_domain(&domain)
            .map_err(|e| format!("Domain validation failed: {}", e))?;

        // Validate buy_id format (should be a valid ObjectId)
        if buy_id.trim().is_empty() {
            return Err("Buy ID cannot be empty".to_string());
        }

        // Validate timestamp
        ValidationService::validate_timestamp(&timestamp)
            .map_err(|e| format!("Timestamp validation failed: {}", e))?;

        Ok(BuyCancelPayload {
            action,
            domain,
            buy_id,
            timestamp,
        })
    }
}

/// Buy information for listings
#[derive(Debug, Serialize)]
pub struct BuyResponse {
    pub id: String,
    pub advertisement_id: String,
    pub amount: u128,
    pub price: u128,
    pub fee: u128,
    pub pay_value: u128,
    pub address_buy: String,
    pub pix_key: String,
    pub status: BuyStatus,
    pub expires_at: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Update buy status request
#[derive(Debug, Deserialize)]
pub struct UpdateBuyStatusRequest {
    pub status: String,
}

/// Query parameters for listing buys
#[derive(Debug, Deserialize)]
pub struct ListBuysQuery {
    pub advertisement_id: Option<String>,
    pub address: Option<String>,
    pub status: Option<String>,
    pub token: Option<String>,
    pub currency: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<u64>,
}

/// Query parameters for listing buys by address
#[derive(Debug, Deserialize)]
pub struct ListBuysByAddressQuery {
    pub page: Option<u64>,
    pub limit: Option<u64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>, // "asc" or "desc"
}

/// Response for paginated buy listings
#[derive(Debug, Serialize)]
pub struct ListBuysResponse {
    pub buys: Vec<BuyResponse>,
    pub total_count: u64,
    pub page: u64,
    pub limit: u64,
    pub has_more: bool,
}

/// Simplified response for cursor-based pagination (no total count)
#[derive(Debug, Serialize)]
pub struct PaginatedBuysResponse {
    pub buys: Vec<BuyResponse>,
    pub page: u64,
    pub limit: u64,
    pub has_more: bool,
}

/// Buy statistics response
#[derive(Debug, Serialize)]
pub struct BuyStatisticsResponse {
    pub total_count: u64,
    pub pending_count: u64,
    pub paid_count: u64,
    pub completed_count: u64,
    pub cancelled_count: u64,
    pub expired_count: u64,
    pub in_dispute_count: u64,
    pub dispute_resolved_buyer_count: u64,
    pub dispute_resolved_seller_count: u64,
    pub completion_rate: f64,
}

impl From<crate::features::buys::domain::entities::Buy> for BuyResponse {
    fn from(buy: crate::features::buys::domain::entities::Buy) -> Self {
        Self {
            id: buy.id.to_string(),
            advertisement_id: buy.advertisement_id.to_string(),
            amount: buy.amount,
            price: buy.price,
            fee: buy.fee,
            pay_value: buy.pay_value,
            address_buy: buy.address_buy.as_str().to_string(),
            pix_key: buy.pix_key.as_str().to_string(),
            status: buy.status,
            expires_at: buy.expires_at.to_rfc3339(),
            created_at: buy.created_at.to_rfc3339(),
            updated_at: buy.updated_at.to_rfc3339(),
        }
    }
}

// impl From<crate::features::buys::domain::entities::Buy> for CreateBuyResponse {
//     fn from(buy: crate::features::buys::domain::entities::Buy) -> Self {
//         Self {
//             buy_id: buy.id.to_string(),
//             advertisement_id: buy.advertisement_id.to_string(),
//             amount: buy.amount,
//             price: buy.price,
//             fee: buy.fee,
//             total_fiat_amount: buy.total_fiat_amount(),
//             address_buy: buy.address_buy.as_str().to_string(),
//             pix_key: buy.pix_key.as_str().to_string(),
//             status: format!("{:?}", buy.status).to_lowercase(),
//             expires_at: buy.expires_at.to_rfc3339(),
//             created_at: buy.created_at.to_rfc3339(),
//         }
//     }
// }

// impl From<crate::features::buys::ports::repositories::BuyStatistics> for BuyStatisticsResponse {
//     fn from(stats: crate::features::buys::ports::repositories::BuyStatistics) -> Self {
//         Self {
//             total_count: stats.total_count,
//             pending_count: stats.pending_count,
//             paid_count: stats.paid_count,
//             completed_count: stats.completed_count,
//             cancelled_count: stats.cancelled_count,
//             expired_count: stats.expired_count,
//             in_dispute_count: stats.in_dispute_count,
//             dispute_resolved_buyer_count: stats.dispute_resolved_buyer_count,
//             dispute_resolved_seller_count: stats.dispute_resolved_seller_count,
//             completion_rate: stats.completion_rate,
//         }
//     }
// }
