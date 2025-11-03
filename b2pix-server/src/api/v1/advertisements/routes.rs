use std::sync::Arc;
use axum::{
    routing::{get, post, put},
    Router,
};

use crate::{
    api::v1::advertisements::handlers::{
        create_advertisement, create_deposit, get_advertisement, get_advertisements_by_address,
        list_advertisements, list_deposits, update_advertisement, finish_advertisement, AdvertisementHandlers
    },
    config::Config,
    features::{
        advertisements::services::AdvertisementService,
        advertisement_deposits::services::AdvertisementDepositService,
    },
};

/// Create and configure advertisement routes
pub fn advertisement_routes(
    advertisement_service: Arc<AdvertisementService>,
    deposit_service: Arc<AdvertisementDepositService>,
    config: Arc<Config>
) -> Router {
    // Create handlers with all dependencies
    let handlers = Arc::new(AdvertisementHandlers::new(
        advertisement_service,
        deposit_service,
        config,
    ));

    Router::new()
        // POST /advertisements - Create new advertisement
        .route("/", post(create_advertisement))
        // GET /advertisements - List advertisements with filtering
        .route("/", get(list_advertisements))
        // PUT /advertisements - Update advertisement (close with signature, ID in payload)
        .route("/", put(update_advertisement))
        // PUT /advertisements/finish - Finish advertisement (change status to Finishing with signature)
        .route("/finish", put(finish_advertisement))
        // GET /advertisements/:id - Get advertisement by ID
        .route("/:id", get(get_advertisement))
        // POST /advertisements/:id/deposits - Create a recharge deposit for an advertisement
        .route("/:id/deposits", post(create_deposit))
        // GET /advertisements/:id/deposits - List all deposits for an advertisement
        .route("/:id/deposits", get(list_deposits))
        // GET /advertisements/address/:address - Get advertisements by address
        .route("/address/:address", get(get_advertisements_by_address))
        .with_state(handlers)
}
