use std::env;
use google_cloud_storage::client::{Client, ClientConfig};
use google_cloud_storage::http::objects::upload::{Media, UploadObjectRequest, UploadType};
use google_cloud_storage::http::objects::delete::DeleteObjectRequest;
use bytes::Bytes;
use anyhow::Result;

/// Google Cloud Storage manager for handling file uploads and deletions
/// 
/// This implementation uses the google-cloud-storage v0.24.0 client library
/// and requires ONE of the following environment variable setups:
/// 
/// **Option 1 - Service Account Key File Path:**
/// - GCS_BUCKET_NAME: The name of the Google Cloud Storage bucket
/// - GOOGLE_APPLICATION_CREDENTIALS: Path to the service account key JSON file
/// 
/// **Option 2 - Service Account Key JSON Content:**
/// - GCS_BUCKET_NAME: The name of the Google Cloud Storage bucket  
/// - GOOGLE_APPLICATION_CREDENTIALS_JSON: The actual JSON content of the service account key
/// 
/// **Example Usage:**
/// ```bash
/// # Option 1: File path
/// export GCS_BUCKET_NAME="my-bucket"
/// export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
/// 
/// # Option 2: JSON content
/// export GCS_BUCKET_NAME="my-bucket"
/// export GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
/// ```
pub struct GcsManager {
    client: Client,
    bucket_name: String,
}

impl GcsManager {
    pub async fn new() -> Result<Self> {
        let bucket_name = env::var("GCS_BUCKET_NAME")
            .map_err(|_| anyhow::anyhow!("GCS_BUCKET_NAME environment variable not set"))?;

        // Debug: Check environment variables
        println!("🔍 GCS Debug Information:");
        if let Ok(creds_path) = env::var("GOOGLE_APPLICATION_CREDENTIALS") {
            println!("  GOOGLE_APPLICATION_CREDENTIALS: {}", creds_path);
            
            // Check if file exists
            if std::path::Path::new(&creds_path).exists() {
                println!("  ✅ Credentials file exists");
                
                // Try to read and validate JSON
                match std::fs::read_to_string(&creds_path) {
                    Ok(content) => {
                        println!("  ✅ File is readable, size: {} bytes", content.len());
                        
                        // Try to parse as JSON
                        match serde_json::from_str::<serde_json::Value>(&content) {
                            Ok(_) => println!("  ✅ File contains valid JSON"),
                            Err(e) => {
                                return Err(anyhow::anyhow!(
                                    "Credentials file is not valid JSON: {}. First 100 chars: '{}'", 
                                    e, 
                                    content.chars().take(100).collect::<String>()
                                ));
                            }
                        }
                    }
                    Err(e) => {
                        return Err(anyhow::anyhow!("Cannot read credentials file: {}", e));
                    }
                }
            } else {
                return Err(anyhow::anyhow!("Credentials file does not exist: {}", creds_path));
            }
        } else if let Ok(creds_json) = env::var("GOOGLE_APPLICATION_CREDENTIALS_JSON") {
            println!("  GOOGLE_APPLICATION_CREDENTIALS_JSON: Set (length: {} chars)", creds_json.len());
            
            // Validate JSON content
            match serde_json::from_str::<serde_json::Value>(&creds_json) {
                Ok(_) => println!("  ✅ JSON content is valid"),
                Err(e) => {
                    return Err(anyhow::anyhow!(
                        "GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON: {}. First 100 chars: '{}'", 
                        e, 
                        creds_json.chars().take(100).collect::<String>()
                    ));
                }
            }
        } else {
            return Err(anyhow::anyhow!(
                "No Google Cloud credentials found. Please set either:\n\
                1. GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json\n\
                2. GOOGLE_APPLICATION_CREDENTIALS_JSON='{{\"type\":\"service_account\",...}}'"
            ));
        }

        println!("  GCS_BUCKET_NAME: {}", bucket_name);

        let client_config = ClientConfig::default().with_auth().await
            .map_err(|e| anyhow::anyhow!(
                "Failed to create GCS client config after validation passed.\n\
                This might be a library-specific issue.\n\
                Original error: {}", e
            ))?;
        let client = Client::new(client_config);

        println!("  ✅ GCS client created successfully");

        Ok(Self {
            client,
            bucket_name,
        })
    }

    /// Uploads a certificate file to Google Cloud Storage
    /// 
    /// # Arguments
    /// * `file_data` - The certificate file data as bytes
    /// * `address` - The Stacks address to organize certificates by user
    /// * `filename` - The original filename (should end with .p12)
    /// 
    /// # Returns
    /// The object name/path of the uploaded certificate in GCS
    pub async fn upload_certificate(
        &self,
        file_data: Bytes,
        address: &str,
        filename: &str,
    ) -> Result<String> {
        let object_name = format!("certificates/{}/{}", address, filename);
        
        // Create media for the upload
        let mut media = Media::new(object_name.clone());
        media.content_type = "application/x-pkcs12".into(); // MIME type for .p12 files
        
        let upload_type = UploadType::Simple(media);
        
        // Upload to Google Cloud Storage using the v0.24.0 API
        let uploaded_object = self.client.upload_object(
            &UploadObjectRequest {
                bucket: self.bucket_name.clone(),
                ..Default::default()
            },
            file_data.to_vec(),
            &upload_type,
        ).await?;

        Ok(uploaded_object.name)
    }

    /// Deletes a certificate from Google Cloud Storage
    /// 
    /// # Arguments
    /// * `object_name` - The full object name/path in GCS
    #[allow(dead_code)]
    pub async fn delete_certificate(&self, object_name: &str) -> Result<()> {
        self.client.delete_object(&DeleteObjectRequest {
            bucket: self.bucket_name.clone(),
            object: object_name.to_string(),
            ..Default::default()
        }).await?;
        
        Ok(())
    }

    /// Downloads a certificate from Google Cloud Storage
    /// 
    /// # Arguments
    /// * `object_name` - The full object name/path in GCS
    /// 
    /// # Returns
    /// The file data as bytes
    pub async fn download_certificate(&self, object_name: &str) -> Result<Vec<u8>> {
        use google_cloud_storage::http::objects::get::GetObjectRequest;
        
        let object = self.client.download_object(&GetObjectRequest {
            bucket: self.bucket_name.clone(),
            object: object_name.to_string(),
            ..Default::default()
        }, &Default::default()).await?;

        Ok(object)
    }

    /// Generates a public download URL for a certificate
    /// 
    /// Note: This generates a simple gs:// URL. For production use,
    /// consider implementing signed URLs for security.
    /// 
    /// # Arguments
    /// * `object_name` - The object name/path in GCS
    #[allow(dead_code)]
    pub async fn get_certificate_download_url(&self, object_name: &str) -> Result<String> {
        // Generate a signed URL for downloading the certificate (optional)
        // For now, we'll return the object path
        Ok(format!("gs://{}/{}", self.bucket_name, object_name))
    }
}
