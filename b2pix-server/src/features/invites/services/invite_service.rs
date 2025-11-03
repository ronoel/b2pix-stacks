use std::sync::Arc;
use tracing;

use crate::features::invites::domain::{
    entities::{Invite, InviteId, InviteCode},
    commands::{SendInviteCommand, ClaimInviteCommand, BlockInviteCommand, CancelInviteCommand, SetBankCredentialsCommand, SetCertificateCommand, BankSetupCommand},
    events::{InviteSentEvent, InviteClaimedEvent, InviteBlockedEvent, InviteCanceledEvent}
};
use crate::features::invites::ports::InviteRepository;
use crate::features::shared::{Email, StacksAddress};
use crate::common::errors::InviteError;
use crate::events::publisher::EventPublisher;
use crate::events::publisher_ext::EventPublisherExt;

pub struct InviteService {
    invite_repository: Arc<dyn InviteRepository>,
    event_publisher: Arc<EventPublisher>,
}

impl InviteService {
    pub fn new(
        invite_repository: Arc<dyn InviteRepository>,
        event_publisher: Arc<EventPublisher>,
    ) -> Self {
        Self {
            invite_repository,
            event_publisher,
        }
    }

    pub async fn send_invite(
        &self,
        command: SendInviteCommand,
    ) -> Result<InviteId, InviteError> {

        // Criar o invite
        let invite = Invite::new(command.email.clone(), command.parent_id.clone());
        let invite_id = invite.id().clone();

        // Persistir o invite
        self.invite_repository.save(&invite).await?;

        // Publicar evento
        let event = InviteSentEvent {
            invite_id: invite.id().clone(),
            email: invite.email().clone(),
            code: invite.code().clone(),
            parent_id: invite.parent_id().clone(),
            sent_at: *invite.created_at(),
        };

        if let Err(e) = self.event_publisher
            .publish_domain_event(&event, "InviteService::send_invite")
            .await 
        {
            tracing::warn!("Failed to publish invite sent event: {:?}", e);
        }

        Ok(invite_id)
    }

    pub async fn claim_invite(
        &self,
        command: ClaimInviteCommand,
    ) -> Result<(), InviteError> {
        // Buscar o invite pelo código
        let mut invite = self.invite_repository.find_by_code(&command.code).await?
            .ok_or(InviteError::NoContent)?;

        // Realizar o claim do invite
        invite.claim(command.username.clone(), command.address.clone())?;

        // Atualizar o invite no banco
        self.invite_repository.save(&invite).await?;

        // Publicar evento
        let event = InviteClaimedEvent {
            invite_id: invite.id().clone(),
            email: invite.email().clone(),
            username: command.username,
            address: command.address,
            claimed_at: invite.claimed_at().unwrap(),
        };

        if let Err(e) = self.event_publisher
            .publish_domain_event(&event, "InviteService::claim_invite")
            .await 
        {
            tracing::warn!("Failed to publish invite claimed event: {:?}", e);
        }

        Ok(())
    }

    pub async fn block_invite(
        &self,
        command: BlockInviteCommand,
    ) -> Result<(), InviteError> {
        let mut invite = self.invite_repository.find_by_code(&command.code).await?
            .ok_or(InviteError::NoContent)?;

        invite.block()?;
        self.invite_repository.save(&invite).await?;

        // Publicar evento
        let event = InviteBlockedEvent {
            invite_id: invite.id().clone(),
            email: invite.email().clone(),
            blocked_at: chrono::Utc::now(),
            blocked_by: command.authorized_by,
        };

        if let Err(e) = self.event_publisher
            .publish_domain_event(&event, "InviteService::block_invite")
            .await 
        {
            tracing::warn!("Failed to publish invite blocked event: {:?}", e);
        }

        Ok(())
    }

    pub async fn cancel_invite(
        &self,
        command: CancelInviteCommand,
    ) -> Result<(), InviteError> {
        let mut invite = self.invite_repository.find_by_code(&command.code).await?
            .ok_or(InviteError::NoContent)?;

        invite.cancel()?;
        self.invite_repository.save(&invite).await?;

        // Publicar evento
        let event = InviteCanceledEvent {
            invite_id: invite.id().clone(),
            email: invite.email().clone(),
            canceled_at: chrono::Utc::now(),
            canceled_by: command.authorized_by,
        };

        if let Err(e) = self.event_publisher
            .publish_domain_event(&event, "InviteService::cancel_invite")
            .await 
        {
            tracing::warn!("Failed to publish invite canceled event: {:?}", e);
        }

        Ok(())
    }

    pub async fn get_invite_by_code(
        &self,
        code: &InviteCode,
    ) -> Result<Option<Invite>, InviteError> {
        self.invite_repository.find_by_code(code).await
    }

    pub async fn get_invite_by_email(
        &self,
        email: &Email,
    ) -> Result<Option<Invite>, InviteError> {
        self.invite_repository.find_by_email(email).await
    }

    pub async fn get_invite_by_id(
        &self,
        id: &InviteId,
    ) -> Result<Option<Invite>, InviteError> {
        self.invite_repository.find_by_id(id).await
    }

    pub async fn get_invite_by_address(
        &self,
        address: &StacksAddress,
    ) -> Result<Option<Invite>, InviteError> {
        self.invite_repository.find_by_address(address).await
    }

    pub async fn set_bank_credentials(
        &self,
        command: SetBankCredentialsCommand,
    ) -> Result<(), InviteError> {
        // This method is deprecated - use bank_setup instead for comprehensive setup
        tracing::warn!("set_bank_credentials is deprecated, use bank_setup instead");
        let _ = command; // Suppress unused warning
        Err(InviteError::Internal("Method deprecated - use bank_setup endpoint".to_string()))
    }

    pub async fn set_certificate(
        &self,
        command: SetCertificateCommand,
        gcs_manager: &crate::infrastructure::storage::gcs_manager::GcsManager,
    ) -> Result<(), InviteError> {
        // This method is deprecated - use bank_setup instead for comprehensive setup
        tracing::warn!("set_certificate is deprecated, use bank_setup instead");
        let _ = (command, gcs_manager); // Suppress unused warnings
        Err(InviteError::Internal("Method deprecated - use bank_setup endpoint".to_string()))
    }

    pub async fn bank_setup(
        &self,
        command: BankSetupCommand
    ) -> Result<(), InviteError> {
        // This method is deprecated - banking credentials are now managed by BankCredentialsService
        // This endpoint is kept for backward compatibility but should redirect to new service
        tracing::warn!("InviteService::bank_setup is deprecated, use BankCredentialsService::create_bank_credentials instead");

        let address = StacksAddress::from_string(command.address.clone());
        let mut invite = self.invite_repository.find_by_address(&address).await?
            .ok_or(InviteError::NoContent)?;

        // For backward compatibility, just update the bank status
        // The actual credentials should be managed through BankCredentialsService
        invite.set_bank_status(crate::features::invites::domain::entities::BankStatus::PROCESSING);
        self.invite_repository.save(&invite).await?;

        Err(InviteError::Internal("Method deprecated - use /api/v1/bank-credentials/banksetup endpoint instead".to_string()))
    }

    /// Update bank status for an invite
    pub async fn update_bank_status(
        &self,
        invite_id: &InviteId,
        status: crate::features::invites::domain::entities::BankStatus,
    ) -> Result<(), InviteError> {
        // Get the invite
        let mut invite = self.invite_repository
            .find_by_id(invite_id)
            .await?
            .ok_or(InviteError::NoContent)?;

        // Update the bank status
        invite.set_bank_status(status);

        // Save the updated invite
        self.invite_repository.save(&invite).await?;

        Ok(())
    }
}
