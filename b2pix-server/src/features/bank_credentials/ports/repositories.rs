use async_trait::async_trait;
use crate::features::bank_credentials::domain::entities::{BankCredentials, BankCredentialsId};
use crate::features::shared::StacksAddress;
use crate::common::errors::InviteError;

#[async_trait]
pub trait BankCredentialsRepository: Send + Sync {
    /// Save or update bank credentials
    async fn save(&self, credentials: &BankCredentials) -> Result<(), InviteError>;

    /// Find bank credentials by ID
    async fn find_by_id(&self, id: &BankCredentialsId) -> Result<Option<BankCredentials>, InviteError>;

    /// Find the latest (most recent) active bank credentials by address
    async fn find_latest_by_address(&self, address: &StacksAddress) -> Result<Option<BankCredentials>, InviteError>;

    /// Find all bank credentials for an address (history)
    async fn find_all_by_address(&self, address: &StacksAddress) -> Result<Vec<BankCredentials>, InviteError>;
}
