use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// Trello service errors
#[derive(Error, Debug)]
pub enum TrelloError {
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    
    #[error("JSON serialization/deserialization error: {0}")]
    JsonError(#[from] serde_json::Error),
    
    #[error("Trello API error: {status} - {message}")]
    ApiError { status: u16, message: String },
    
    #[error("Invalid configuration: {0}")]
    ConfigError(String),
}

/// Trello card creation request
#[derive(Debug, Clone, Serialize)]
pub struct CreateCardRequest {
    pub name: String,
    pub desc: String,
    #[serde(rename = "idList")]
    pub id_list: String,
    pub key: String,
    pub token: String,
}

/// Trello card response
#[derive(Debug, Clone, Deserialize)]
pub struct TrelloCard {
    pub id: String,
    pub name: String,
    pub desc: String,
    #[serde(rename = "idList")]
    pub id_list: String,
    #[serde(rename = "idBoard")]
    pub id_board: String,
    pub url: String,
    #[serde(rename = "shortUrl")]
    pub short_url: String,
    pub closed: bool,
    #[serde(rename = "dateLastActivity")]
    pub date_last_activity: Option<String>,
}

/// Trello API configuration
#[derive(Debug, Clone)]
pub struct TrelloConfig {
    pub api_key: String,
    pub token: String,
    pub list_id: String,
    pub base_url: String,
}

impl TrelloConfig {
    /// Create a new TrelloConfig from individual parameters
    pub fn new(api_key: String, token: String, list_id: String) -> Self {
        Self {
            api_key,
            token,
            list_id,
            base_url: "https://api.trello.com/1".to_string(),
        }
    }

    /// Create a TrelloConfig with a custom base URL
    pub fn with_base_url(api_key: String, token: String, list_id: String, base_url: String) -> Self {
        Self {
            api_key,
            token,
            list_id,
            base_url,
        }
    }
}

/// Trello card service for managing Trello cards
#[derive(Debug, Clone)]
pub struct TrelloCardService {
    client: Client,
    config: TrelloConfig,
}

impl TrelloCardService {
    /// Create a new Trello card service with configuration
    pub fn new(config: TrelloConfig) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    /// Create a new Trello card service with custom HTTP client and configuration
    pub fn with_client(client: Client, config: TrelloConfig) -> Self {
        Self {
            client,
            config,
        }
    }
    
    /// Create a new card in Trello
    /// 
    /// # Arguments
    /// * `name` - The name of the card
    /// * `description` - The description of the card
    /// 
    /// # Returns
    /// * `Result<TrelloCard, TrelloError>` - The created card or an error
    /// 
    /// # Example
    /// ```rust
    /// use b2pix_rust_server::services::trello::{TrelloCardService, TrelloConfig};
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let config = TrelloConfig::new(
    ///         "your_api_key".to_string(),
    ///         "your_token".to_string(),
    ///         "your_list_id".to_string()
    ///     );
    ///     let service = TrelloCardService::new(config);
    ///     let card = service.create_card(
    ///         "New Task".to_string(),
    ///         "This is a new task description".to_string()
    ///     ).await?;
    ///
    ///     println!("Created card: {} with URL: {}", card.name, card.url);
    ///     Ok(())
    /// }
    /// ```
    pub async fn create_card(&self, name: String, description: String) -> Result<TrelloCard, TrelloError> {
        let url = format!("{}/cards", self.config.base_url);
        
        let request = CreateCardRequest {
            name,
            desc: description,
            id_list: self.config.list_id.clone(),
            key: self.config.api_key.clone(),
            token: self.config.token.clone(),
        };
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;
            
        let status = response.status();
        
        if status.is_success() {
            let card: TrelloCard = response.json().await?;
            Ok(card)
        } else {
            let error_message = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(TrelloError::ApiError {
                status: status.as_u16(),
                message: error_message,
            })
        }
    }
    
    /// Create a card with additional parameters
    /// 
    /// # Arguments
    /// * `name` - The name of the card
    /// * `description` - The description of the card
    /// * `additional_params` - Additional parameters to include in the request
    /// 
    /// # Returns
    /// * `Result<TrelloCard, TrelloError>` - The created card or an error
    pub async fn create_card_with_params(
        &self, 
        name: String, 
        description: String,
        additional_params: HashMap<String, serde_json::Value>
    ) -> Result<TrelloCard, TrelloError> {
        let url = format!("{}/cards", self.config.base_url);
        
        let mut params = serde_json::json!({
            "name": name,
            "desc": description,
            "idList": self.config.list_id,
            "key": self.config.api_key,
            "token": self.config.token,
        });
        
        // Merge additional parameters
        if let serde_json::Value::Object(ref mut obj) = params {
            for (key, value) in additional_params {
                obj.insert(key, value);
            }
        }
        
        let response = self.client
            .post(&url)
            .json(&params)
            .send()
            .await?;
            
        let status = response.status();
        
        if status.is_success() {
            let card: TrelloCard = response.json().await?;
            Ok(card)
        } else {
            let error_message = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(TrelloError::ApiError {
                status: status.as_u16(),
                message: error_message,
            })
        }
    }
    
    /// Update the configuration
    pub fn update_config(&mut self, config: TrelloConfig) {
        self.config = config;
    }
    
    /// Get the current configuration (without sensitive data)
    pub fn get_config_info(&self) -> String {
        format!("Base URL: {}, List ID: {}", self.config.base_url, self.config.list_id)
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    
    #[test]
    fn test_create_card_request_serialization() {
        let request = CreateCardRequest {
            name: "Test Card".to_string(),
            desc: "Test Description".to_string(),
            id_list: "test_list_id".to_string(),
            key: "test_key".to_string(),
            token: "test_token".to_string(),
        };
        
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("\"name\":\"Test Card\""));
        assert!(json.contains("\"desc\":\"Test Description\""));
        assert!(json.contains("\"idList\":\"test_list_id\""));
    }
    
    #[test]
    fn test_trello_config_new() {
        let config = TrelloConfig::new(
            "test_api_key".to_string(),
            "test_token".to_string(),
            "test_list_id".to_string()
        );
        assert_eq!(config.api_key, "test_api_key");
        assert_eq!(config.token, "test_token");
        assert_eq!(config.list_id, "test_list_id");
        assert_eq!(config.base_url, "https://api.trello.com/1");
    }
    
    #[test]
    fn test_service_creation() {
        let config = TrelloConfig::new(
            "test_key".to_string(),
            "test_token".to_string(),
            "test_list".to_string()
        );
        let service = TrelloCardService::new(config);
        assert!(service.get_config_info().contains("https://api.trello.com/1"));
        assert!(service.get_config_info().contains("test_list"));
    }
    
    #[test]
    fn test_service_with_custom_config() {
        let config = TrelloConfig::with_base_url(
            "custom_key".to_string(),
            "custom_token".to_string(),
            "custom_list".to_string(),
            "https://custom.api.com".to_string()
        );

        let service = TrelloCardService::new(config);
        assert!(service.get_config_info().contains("https://custom.api.com"));
        assert!(service.get_config_info().contains("custom_list"));
    }
}
