use async_trait::async_trait;
use crate::common::errors::AdvertisementDepositError;
use crate::features::advertisement_deposits::domain::entities::{
    AdvertisementDeposit, AdvertisementDepositId, AdvertisementDepositStatus,
};
use crate::features::advertisements::domain::entities::AdvertisementId;

#[async_trait]
pub trait AdvertisementDepositRepository: Send + Sync {
    /// Save or update a deposit
    async fn save(&self, deposit: &AdvertisementDeposit) -> Result<(), AdvertisementDepositError>;

    /// Find deposit by ID
    async fn find_by_id(
        &self,
        id: &AdvertisementDepositId,
    ) -> Result<Option<AdvertisementDeposit>, AdvertisementDepositError>;

    /// Find all deposits for an advertisement
    async fn find_by_advertisement_id(
        &self,
        advertisement_id: &AdvertisementId,
    ) -> Result<Vec<AdvertisementDeposit>, AdvertisementDepositError>;

    /// Find deposits by status
    async fn find_by_status(
        &self,
        status: &AdvertisementDepositStatus,
    ) -> Result<Vec<AdvertisementDeposit>, AdvertisementDepositError>;

    /// Find pending deposits for an advertisement
    async fn find_pending_by_advertisement_id(
        &self,
        advertisement_id: &AdvertisementId,
    ) -> Result<Vec<AdvertisementDeposit>, AdvertisementDepositError>;

    /// Count deposits for an advertisement
    async fn count_by_advertisement_id(
        &self,
        advertisement_id: &AdvertisementId,
    ) -> Result<u64, AdvertisementDepositError>;

    /// Delete a deposit (for testing purposes mainly)
    async fn delete(&self, id: &AdvertisementDepositId) -> Result<bool, AdvertisementDepositError>;
}
