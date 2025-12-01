use async_trait::async_trait;
use crate::features::buys::domain::entities::{Buy, BuyId, BuyStatus};
use crate::features::advertisements::domain::entities::AdvertisementId;
use crate::features::shared::value_objects::{CryptoAddress, PixKey};
use crate::common::errors::BuyError;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait BuyRepository: Send + Sync {
    /// Save a buy (create or update)
    async fn save(&self, buy: &Buy) -> Result<(), BuyError>;

    /// Expire a buy by ID if its status is "pending"
    async fn expire(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;

    /// Cancel a buy by ID and address if its status is "pending" (atomic operation)
    async fn cancel(&self, id: &BuyId, address_buy: &CryptoAddress) -> Result<Option<Buy>, BuyError>;

    /// Find all pending buys created more than the specified number of minutes ago
    async fn find_pending_older_than_minutes(&self, minutes: i64) -> Result<Vec<Buy>, BuyError>;

    /// Mark a buy as paid by ID with optional PIX confirmation code
    async fn mark_as_paid(&self, id: &BuyId, pix_confirmation_code: Option<String>) -> Result<Option<Buy>, BuyError>;
    
    /// Mark a buy as dispute resolved seller
    async fn mark_as_dispute_resolved_seller(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;

    /// Mark a buy as dispute resolved buyer
    async fn mark_as_dispute_resolved_buyer(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;

    /// Increment pix verification attempts for a buy
    async fn increment_pix_verification_attempts(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;

    /// Mark a buy as payment confirmed
    async fn mark_as_payment_confirmed(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;

    /// Mark a buy as payment confirmed with PIX end-to-end transaction ID
    async fn mark_as_payment_confirmed_with_transaction(&self, id: &BuyId, end_to_end_id: &str) -> Result<Option<Buy>, BuyError>;

    /// Mark a buy as in dispute
    async fn mark_as_in_dispute(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;

    /// Mark a buy as dispute favor buyer (temporary state before resolution)
    async fn mark_as_dispute_favor_buyer(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;

    /// Mark a buy as dispute favor seller (temporary state before resolution)
    async fn mark_as_dispute_favor_seller(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;

    /// Find buy by ID
    async fn find_by_id(&self, id: &BuyId) -> Result<Option<Buy>, BuyError>;
    
    /// Find buys by advertisement ID
    async fn find_by_advertisement_id(&self, advertisement_id: &AdvertisementId) -> Result<Vec<Buy>, BuyError>;
    
    /// Find buys by buyer address
    async fn find_by_buyer_address(&self, address: &CryptoAddress) -> Result<Vec<Buy>, BuyError>;

    /// Find buys by buyer address with pagination
    async fn find_by_buyer_address_paginated(
        &self,
        address: &CryptoAddress,
        skip: u64,
        limit: u64,
        sort_by: Option<String>,
        sort_order: Option<i32>,
    ) -> Result<Vec<Buy>, BuyError>;
    
    // /// Find buys by PIX key
    // async fn find_by_pix_key(&self, pix_key: &PixKey) -> Result<Vec<Buy>, BuyError>;
    
    /// Find buys by status
    async fn find_by_status(&self, status: &BuyStatus) -> Result<Vec<Buy>, BuyError>;
    
    
    

    /// Get buys with pagination
    async fn find_paginated(
        &self,
        skip: u64,
        limit: u64,
        sort_by: Option<String>,
        sort_order: Option<i32>, // 1 for ascending, -1 for descending
    ) -> Result<Vec<Buy>, BuyError>;
    
}
