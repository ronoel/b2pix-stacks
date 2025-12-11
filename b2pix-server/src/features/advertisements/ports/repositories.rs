use async_trait::async_trait;
use crate::features::advertisements::domain::entities::{Advertisement, AdvertisementId, AdvertisementStatus, PricingMode};
use crate::features::shared::value_objects::{CryptoAddress, Token, Currency};
use crate::common::errors::AdvertisementError;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait AdvertisementRepository: Send + Sync {
    /// Save an advertisement (create or update)
    async fn save(&self, advertisement: &Advertisement) -> Result<(), AdvertisementError>;
    
    /// Find advertisement by ID
    async fn find_by_id(&self, id: &AdvertisementId) -> Result<Option<Advertisement>, AdvertisementError>;
    
    /// Find advertisements by seller address
    async fn find_by_seller_address(&self, address: &CryptoAddress) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Find advertisements by token
    async fn find_by_token(&self, token: &Token) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Find advertisements by currency
    async fn find_by_currency(&self, currency: &Currency) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Find advertisements by token and currency pair
    async fn find_by_token_and_currency(&self, token: &Token, currency: &Currency) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Find advertisements by status
    async fn find_by_status(&self, status: &AdvertisementStatus) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Find available advertisements (ready status with remaining funds > 0)
    async fn find_available(&self) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Find available advertisements for a specific token/currency pair
    async fn find_available_by_pair(&self, token: &Token, currency: &Currency) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Find advertisements with low funds (below threshold percentage)
    async fn find_low_funds(&self, threshold_percentage: f64) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Find advertisements created within a date range
    async fn find_by_date_range(
        &self, 
        from: chrono::DateTime<chrono::Utc>, 
        to: chrono::DateTime<chrono::Utc>
    ) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Get advertisements with pagination
    async fn find_paginated(
        &self,
        skip: u64,
        limit: u64,
        sort_by: Option<String>,
        sort_order: Option<i32>, // 1 for ascending, -1 for descending
    ) -> Result<Vec<Advertisement>, AdvertisementError>;
    
    /// Count total advertisements
    async fn count(&self) -> Result<u64, AdvertisementError>;
    
    /// Count advertisements by status
    async fn count_by_status(&self, status: &AdvertisementStatus) -> Result<u64, AdvertisementError>;
    
    /// Count advertisements by seller address
    async fn count_by_seller_address(&self, address: &CryptoAddress) -> Result<u64, AdvertisementError>;
    
    /// Delete advertisement by ID
    async fn delete(&self, id: &AdvertisementId) -> Result<bool, AdvertisementError>;
    
    /// Bulk update status for multiple advertisements
    async fn bulk_update_status(
        &self,
        ids: &[AdvertisementId],
        new_status: AdvertisementStatus,
    ) -> Result<u64, AdvertisementError>;
    
    /// Get aggregated statistics
    async fn get_statistics(&self) -> Result<AdvertisementStatistics, AdvertisementError>;
    
    /// Update available amount by decrementing it atomically
    /// Returns the updated advertisement if successful
    /// Fails if advertisement not found or insufficient available amount
    async fn update_available_amount(
        &self,
        advertisement_id: &AdvertisementId,
        amount: &u128,
    ) -> Result<Option<Advertisement>, AdvertisementError>;
    
    /// Refund amount by incrementing available_amount atomically
    /// Returns the updated advertisement if successful
    /// Fails if advertisement not found
    async fn refund_available_amount(
        &self,
        advertisement_id: &AdvertisementId,
        amount: &u128,
    ) -> Result<Option<Advertisement>, AdvertisementError>;

    /// Add deposited amount by incrementing both total_deposited and available_amount atomically
    /// Used when a deposit is confirmed on-chain
    /// Returns the updated advertisement if successful
    async fn add_deposited_amount(
        &self,
        advertisement_id: &AdvertisementId,
        amount: &u128,
    ) -> Result<Option<Advertisement>, AdvertisementError>;

    /// Update pricing mode and amounts atomically with ownership and status validation
    /// Only updates if:
    /// - Advertisement exists with the given ID
    /// - seller_address matches the provided address (ownership check)
    /// - Status is NOT Finishing, Closed, or Disabled
    /// Returns the updated advertisement if successful, None if conditions not met
    async fn update_pricing_mode_atomic(
        &self,
        advertisement_id: &AdvertisementId,
        seller_address: &str,
        new_pricing_mode: &PricingMode,
        min_amount: i64,
        max_amount: i64,
    ) -> Result<Option<Advertisement>, AdvertisementError>;
}

/// Advertisement repository statistics
#[derive(Debug, Clone)]
pub struct AdvertisementStatistics {
    pub total_count: u64,
    pub draft_count: u64,
    pub ready_count: u64,
    pub bank_failed_count: u64,
    pub closed_count: u64,
    pub disabled_count: u64,
    pub total_fund_amount: u128,
    pub total_remaining_amount: u128,
    pub average_price: f64,
    pub most_popular_token: Option<String>,
    pub most_popular_currency: Option<String>,
}

impl AdvertisementStatistics {
    pub fn utilization_percentage(&self) -> f64 {
        if self.total_fund_amount == 0 {
            return 0.0;
        }
        
        let used_amount = self.total_fund_amount - self.total_remaining_amount;
        (used_amount as f64 / self.total_fund_amount as f64) * 100.0
    }
    
    pub fn active_percentage(&self) -> f64 {
        if self.total_count == 0 {
            return 0.0;
        }
        
        (self.ready_count as f64 / self.total_count as f64) * 100.0
    }
}
