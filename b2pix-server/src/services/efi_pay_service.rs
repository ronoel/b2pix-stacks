use std::sync::Arc;
use crate::features::shared::StacksAddress;
use crate::features::bank_credentials::ports::BankCredentialsRepository;
use crate::infrastructure::storage::gcs_manager::GcsManager;
use crate::services::banking::efi_pay::{EfiPayClient, PixQueryResponse};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum EfiPayServiceError {
    #[error("Bank credentials not found for address: {0}")]
    CredentialsNotFound(String),
    #[error("Client ID not configured for address: {0}")]
    ClientIdNotConfigured(String),
    #[error("Client secret not configured for address: {0}")]
    ClientSecretNotConfigured(String),
    #[error("Certificate not configured for address: {0}")]
    CertificateNotConfigured(String),
    #[error("Failed to initialize GCS manager: {0}")]
    GcsInitializationError(String),
    #[error("Failed to download certificate: {0}")]
    CertificateDownloadError(String),
    #[error("Failed to create EFI Pay client: {0}")]
    ClientCreationError(String),
    #[error("Authentication failed: {0}")]
    AuthenticationError(String),
    #[error("PIX query failed: {0}")]
    PixQueryError(String),
}

pub struct EfiPayService {
    bank_credentials_repository: Arc<dyn BankCredentialsRepository>,
}

impl EfiPayService {
    pub fn new(bank_credentials_repository: Arc<dyn BankCredentialsRepository>) -> Self {
        Self {
            bank_credentials_repository,
        }
    }

    /// Get an EfiPayClient for a given Stacks address
    /// Retrieves the latest active bank credentials and creates an authenticated EFI Pay client
    pub async fn get_efi_client(&self, address: &StacksAddress) -> Result<EfiPayClient, EfiPayServiceError> {
        // Find the latest active bank credentials by address
        let credentials = self
            .bank_credentials_repository
            .find_latest_by_address(address)
            .await
            .map_err(|e| EfiPayServiceError::CredentialsNotFound(format!("{}: {}", address, e)))?
            .ok_or_else(|| EfiPayServiceError::CredentialsNotFound(address.to_string()))?;

        // Extract credentials
        let client_id = credentials.client_id().to_string();
        let client_secret = credentials.client_secret().to_string();
        let certificate_gcs_path = credentials.certificate_gcs_path();

        // Initialize GCS manager
        let gcs_manager = GcsManager::new()
            .await
            .map_err(|e| EfiPayServiceError::GcsInitializationError(e.to_string()))?;

        // Download certificate
        let certificate_data = gcs_manager
            .download_certificate(certificate_gcs_path)
            .await
            .map_err(|e| EfiPayServiceError::CertificateDownloadError(e.to_string()))?;

        // Create base URL (production mode)
        let base_url = "https://pix.api.efipay.com.br".to_string();

        // Create and return EfiPayClient
        EfiPayClient::new(base_url, client_id, client_secret, certificate_data)
            .map_err(|e| EfiPayServiceError::ClientCreationError(e.to_string()))
    }

    /// Query PIX transactions for a given address and date range
    /// This is a convenience function that handles client creation, authentication, and querying
    pub async fn query_pix(
        &self,
        address: &StacksAddress,
        start_date: &str,
        end_date: &str,
    ) -> Result<PixQueryResponse, EfiPayServiceError> {
        // Get EFI Pay client
        let efi_client = self.get_efi_client(address).await?;

        // Authenticate
        let oauth_response = efi_client
            .authenticate()
            .await
            .map_err(|e| EfiPayServiceError::AuthenticationError(e.to_string()))?;

        // Query PIX transactions
        efi_client
            .query_pix(&oauth_response.access_token, start_date, end_date)
            .await
            .map_err(|e| EfiPayServiceError::PixQueryError(e.to_string()))
    }
}
