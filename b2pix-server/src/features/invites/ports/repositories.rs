use async_trait::async_trait;
use crate::features::invites::domain::entities::{Invite, InviteId, InviteCode, InviteStatus};
use crate::features::shared::{StacksAddress, Username, Email};
use crate::common::errors::InviteError;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait InviteRepository: Send + Sync {
    async fn save(&self, invite: &Invite) -> Result<(), InviteError>;
    async fn find_by_id(&self, id: &InviteId) -> Result<Option<Invite>, InviteError>;
    async fn find_by_code(&self, code: &InviteCode) -> Result<Option<Invite>, InviteError>;
    async fn find_by_address(&self, address: &StacksAddress) -> Result<Option<Invite>, InviteError>;
    async fn find_by_username(&self, username: &Username) -> Result<Option<Invite>, InviteError>;
    async fn find_by_email(&self, email: &Email) -> Result<Option<Invite>, InviteError>;
    async fn find_by_status(&self, status: &InviteStatus) -> Result<Vec<Invite>, InviteError>;
    async fn delete(&self, id: &InviteId) -> Result<bool, InviteError>;
}
