use reqwest::Client;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{debug, error, info};
use openssl::pkcs12::Pkcs12;

#[derive(Error, Debug)]
pub enum EfiPayError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("Authentication failed: {0}")]
    AuthenticationError(String),
    #[error("Certificate conversion error: {0}")]
    CertificateConversionError(String),
    #[error("OpenSSL error: {0}")]
    OpenSslError(#[from] openssl::error::ErrorStack),
}

/// Response structure for OAuth token endpoint
#[derive(Debug, Deserialize, Serialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u32,
    pub scope: String,
}

/// Response structure for creating a random key
#[derive(Debug, Deserialize, Serialize)]
pub struct KeyPIX {
    pub chave: String,
}

/// Response structure for listing random keys
#[derive(Debug, Deserialize, Serialize)]
pub struct ListKeyPIX {
    pub chaves: Vec<String>,
}

/// PIX transaction structure
#[derive(Debug, Deserialize, Serialize)]
pub struct PixTransaction {
    #[serde(rename = "endToEndId")]
    pub end_to_end_id: String,
    pub valor: String,
    pub chave: String,
    pub horario: String,
}

/// Pagination information
#[derive(Debug, Deserialize, Serialize)]
pub struct Paginacao {
    #[serde(rename = "paginaAtual")]
    pub pagina_atual: u32,
    #[serde(rename = "itensPorPagina")]
    pub itens_por_pagina: u32,
    #[serde(rename = "quantidadeDePaginas")]
    pub quantidade_de_paginas: u32,
    #[serde(rename = "quantidadeTotalDeItens")]
    pub quantidade_total_de_itens: u32,
}

/// Parameters for PIX query
#[derive(Debug, Deserialize, Serialize)]
pub struct PixQueryParametros {
    pub inicio: String,
    pub fim: String,
    pub paginacao: Paginacao,
}

/// Response structure for PIX query
#[derive(Debug, Deserialize, Serialize)]
pub struct PixQueryResponse {
    pub parametros: PixQueryParametros,
    pub pix: Vec<PixTransaction>,
}

/// EFI Pay API client
pub struct EfiPayClient {
    client: Client,
    base_url: String,
    client_id: String,
    client_secret: String,
    certificate_data: Vec<u8>,
}

impl EfiPayClient {
    /// Create a new EFI Pay client
    pub fn new(
        base_url: String,
        client_id: String,
        client_secret: String,
        certificate_data: Vec<u8>,
    ) -> Result<Self, EfiPayError> {
        info!("🔧 Creating EFI Pay client...");
        // debug!("📍 Base URL: {}", base_url);
        // debug!("👤 Client ID: {}", client_id);
        // debug!("📄 Certificate size: {} bytes", certificate_data.len());
        
        // Create identity from certificate data first
        let identity = if certificate_data.starts_with(b"-----BEGIN") {
            // Handle PEM format
            // info!("📄 Certificate is in PEM format");
            reqwest::Identity::from_pem(&certificate_data)
                .map_err(|e| {
                    error!("❌ Failed to parse PEM certificate: {}", e);
                    EfiPayError::AuthenticationError(format!("Failed to parse PEM certificate: {}", e))
                })?
        } else {
            // Handle PKCS#12 format - convert to PEM first
            // info!("📄 Certificate is in PKCS#12 format, converting to PEM...");
            let pem_data = Self::convert_pkcs12_to_pem(&certificate_data)?;
            reqwest::Identity::from_pem(&pem_data)
                .map_err(|e| {
                    error!("❌ Failed to create identity from converted PEM: {}", e);
                    EfiPayError::AuthenticationError(format!("Failed to create identity from converted PEM: {}", e))
                })?
        };

        info!("✅ Successfully created certificate identity");

        // Create client with certificate identity and additional configuration
        let client = Client::builder()
            .use_rustls_tls()
            .identity(identity)
            .timeout(std::time::Duration::from_secs(30)) // 30 second timeout
            .danger_accept_invalid_certs(false) // Ensure we validate certs
            .build()
            .map_err(|e| {
                error!("❌ Failed to create HTTP client: {}", e);
                EfiPayError::AuthenticationError(format!("Failed to create HTTP client: {}", e))
            })?;

        info!("✅ Successfully created EFI Pay client");

        Ok(Self {
            client,
            base_url,
            client_id,
            client_secret,
            certificate_data,
        })
    }

    /// Convert PKCS#12 to PEM format for use with reqwest
    fn convert_pkcs12_to_pem(pkcs12_data: &[u8]) -> Result<Vec<u8>, EfiPayError> {
        info!("🔄 Converting PKCS#12 certificate to PEM format...");
        let passwords = ["", "123456", "password", "changeit", "cert"];
        
        for password in passwords.iter() {
            // debug!("🔐 Trying PKCS#12 password: {}", if password.is_empty() { "empty" } else { "***" });
            
            let pkcs12 = match Pkcs12::from_der(pkcs12_data) {
                Ok(pkcs12) => {
                    // debug!("✅ Successfully parsed PKCS#12 structure");
                    pkcs12
                },
                Err(e) => {
                    error!("❌ Failed to parse PKCS#12 data: {}", e);
                    return Err(EfiPayError::CertificateConversionError(format!("Invalid PKCS#12 format: {}", e)));
                }
            };
            
            match pkcs12.parse2(password) {
                Ok(parsed) => {
                    // info!("✅ Successfully parsed PKCS#12 with password");
                    
                    let mut pem_data = Vec::new();
                    
                    // Add certificate to PEM
                    if let Some(cert) = parsed.cert {
                        debug!("📜 Adding certificate to PEM");
                        let cert_pem = cert.to_pem()?;
                        pem_data.extend_from_slice(&cert_pem);
                    } else {
                        return Err(EfiPayError::CertificateConversionError("No certificate found in PKCS#12".to_string()));
                    }
                    
                    // Add private key to PEM
                    if let Some(pkey) = parsed.pkey {
                        debug!("🔑 Adding private key to PEM");
                        let pkey_pem = pkey.private_key_to_pem_pkcs8()?;
                        pem_data.extend_from_slice(&pkey_pem);
                    } else {
                        return Err(EfiPayError::CertificateConversionError("No private key found in PKCS#12".to_string()));
                    }
                    
                    // Add CA certificates if present
                    if let Some(ca_stack) = parsed.ca {
                        debug!("🏛️ Adding {} CA certificate(s) to PEM", ca_stack.len());
                        for ca_cert in ca_stack {
                            let ca_pem = ca_cert.to_pem()?;
                            pem_data.extend_from_slice(&ca_pem);
                        }
                    }
                    
                    info!("✅ Successfully converted PKCS#12 to PEM format, total size: {} bytes", pem_data.len());
                    // debug!("🔍 PEM preview: {}", String::from_utf8_lossy(&pem_data[..std::cmp::min(100, pem_data.len())]));
                    
                    return Ok(pem_data);
                },
                Err(_e) => {
                    // debug!("❌ Password failed: {}", e);
                    continue;
                }
            }
        }
        
        Err(EfiPayError::CertificateConversionError(
            "Failed to parse PKCS#12 with any common password".to_string()
        ))
    }

    /// Authenticate with EFI Pay using stored credentials and certificate
    pub async fn authenticate(&self) -> Result<OAuthTokenResponse, EfiPayError> {
        info!("🔐 Starting EFI Pay API authentication...");
        // debug!("📍 EFI Pay base URL: {}", self.base_url);
        // debug!("👤 Client ID: {}", self.client_id);
        // debug!("🔐 Client Secret: {}***", &self.client_secret[..std::cmp::min(4, self.client_secret.len())]);

        // Log certificate information
        // info!("📄 Using certificate data, size: {} bytes", self.certificate_data.len());
        
        // Check if it's PEM or binary format
        let is_pem = self.certificate_data.starts_with(b"-----BEGIN");
        info!("📄 Certificate format: {}", if is_pem { "PEM" } else { "Binary (likely PKCS#12)" });

        // The client already has the certificate configured from the constructor
        info!("🔧 Using pre-configured HTTP client with certificate identity...");

        // Prepare request body for OAuth token
        let auth_body = serde_json::json!({
            "grant_type": "client_credentials"
        });

        // Make request to OAuth token endpoint  
        let oauth_url = format!("{}/oauth/token", self.base_url);
        info!("🌐 Making OAuth request to: {}", oauth_url);
        debug!("📤 Request body: {}", auth_body);

        let response = match self.client
            .post(&oauth_url)
            .header("Content-Type", "application/json")
            .basic_auth(&self.client_id, Some(&self.client_secret))
            .json(&auth_body)
            .send()
            .await {
                Ok(response) => {
                    debug!("📥 Received response from EFI Pay");
                    response
                },
                Err(e) => {
                    error!("❌ HTTP request to EFI Pay failed: {}", e);
                    return Err(EfiPayError::HttpError(e));
                }
            };

        let status = response.status();
        info!("📊 OAuth response status: {} ({})", status.as_u16(), status.canonical_reason().unwrap_or("Unknown"));

        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ OAuth authentication failed with status {}: {}", status, error_text);
            return Err(EfiPayError::AuthenticationError(format!("OAuth failed: {} - {}", status, error_text)));
        }

        debug!("🔧 Parsing OAuth response JSON...");
        let token_response: OAuthTokenResponse = match response.json().await {
            Ok(token_response) => {
                debug!("✅ Successfully parsed OAuth response");
                token_response
            },
            Err(e) => {
                error!("❌ Failed to parse OAuth response JSON: {}", e);
                return Err(EfiPayError::HttpError(e));
            }
        };

        info!("🎉 Successfully authenticated with EFI Pay!");
        info!("⏰ Token expires in {} seconds", token_response.expires_in);
        debug!("🎫 Token type: {}", token_response.token_type);
        debug!("🔍 Token scope: {}", token_response.scope);
        debug!("🎫 Access token (first 20 chars): {}...", &token_response.access_token[..std::cmp::min(20, token_response.access_token.len())]);

        Ok(token_response)
    }

    /// Create a random PIX key
    pub async fn create_random_key(&self, access_token: &str) -> Result<KeyPIX, EfiPayError> {
        info!("🔑 Creating random PIX key...");
        
        let url = format!("{}/v2/gn/evp", self.base_url);
        debug!("📍 Request URL: {}", url);

        let response = match self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await {
                Ok(response) => {
                    debug!("📥 Received response for create random key");
                    response
                },
                Err(e) => {
                    error!("❌ HTTP request to create random key failed: {}", e);
                    return Err(EfiPayError::HttpError(e));
                }
            };

        let status = response.status();
        info!("📊 Create random key response status: {} ({})", status.as_u16(), status.canonical_reason().unwrap_or("Unknown"));

        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Create random key failed with status {}: {}", status, error_text);
            return Err(EfiPayError::AuthenticationError(format!("Create random key failed: {} - {}", status, error_text)));
        }

        debug!("🔧 Parsing create random key response JSON...");
        let key_response: KeyPIX = match response.json().await {
            Ok(key_response) => {
                debug!("✅ Successfully parsed create random key response");
                key_response
            },
            Err(e) => {
                error!("❌ Failed to parse create random key response JSON: {}", e);
                return Err(EfiPayError::HttpError(e));
            }
        };

        info!("🎉 Successfully created random PIX key: {}", key_response.chave);
        Ok(key_response)
    }

    /// Get list of random PIX keys
    pub async fn get_random_keys(&self, access_token: &str) -> Result<ListKeyPIX, EfiPayError> {
        info!("📋 Retrieving random PIX keys...");
        
        let url = format!("{}/v2/gn/evp", self.base_url);
        debug!("📍 Request URL: {}", url);

        let response = match self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await {
                Ok(response) => {
                    debug!("📥 Received response for get random keys");
                    response
                },
                Err(e) => {
                    error!("❌ HTTP request to get random keys failed: {}", e);
                    return Err(EfiPayError::HttpError(e));
                }
            };

        let status = response.status();
        info!("📊 Get random keys response status: {} ({})", status.as_u16(), status.canonical_reason().unwrap_or("Unknown"));

        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Get random keys failed with status {}: {}", status, error_text);
            return Err(EfiPayError::AuthenticationError(format!("Get random keys failed: {} - {}", status, error_text)));
        }

        debug!("🔧 Parsing get random keys response JSON...");
        let keys_response: ListKeyPIX = match response.json().await {
            Ok(keys_response) => {
                debug!("✅ Successfully parsed get random keys response");
                keys_response
            },
            Err(e) => {
                error!("❌ Failed to parse get random keys response JSON: {}", e);
                return Err(EfiPayError::HttpError(e));
            }
        };

        info!("🎉 Successfully retrieved {} random PIX keys", keys_response.chaves.len());
        debug!("🔍 Keys: {:?}", keys_response.chaves);
        
        Ok(keys_response)
    }

    /// Get existing PIX key or create a new one if none exist
    pub async fn get_or_create_pix_key(
        &self,
        access_token: &str,
    ) -> Result<String, EfiPayError> {
        // First, try to get existing random PIX keys
        match self.get_random_keys(access_token).await {
            Ok(keys_response) => {
                if !keys_response.chaves.is_empty() {
                    // Use the first existing key
                    let existing_key = keys_response.chaves[0].clone();
                    tracing::info!("Using existing PIX key: {}", existing_key);
                    Ok(existing_key)
                } else {
                    // No existing keys, create a new one
                    tracing::info!("No existing PIX keys found, creating a new one");
                    let new_key = self.create_random_key(access_token).await?;
                    Ok(new_key.chave)
                }
            },
            Err(e) => {
                tracing::warn!("Failed to get existing PIX keys, creating a new one: {:?}", e);
                // If getting existing keys fails, fallback to creating a new one
                let new_key = self.create_random_key(access_token).await?;
                Ok(new_key.chave)
            }
        }
    }

    /// Query PIX transactions within a date range
    pub async fn query_pix(
        &self,
        access_token: &str,
        start_date: &str,
        end_date: &str,
    ) -> Result<PixQueryResponse, EfiPayError> {
        info!("🔍 Querying PIX transactions from {} to {}", start_date, end_date);
        
        let url = format!(
            "{}/v2/pix?inicio={}&fim={}",
            self.base_url,
            urlencoding::encode(start_date),
            urlencoding::encode(end_date)
        );
        debug!("📍 Request URL: {}", url);

        let response = match self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await {
                Ok(response) => {
                    debug!("📥 Received response for PIX query");
                    response
                },
                Err(e) => {
                    error!("❌ HTTP request to query PIX failed: {}", e);
                    return Err(EfiPayError::HttpError(e));
                }
            };

        let status = response.status();
        info!("📊 PIX query response status: {} ({})", status.as_u16(), status.canonical_reason().unwrap_or("Unknown"));

        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ PIX query failed with status {}: {}", status, error_text);
            return Err(EfiPayError::AuthenticationError(format!("PIX query failed: {} - {}", status, error_text)));
        }

        debug!("🔧 Parsing PIX query response JSON...");
        let pix_response: PixQueryResponse = match response.json().await {
            Ok(pix_response) => {
                debug!("✅ Successfully parsed PIX query response");
                pix_response
            },
            Err(e) => {
                error!("❌ Failed to parse PIX query response JSON: {}", e);
                return Err(EfiPayError::HttpError(e));
            }
        };

        info!("🎉 Successfully queried {} PIX transactions", pix_response.pix.len());
        info!("📄 Page {} of {} (total items: {})", 
            pix_response.parametros.paginacao.pagina_atual + 1,
            pix_response.parametros.paginacao.quantidade_de_paginas,
            pix_response.parametros.paginacao.quantidade_total_de_itens
        );
        
        Ok(pix_response)
    }
}
