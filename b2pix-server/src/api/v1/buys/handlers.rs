use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    Json,
};
use mongodb::bson::oid::ObjectId;
use crate::{
    common::{errors::ApiError, signature::SignedRequest},
    config::Config,
    features::{
        advertisements::domain::entities::AdvertisementId,
        buys::{domain::entities::{BuyId, BuyStatus}, services::buy_service::BuyService},
        invites::services::validation_service::ValidationService,
        shared::value_objects::CryptoAddress
    },
    infrastructure::blockchain::stacks::{get_address_from_public_key, verify_message_signature_rsv}
};

use super::dto::*;

/// Resolve a buy dispute (mark as dispute favor buyer or seller)
pub async fn resolve_buy_dispute(
    State(handlers): State<Arc<BuyHandlers>>,
    Json(request): Json<SignedRequest>,
) -> Result<Json<BuyResponse>, ApiError> {
    // Validate signature against the payload
    if !verify_message_signature_rsv(&request.payload, &request.signature, &request.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?
    {
        return Err(ApiError::BadRequest(
            "Signature verification failed".to_string(),
        ));
    }

    // Parse and validate the structured payload
    let parsed_payload = BuyResolveDisputePayload::parse(&request.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

    // Validate that the public key corresponds to ADDRESS_MANAGER
    ValidationService::validate_manager_public_key(
        &request.public_key,
        &handlers.config.address_manager,
        &handlers.config.network
    ).map_err(|_| ApiError::Unauthorized)?;

    // Parse the buy ID
    let buy_id = BuyId::from_string(parsed_payload.buy_id.clone())
        .map_err(|_| ApiError::BadRequest(format!("Invalid buy ID: {}", parsed_payload.buy_id)))?;

    // Get the buy to verify it exists and is in dispute status
    let buy = handlers.buy_service.get_by_id(buy_id.clone()).await
        .map_err(|e| {
            tracing::error!("Failed to get buy {}: {}", parsed_payload.buy_id, e);
            ApiError::InternalServerError(format!("Failed to get buy: {}", e))
        })?
        .ok_or(ApiError::NotFound)?;

    // Verify the buy is in dispute status
    if buy.status != BuyStatus::InDispute {
        return Err(ApiError::BadRequest(
            format!("Buy {} is not in dispute status. Current status: {:?}", parsed_payload.buy_id, buy.status),
        ));
    }

    // Resolve the dispute based on the resolution value
    let updated_buy = match parsed_payload.resolution.as_str() {
        "buyer" => {
            handlers.buy_service.mark_as_dispute_favor_buyer(buy_id).await
                .map_err(|e| {
                    tracing::error!("Failed to resolve dispute in favor of buyer for buy {}: {}", parsed_payload.buy_id, e);
                    ApiError::InternalServerError(format!("Failed to resolve dispute in favor of buyer: {}", e))
                })?
        }
        "seller" => {
            handlers.buy_service.mark_as_dispute_favor_seller(buy_id).await
                .map_err(|e| {
                    tracing::error!("Failed to resolve dispute in favor of seller for buy {}: {}", parsed_payload.buy_id, e);
                    ApiError::InternalServerError(format!("Failed to resolve dispute in favor of seller: {}", e))
                })?
        }
        _ => {
            return Err(ApiError::BadRequest(
                format!("Invalid resolution value: {}", parsed_payload.resolution),
            ));
        }
    };

    Ok(Json(BuyResponse::from(updated_buy)))
}

/// Mark a buy as paid
pub async fn mark_buy_as_paid(
    State(handlers): State<Arc<BuyHandlers>>,
    Path(id): Path<String>,
    Json(request): Json<SignedRequest>,
) -> Result<Json<BuyResponse>, ApiError> {
    // Validate signature against the payload
    if !verify_message_signature_rsv(&request.payload, &request.signature, &request.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?
    {
        return Err(ApiError::BadRequest(
            "Signature verification failed".to_string(),
        ));
    }

    // Parse and validate the structured payload
    let parsed_payload = BuyPaidPayload::parse(&request.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

    // Validate that the buy_id in the path matches the one in the payload
    if id != parsed_payload.buy_id {
        return Err(ApiError::BadRequest(
            "Buy ID in path does not match the one in payload".to_string(),
        ));
    }

    // Parse the buy ID
    let buy_id = BuyId::from_string(id.clone())
        .map_err(|_| ApiError::BadRequest(format!("Invalid buy ID: {}", id)))?;

    // Get the buy to verify the buyer's address
    let buy = handlers.buy_service.get_by_id(buy_id.clone()).await
        .map_err(|e| {
            tracing::error!("Failed to get buy {}: {}", id, e);
            ApiError::InternalServerError(format!("Failed to get buy: {}", e))
        })?
        .ok_or(ApiError::NotFound)?;

    // Validate that the address belongs to the public key (buyer verification)
    let buyer_address = get_address_from_public_key(&request.public_key, &handlers.config.network)
        .map_err(|e| ApiError::BadRequest(format!("Failed to derive address from public key: {}", e)))?;

    if buyer_address != buy.address_buy.as_str() {
        return Err(ApiError::Unauthorized);
    }

    // Call the buy service to mark as paid
    let updated_buy = handlers.buy_service.mark_as_paid(
        buy_id,
        parsed_payload.get_pix_confirmation_code(),
    ).await.map_err(|e| {
        tracing::error!("Failed to mark buy as paid: {}", e);
        ApiError::InternalServerError(format!("Failed to mark buy as paid: {}", e))
    })?;

    Ok(Json(BuyResponse::from(updated_buy)))
}

/// Cancel a buy
pub async fn cancel_buy(
    State(handlers): State<Arc<BuyHandlers>>,
    Json(request): Json<SignedRequest>,
) -> Result<Json<BuyResponse>, ApiError> {
    // Validate signature against the payload
    if !verify_message_signature_rsv(&request.payload, &request.signature, &request.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?
    {
        return Err(ApiError::BadRequest(
            "Signature verification failed".to_string(),
        ));
    }

    // Parse and validate the structured payload
    let parsed_payload = BuyCancelPayload::parse(&request.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

    // Parse the buy ID
    let buy_id = BuyId::from_string(parsed_payload.buy_id.clone())
        .map_err(|_| ApiError::BadRequest(format!("Invalid buy ID: {}", parsed_payload.buy_id)))?;

    // Derive the address from the public key (buyer verification)
    let buyer_address = get_address_from_public_key(&request.public_key, &handlers.config.network)
        .map_err(|e| ApiError::BadRequest(format!("Failed to derive address from public key: {}", e)))?;

    // Call the buy service to cancel (atomic operation with address verification)
    let cancelled_buy = handlers.buy_service.cancel_buy(
        buy_id,
        CryptoAddress::from_string(buyer_address),
    ).await?;

    Ok(Json(BuyResponse::from(cancelled_buy)))
}

pub struct BuyHandlers {
    buy_service: Arc<BuyService>,
    config: Arc<Config>,
}

impl BuyHandlers {
    pub fn new(buy_service: Arc<BuyService>, config: Arc<Config>) -> Self {
        Self {
            buy_service,
            config,
        }
    }
}

/// Start a new buy order
pub async fn start_buy(
    State(handlers): State<Arc<BuyHandlers>>,
    Json(request): Json<SignedRequest>,
) -> Result<Json<BuyResponse>, ApiError> {

    // Validate signature against the payload
    // Attempt to verify the signature and return early if invalid
    if !verify_message_signature_rsv(&request.payload, &request.signature, &request.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?
    {
        return Err(ApiError::BadRequest(
            "Signature verification failed".to_string(),
        ));
    }

    // Parse and validate the structured payload
    let parsed_payload = BuyCreatePayload::parse(&request.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload format: {}", e)))?;

// Validate that the address belongs to the public key
    if get_address_from_public_key(&request.public_key, &handlers.config.network)
        .map_err(|e| ApiError::BadRequest(format!("Failed to derive address from public key: {}", e)))?
        != parsed_payload.address_buy {
        return Err(ApiError::BadRequest("Address does not belong to public key".to_string()));
    }

    let buy = handlers.buy_service.start(
        AdvertisementId::from_string(parsed_payload.advertisement_id),
        parsed_payload.pay_value,
        parsed_payload.price,
        CryptoAddress::from_string(parsed_payload.address_buy),
    ).await.map_err(|e| {
        tracing::error!("Failed to create buy order: {}", e);
        ApiError::InternalServerError(format!("Failed to create buy order: {}", e))
    })?;

    // For now, return a simplified implementation
    // In a real implementation, this would:
    // 1. Validate the advertisement exists and is available
    // 2. Calculate price and fees
    // 3. Create the buy entity
    // 4. Save to repository
    // 5. Return the response
    
    // Mock response for demonstration
    // let mock_buy = CreateBuyResponse {
    //     buy_id: ObjectId::new().to_string(),
    //     advertisement_id: request.advertisement_id,
    //     amount: request.amount,
    //     price: 5000000, // Mock price
    //     fee: 500, // Mock fee
    //     total_fiat_amount: (request.amount * 5000000 / 100_000_000) + 500,
    //     address_buy: request.address_buy,
    //     pix_key: request.pix_key,
    //     status: "pending".to_string(),
    //     expires_at: (chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339(),
    //     created_at: chrono::Utc::now().to_rfc3339(),
    // };
    
    Ok(Json(BuyResponse::from(buy)))
}

/// Get a buy by ID
pub async fn get_buy(
    State(handlers): State<Arc<BuyHandlers>>,
    Path(id): Path<String>,
) -> Result<Json<BuyResponse>, ApiError> {
    // Parse the buy ID
    let buy_id = BuyId::from_string(id.clone())
        .map_err(|_| ApiError::BadRequest(format!("Invalid buy ID: {}", id)))?;

    // Find the buy in the repository
    let buy = handlers.buy_service.get_by_id(buy_id).await
        .map_err(|e| {
            tracing::error!("Failed to get buy {}: {}", id, e);
            ApiError::InternalServerError(format!("Failed to get buy: {}", e))
        })?
        .ok_or(ApiError::NotFound)?;

    Ok(Json(BuyResponse::from(buy)))
}

/// Get all buys for an advertisement
pub async fn get_buys_by_advertisement(
    State(handlers): State<Arc<BuyHandlers>>,
    Path(advertisement_id): Path<String>,
) -> Result<Json<Vec<BuyResponse>>, ApiError> {
    // Parse the advertisement ID - handle potential ObjectId parsing errors
    let adv_id = match ObjectId::parse_str(&advertisement_id) {
        Ok(object_id) => AdvertisementId::from_object_id(object_id),
        Err(_) => return Err(ApiError::BadRequest(format!("Invalid advertisement ID: {}", advertisement_id))),
    };

    // Find all buys for this advertisement
    let buys = handlers.buy_service.get_buys_by_advertisement_id(adv_id).await
        .map_err(|e| {
            tracing::error!("Failed to get buys for advertisement {}: {}", advertisement_id, e);
            ApiError::InternalServerError(format!("Failed to get buys for advertisement: {}", e))
        })?;

    // Convert to response DTOs
    let buy_responses: Vec<BuyResponse> = buys.into_iter()
        .map(BuyResponse::from)
        .collect();

    Ok(Json(buy_responses))
}

/// Get all buys in dispute
pub async fn get_disputed_buys(
    State(handlers): State<Arc<BuyHandlers>>,
) -> Result<Json<Vec<BuyResponse>>, ApiError> {
    // Find all buys with InDispute status
    let disputed_buys = handlers.buy_service.get_buys_by_status(&BuyStatus::InDispute).await
        .map_err(|e| {
            tracing::error!("Failed to get disputed buys: {}", e);
            ApiError::InternalServerError(format!("Failed to get disputed buys: {}", e))
        })?;

    // Convert to response DTOs
    let buy_responses: Vec<BuyResponse> = disputed_buys.into_iter()
        .map(BuyResponse::from)
        .collect();

    Ok(Json(buy_responses))
}

/// Get all buys by address with pagination
pub async fn get_buys_by_address(
    State(handlers): State<Arc<BuyHandlers>>,
    Path(address): Path<String>,
    Query(query): Query<ListBuysByAddressQuery>,
) -> Result<Json<PaginatedBuysResponse>, ApiError> {
    // Validate address format
    let crypto_address = CryptoAddress::from_string(address.clone());

    // Set pagination defaults
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(10).min(100); // Cap at 100 per request
    let skip = (page - 1) * limit;

    // Convert sort_order to MongoDB format
    let sort_order = match query.sort_order.as_deref().unwrap_or("desc") {
        "asc" => Some(1),
        "desc" => Some(-1),
        _ => Some(-1), // Default to descending
    };

    // Fetch one extra record to determine if there are more pages
    let fetch_limit = limit + 1;

    // Find buys with pagination
    let mut buys = handlers.buy_service.get_buys_by_address_paginated(
        crypto_address,
        skip,
        fetch_limit,
        query.sort_by,
        sort_order,
    ).await.map_err(|e| {
        tracing::error!("Failed to get buys for address {}: {}", address, e);
        ApiError::InternalServerError(format!("Failed to get buys for address: {}", e))
    })?;

    // Check if there are more records and remove the extra one if present
    let has_more = buys.len() > limit as usize;
    if has_more {
        buys.pop(); // Remove the extra record
    }

    // Convert to response DTOs
    let buy_responses: Vec<BuyResponse> = buys.into_iter()
        .map(BuyResponse::from)
        .collect();

    let response = PaginatedBuysResponse {
        buys: buy_responses,
        page,
        limit,
        has_more,
    };

    Ok(Json(response))
}
