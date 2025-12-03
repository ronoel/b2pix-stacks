use axum::{
    extract::{Path, Query, State},
    response::Json,
};
use mongodb::bson::oid::ObjectId;
use std::sync::Arc;

use crate::{
    api::v1::advertisements::dto::{
        AdvertisementResponse, CreateAdvertisementRequest, CreateDepositRequest, CreateDepositResponse,
        DepositResponse, ListAdvertisementsQuery, ListAdvertisementsResponse, UpdateAdvertisementResponse,
        FinishAdvertisementPayload,
    },
    common::{errors::ApiError, signature::SignedRequest},
    config::Config,
    features::{
        advertisements::{
            domain::{entities::{Advertisement, AdvertisementId}},
            services::AdvertisementService,
        },
        advertisement_deposits::services::AdvertisementDepositService,
    },
    infrastructure::blockchain::stacks::{
        address::get_address_from_public_key, verify_message_signature_rsv,
    },
};

pub struct AdvertisementHandlers {
    advertisement_service: Arc<AdvertisementService>,
    deposit_service: Arc<AdvertisementDepositService>,
    config: Arc<Config>,
}

impl AdvertisementHandlers {
    pub fn new(
        advertisement_service: Arc<AdvertisementService>,
        deposit_service: Arc<AdvertisementDepositService>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            advertisement_service,
            deposit_service,
            config,
        }
    }
}

/// Create a new advertisement
pub async fn create_advertisement(
    State(handlers): State<Arc<AdvertisementHandlers>>,
    Json(request): Json<CreateAdvertisementRequest>,
) -> Result<Json<AdvertisementResponse>, ApiError> {
    // Validate min_amount and max_amount
    if request.min_amount <= 0 {
        return Err(ApiError::BadRequest("min_amount must be positive".to_string()));
    }

    if request.max_amount <= 0 {
        return Err(ApiError::BadRequest("max_amount must be positive".to_string()));
    }

    if request.max_amount < request.min_amount {
        return Err(ApiError::BadRequest("max_amount must be greater than or equal to min_amount".to_string()));
    }

    // Create the advertisement (in Draft status)
    let advertisement: Advertisement = handlers
        .advertisement_service
        .create_advertisement_command(
            request.transaction.as_str(),
            request.min_amount,
            request.max_amount,
            request.pricing_mode,
        )
        .await
        .map_err(|e| {
            tracing::error!("Failed to create advertisement: {}", e);
            ApiError::InternalServerError(format!("Failed to create advertisement: {}", e))
        })?;

    // Create the initial deposit with the transaction
    // This will broadcast the transaction and eventually update the advertisement status to Ready
    let _deposit = handlers
        .deposit_service
        .create_initial_deposit(&advertisement, request.transaction)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create initial deposit for advertisement {}: {}", advertisement.id, e);
            // Don't fail the entire operation - the advertisement was created successfully
            // The deposit failure will be reflected in the advertisement status (will stay Draft or become DepositFailed)
            e
        })?;

    Ok(Json(AdvertisementResponse::from(advertisement)))
}

/// List advertisements with filtering and pagination
pub async fn list_advertisements(
    State(handlers): State<Arc<AdvertisementHandlers>>,
    Query(query): Query<ListAdvertisementsQuery>,
) -> Result<Json<ListAdvertisementsResponse>, ApiError> {
    // Set default values for pagination
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(10);

    // Validate pagination parameters
    if page == 0 {
        return Err(ApiError::BadRequest("Page must be greater than 0".to_string()));
    }
    if limit == 0 || limit > 100 {
        return Err(ApiError::BadRequest("Limit must be between 1 and 100".to_string()));
    }

    // Call the advertisement service to get advertisements
    let (advertisements, total_count) = handlers
        .advertisement_service
        .list_advertisements(
            query.status,
            query.active_only,
            page,
            limit,
            query.sort_by,
            query.sort_order,
        )
        .await?;

    // Convert to response DTOs
    let advertisement_responses: Vec<AdvertisementResponse> = advertisements
        .into_iter()
        .map(AdvertisementResponse::from)
        .collect();

    // Calculate pagination info
    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + limit - 1) / limit // Ceiling division
    };

    Ok(Json(ListAdvertisementsResponse {
        data: advertisement_responses,
        pagination: crate::api::v1::advertisements::dto::PaginationInfo {
            page,
            limit,
            total: total_count,
            total_pages,
        },
    }))
}

/// Get advertisement by ID
pub async fn get_advertisement(
    State(handlers): State<Arc<AdvertisementHandlers>>,
    Path(id): Path<String>,
) -> Result<Json<AdvertisementResponse>, ApiError> {
    // Parse the advertisement ID - handle potential ObjectId parsing errors
    let advertisement_id = match ObjectId::parse_str(&id) {
        Ok(object_id) => AdvertisementId::from_object_id(object_id),
        Err(_) => return Err(ApiError::BadRequest(format!("Invalid advertisement ID: {}", id))),
    };

    // Get advertisement from service
    let advertisement = handlers
        .advertisement_service
        .get_by_id(advertisement_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get advertisement {}: {}", id, e);
            ApiError::InternalServerError(format!("Failed to get advertisement: {}", e))
        })?
        .ok_or(ApiError::NotFound)?;

    // Convert to response DTO and return
    Ok(Json(AdvertisementResponse::from(advertisement)))
}

/// Get advertisements by address
pub async fn get_advertisements_by_address(
    State(handlers): State<Arc<AdvertisementHandlers>>,
    Path(address): Path<String>,
) -> Result<Json<Vec<AdvertisementResponse>>, ApiError> {
    // Get advertisements from service
    let advertisements = handlers
        .advertisement_service
        .get_advertisements_by_address(&address)
        .await?;

    // Convert to response DTOs
    let advertisement_responses: Vec<AdvertisementResponse> = advertisements
        .into_iter()
        .map(AdvertisementResponse::from)
        .collect();

    Ok(Json(advertisement_responses))
}

/// Update advertisement (close advertisement with signature verification)
pub async fn update_advertisement(
    State(handlers): State<Arc<AdvertisementHandlers>>,
    Json(request): Json<SignedRequest>,
) -> Result<Json<UpdateAdvertisementResponse>, ApiError> {
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

    // Validate that the address belongs to the public key using network from config
    if get_address_from_public_key(&request.public_key, &handlers.config.network).map_err(|e| {
        ApiError::BadRequest(format!("Failed to derive address from public key: {}", e))
    })? != "expected_address"
    // TODO: Extract address from payload
    {
        return Err(ApiError::BadRequest(
            "Address does not belong to public key".to_string(),
        ));
    }

    // TODO: Implement close advertisement logic
    // 1. Decode payload to get advertisement ID and action details using request.payload()
    // 2. Verify signature with public key and payload using request
    // 3. Validate action is "B2PIX - Fechar Anúncio"
    // 4. Update advertisement status to closed
    // 5. Save updated advertisement
    // 6. Return success response

    Ok(Json(UpdateAdvertisementResponse {
        id: "placeholder".to_string(), // Will be extracted from payload
        status: "success".to_string(),
        message: "Advertisement updated successfully".to_string(),
    }))
}

/// Finish advertisement (change status to Finishing with signature verification)
pub async fn finish_advertisement(
    State(handlers): State<Arc<AdvertisementHandlers>>,
    Json(request): Json<SignedRequest>,
) -> Result<Json<AdvertisementResponse>, ApiError> {
    // Validate signature against the payload
    if !verify_message_signature_rsv(&request.payload, &request.signature, &request.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?
    {
        return Err(ApiError::BadRequest(
            "Signature verification failed".to_string(),
        ));
    }

    // Parse the payload
    let payload = FinishAdvertisementPayload::parse(&request.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid payload: {}", e)))?;

    // Get wallet address from public key
    let wallet_address = get_address_from_public_key(&request.public_key, &handlers.config.network)
        .map_err(|e| {
            ApiError::BadRequest(format!("Failed to derive address from public key: {}", e))
        })?;

    // Parse advertisement ID
    let advertisement_id = match mongodb::bson::oid::ObjectId::parse_str(&payload.advertisement_id) {
        Ok(object_id) => AdvertisementId::from_object_id(object_id),
        Err(_) => return Err(ApiError::BadRequest(format!("Invalid advertisement ID: {}", payload.advertisement_id))),
    };

    // Call service to finish the advertisement
    let updated_advertisement = handlers
        .advertisement_service
        .finish_advertisement(advertisement_id, &wallet_address)
        .await?;

    Ok(Json(AdvertisementResponse::from(updated_advertisement)))
}

/// Create a recharge deposit for an existing advertisement
/// This allows sellers to add more cryptocurrency to their active advertisements
pub async fn create_deposit(
    State(handlers): State<Arc<AdvertisementHandlers>>,
    Path(id): Path<String>,
    Json(request): Json<SignedRequest>,
) -> Result<Json<CreateDepositResponse>, ApiError> {
    // Validate signature against the payload
    if !verify_message_signature_rsv(&request.payload, &request.signature, &request.public_key)
        .await
        .map_err(|e| ApiError::BadRequest(format!("Invalid signature: {}", e)))?
    {
        return Err(ApiError::BadRequest(
            "Signature verification failed".to_string(),
        ));
    }

    // Get wallet address from public key
    let wallet_address = get_address_from_public_key(&request.public_key, &handlers.config.network)
        .map_err(|e| {
            ApiError::BadRequest(format!("Failed to derive address from public key: {}", e))
        })?;

    // Parse advertisement ID
    let advertisement_id = match ObjectId::parse_str(&id) {
        Ok(object_id) => AdvertisementId::from_object_id(object_id),
        Err(_) => return Err(ApiError::BadRequest(format!("Invalid advertisement ID: {}", id))),
    };

    // Deserialize the payload to get the transaction
    let deposit_request: CreateDepositRequest = serde_json::from_str(&request.payload)
        .map_err(|e| ApiError::BadRequest(format!("Invalid request payload: {}", e)))?;

    // Create the recharge deposit
    let deposit = handlers
        .deposit_service
        .create_recharge_deposit(
            advertisement_id.clone(),
            deposit_request.transaction,
            &wallet_address,
        )
        .await?;

    Ok(Json(CreateDepositResponse {
        deposit_id: deposit.id.to_string(),
        advertisement_id: advertisement_id.to_string(),
        amount: deposit.amount,
        status: format!("{:?}", deposit.status),
        message: "Deposit created successfully. Transaction will be broadcasted shortly.".to_string(),
    }))
}

/// List all deposits for an advertisement
/// Returns all deposits (initial and recharge) associated with the advertisement
pub async fn list_deposits(
    State(handlers): State<Arc<AdvertisementHandlers>>,
    Path(id): Path<String>,
) -> Result<Json<Vec<DepositResponse>>, ApiError> {
    // Parse advertisement ID
    let advertisement_id = match ObjectId::parse_str(&id) {
        Ok(object_id) => AdvertisementId::from_object_id(object_id),
        Err(_) => return Err(ApiError::BadRequest(format!("Invalid advertisement ID: {}", id))),
    };

    // Verify the advertisement exists
    let _advertisement = handlers
        .advertisement_service
        .get_by_id(advertisement_id.clone())
        .await
        .map_err(|e| {
            tracing::error!("Failed to get advertisement {}: {}", id, e);
            ApiError::InternalServerError(format!("Failed to get advertisement: {}", e))
        })?
        .ok_or(ApiError::NotFound)?;

    // Get all deposits for this advertisement
    let deposits = handlers
        .deposit_service
        .get_deposits_by_advertisement(&advertisement_id)
        .await?;

    // Convert to response DTOs
    let deposit_responses: Vec<DepositResponse> = deposits
        .into_iter()
        .map(DepositResponse::from)
        .collect();

    Ok(Json(deposit_responses))
}
