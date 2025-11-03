# Trello Card Service

This module provides a service for creating and managing Trello cards using the Trello REST API.

## Features

- ✅ Create cards with name and description
- ✅ Support for additional parameters
- ✅ Configurable API credentials and list ID
- ✅ Comprehensive error handling
- ✅ Async/await support
- ✅ Unit tests included

## Configuration

The service uses the following default configuration:

```rust
TrelloConfig {
    api_key: "1218c18ec75d95afe27004b145ffcd79",
    token: "5ec366bb1b58e78ed9bc4c4b629a0b9ffe467fdcfb22ccdebd5721c45a8d87da",
    list_id: "5ceaaff445159480be0846b7",
    base_url: "https://api.trello.com/1",
}
```

## Usage

### Basic Usage

```rust
use b2pix_rust_server::services::trello::TrelloCardService;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let service = TrelloCardService::new();
    
    let card = service.create_card(
        "My New Task".to_string(),
        "Description of the task".to_string()
    ).await?;
    
    println!("Created card: {} with URL: {}", card.name, card.url);
    Ok(())
}
```

### Custom Configuration

```rust
use b2pix_rust_server::services::trello::{TrelloCardService, TrelloConfig};

let config = TrelloConfig {
    api_key: "your_api_key".to_string(),
    token: "your_token".to_string(),
    list_id: "your_list_id".to_string(),
    base_url: "https://api.trello.com/1".to_string(),
};

let service = TrelloCardService::with_config(config);
```

### Advanced Usage with Additional Parameters

```rust
use std::collections::HashMap;

let mut additional_params = HashMap::new();
additional_params.insert("pos".to_string(), serde_json::json!("top"));
additional_params.insert("due".to_string(), serde_json::json!("2024-12-31"));

let card = service.create_card_with_params(
    "Priority Task".to_string(),
    "High priority task with due date".to_string(),
    additional_params
).await?;
```

## API Reference

### TrelloCardService

#### Methods

- `new() -> Self` - Create service with default configuration
- `with_config(config: TrelloConfig) -> Self` - Create service with custom configuration
- `with_client_and_config(client: Client, config: TrelloConfig) -> Self` - Create service with custom HTTP client and configuration
- `create_card(&self, name: String, description: String) -> Result<TrelloCard, TrelloError>` - Create a basic card
- `create_card_with_params(&self, name: String, description: String, additional_params: HashMap<String, serde_json::Value>) -> Result<TrelloCard, TrelloError>` - Create card with additional parameters
- `update_config(&mut self, config: TrelloConfig)` - Update service configuration
- `get_config_info(&self) -> String` - Get configuration information (without sensitive data)

### TrelloCard

Response structure for created cards:

```rust
pub struct TrelloCard {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub id_list: String,
    pub id_board: String,
    pub url: String,
    pub short_url: String,
    pub closed: bool,
    pub date_last_activity: Option<String>,
}
```

### TrelloError

Error types:

- `HttpError(reqwest::Error)` - HTTP request failures
- `JsonError(serde_json::Error)` - JSON serialization/deserialization errors
- `ApiError { status: u16, message: String }` - Trello API errors
- `ConfigError(String)` - Configuration errors

## Additional Parameters

The Trello API supports many additional parameters when creating cards. Some common ones include:

- `pos` - Position of the card in the list (`"top"`, `"bottom"`, or a number)
- `due` - Due date for the card (ISO 8601 date string)
- `idMembers` - Array of member IDs to assign to the card
- `idLabels` - Array of label IDs to add to the card
- `urlSource` - URL source for the card

## Testing

Run the tests with:

```bash
cargo test services::trello
```

## Dependencies

- `reqwest` - HTTP client
- `serde` - JSON serialization
- `tokio` - Async runtime
- `thiserror` - Error handling

## API Documentation

This service is based on the [Trello REST API documentation](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post).