use std::sync::Arc;
use tracing;

use crate::features::bank_credentials::domain::{
    entities::{BankCredentials, BankCredentialsId},
    commands::{CreateBankCredentialsCommand, RevokeBankCredentialsCommand},
    events::{BankCredentialsCreatedEvent, BankCredentialsRevokedEvent}
};
use crate::features::bank_credentials::ports::BankCredentialsRepository;
use crate::features::shared::StacksAddress;
use crate::common::errors::InviteError;
use crate::events::publisher::EventPublisher;
use crate::events::publisher_ext::EventPublisherExt;
use crate::services::banking::efi_pay::EfiPayClient;

pub struct BankCredentialsService {
    bank_credentials_repository: Arc<dyn BankCredentialsRepository>,
    event_publisher: Arc<EventPublisher>,
}

impl BankCredentialsService {
    pub fn new(
        bank_credentials_repository: Arc<dyn BankCredentialsRepository>,
        event_publisher: Arc<EventPublisher>,
    ) -> Self {
        Self {
            bank_credentials_repository,
            event_publisher,
        }
    }

    pub async fn create_bank_credentials(
        &self,
        command: CreateBankCredentialsCommand,
    ) -> Result<BankCredentialsId, InviteError> {
        // Upload certificate to Google Cloud Storage
        let gcs_manager = crate::infrastructure::storage::gcs_manager::GcsManager::new().await
            .map_err(|e| InviteError::Internal(format!("Failed to initialize GCS manager: {}", e)))?;

        let certificate_filename = format!("efi_pay_certificate_{}.p12", command.address.as_str());
        let certificate_bytes = bytes::Bytes::from(command.certificate_data.clone());
        let certificate_gcs_path = gcs_manager
            .upload_certificate(certificate_bytes, command.address.as_str(), &certificate_filename)
            .await
            .map_err(|e| InviteError::Internal(format!("Failed to upload certificate: {}", e)))?;

        // Test authentication with EFI Pay using the credentials and certificate
        let base_url = "https://pix.api.efipay.com.br".to_string(); // production mode
        let efi_pay_client = EfiPayClient::new(
            base_url,
            command.client_id.clone(),
            command.secret_key.clone(),
            command.certificate_data.clone(),
        ).map_err(|e| InviteError::Internal(format!("Failed to create EFI Pay client: {}", e)))?;

        // Test authentication and get OAuth response with full details
        let oauth_response = match efi_pay_client.authenticate().await {
            Ok(response) => response,
            Err(e) => {
                tracing::error!("Failed to authenticate with EFI Pay: {}", e);
                return Err(InviteError::InvalidCredentials(format!("EFI Pay authentication failed: {}", e)));
            }
        };

        // Validate required scopes for PIX operations
        let required_scopes = vec!["gn.pix.evp.read", "gn.pix.evp.write", "pix.read"];
        let granted_scopes: Vec<&str> = oauth_response.scope.split_whitespace().collect();

        // Collect all missing scopes instead of returning on first error
        let mut missing_scopes = Vec::new();
        for required_scope in &required_scopes {
            if !granted_scopes.contains(required_scope) {
                missing_scopes.push(*required_scope);
            }
        }

        // If there are missing scopes, return a comprehensive error message
        if !missing_scopes.is_empty() {
            tracing::error!("Missing required scopes: {:?}", missing_scopes);
            tracing::error!("Required scopes: {:?}", required_scopes);
            tracing::error!("Granted scopes: {:?}", granted_scopes);

            return Err(InviteError::InvalidCredentials(format!(
                "EFI Pay authentication missing required scopes: [{}]. Required: [{}]. Granted: '{}'",
                missing_scopes.join(", "),
                required_scopes.join(", "),
                oauth_response.scope
            )));
        }

        // Create the bank credentials entity
        let credentials = BankCredentials::new(
            command.address.clone(),
            command.client_id.clone(),
            command.secret_key.clone(),
            certificate_gcs_path.clone(),
        );
        let credentials_id = credentials.id().clone();

        // Persist the credentials
        self.bank_credentials_repository.save(&credentials).await?;

        // Publish event
        let event = BankCredentialsCreatedEvent {
            credentials_id: credentials.id().clone(),
            address: credentials.address().clone(),
            certificate_gcs_path: certificate_gcs_path.clone(),
            created_at: *credentials.created_at(),
            created_by: command.authorized_by,
        };

        if let Err(e) = self.event_publisher
            .publish_domain_event(&event, "BankCredentialsService::create_bank_credentials")
            .await
        {
            tracing::warn!("Failed to publish bank credentials created event: {:?}", e);
        }

        Ok(credentials_id)
    }

    pub async fn revoke_bank_credentials(
        &self,
        command: RevokeBankCredentialsCommand,
    ) -> Result<(), InviteError> {
        // Find the latest active credentials for the address
        let mut credentials = self.bank_credentials_repository
            .find_latest_by_address(&command.address)
            .await?
            .ok_or(InviteError::NoContent)?;

        // Revoke the credentials
        credentials.revoke();

        // Save the updated credentials
        self.bank_credentials_repository.save(&credentials).await?;

        // Publish event
        let event = BankCredentialsRevokedEvent {
            credentials_id: credentials.id().clone(),
            address: credentials.address().clone(),
            revoked_at: chrono::Utc::now(),
            revoked_by: command.authorized_by,
        };

        if let Err(e) = self.event_publisher
            .publish_domain_event(&event, "BankCredentialsService::revoke_bank_credentials")
            .await
        {
            tracing::warn!("Failed to publish bank credentials revoked event: {:?}", e);
        }

        Ok(())
    }

    pub async fn get_latest_by_address(
        &self,
        address: &StacksAddress,
    ) -> Result<Option<BankCredentials>, InviteError> {
        self.bank_credentials_repository.find_latest_by_address(address).await
    }

    pub async fn get_all_by_address(
        &self,
        address: &StacksAddress,
    ) -> Result<Vec<BankCredentials>, InviteError> {
        self.bank_credentials_repository.find_all_by_address(address).await
    }

    pub async fn get_by_id(
        &self,
        id: &BankCredentialsId,
    ) -> Result<Option<BankCredentials>, InviteError> {
        self.bank_credentials_repository.find_by_id(id).await
    }
}
