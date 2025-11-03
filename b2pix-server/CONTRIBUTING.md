# Contributing to B2PIX Rust Server

Thank you for your interest in contributing to B2PIX! This guide will help you understand our architecture and development patterns.

## 🏗️ Architecture Principles

### Service-Based Handler Registration
**Core Principle**: Services are responsible for registering their own event handlers.

```rust
// ✅ CORRECT: Service registers its own handlers
impl EmailService {
    pub fn register_handlers(
        self: Arc<Self>,
        registry: &mut EventHandlerRegistry,
    ) {
        registry.register(Arc::new(InviteEmailHandler::new(Arc::clone(&self))));
        // Add more handlers here as needed
    }
}

// ❌ WRONG: App registering handlers directly
// app.rs - DON'T DO THIS
handler_registry.register(Arc::new(InviteEmailHandler::new(Arc::clone(&email_service))));
```

### Benefits of This Pattern
- **Encapsulation**: Services manage their own dependencies
- **Scalability**: Easy to add handlers without touching app code
- **Testability**: Services can be tested with their handlers
- **Maintainability**: Clear ownership and responsibility

## 🔧 Development Guidelines

### String-Based Payload Processing

B2PIX uses **string-based payloads** for enhanced security and validation. When working with invite requests, follow this pattern:

#### 1. Payload Structure
```rust
// DTO structure
pub struct InviteRequestDto {
    pub address: String,        // Stacks blockchain address
    pub public_key: String,     // Public key for signature verification
    pub signature: String,      // Cryptographic signature
    pub payload: String,        // Line-delimited string payload
}
```

#### 2. Payload Parsing Pattern
```rust
// ✅ CORRECT: Parse payload line-by-line
let payload_lines: Vec<&str> = payload.payload.split('\n').collect();

if payload_lines.len() != 6 {
    return Err(ApiError::BadRequest("Invalid payload format: expected 6 lines".to_string()));
}

let action = payload_lines[0];      // "B2PIX - Solicitar Convite"
let domain = payload_lines[1];      // "b2pix.org"
let username = payload_lines[2];    // User display name
let email = payload_lines[3];       // User email
let wallet_address = payload_lines[4]; // Stacks address
let timestamp = payload_lines[5];   // Request timestamp
```

#### 3. Validation Pattern
```rust
// ✅ CORRECT: Use ValidationService for all validations
impl ValidationService {
    pub fn validate_action(&self, action: &str) -> Result<(), InviteError> {
        if action != "B2PIX - Solicitar Convite" {
            return Err(InviteError::InvalidAction);
        }
        Ok(())
    }

    pub fn validate_domain(&self, domain: &str) -> Result<(), InviteError> {
        if domain != "b2pix.org" {
            return Err(InviteError::InvalidDomain);
        }
        Ok(())
    }

    // ... other validation methods
}
```

#### 4. Handler Implementation Pattern
```rust
// ✅ CORRECT: Complete validation pipeline
pub async fn request_invite(
    State(handlers): State<Arc<InviteHandlers>>,
    Json(payload): Json<InviteRequestDto>,
) -> Result<impl IntoResponse, ApiError> {
    // 1. Parse payload
    let payload_lines: Vec<&str> = payload.payload.split('\n').collect();
    // ... line extraction ...

    // 2. Validate each component
    handlers.validation_service.validate_action(action)?;
    handlers.validation_service.validate_domain(domain)?;
    handlers.validation_service.validate_username(username)?;
    handlers.validation_service.validate_email(email)?;
    handlers.validation_service.validate_stacks_address(&address_str)?;
    handlers.validation_service.validate_public_key(&public_key_str)?;

    // 3. Create value objects
    let address = StacksAddress::from_string(address_str);
    let username = Username::from_string(username.to_string());
    let email = Email::from_string(email.to_string());
    let public_key = PublicKey::from_string(public_key_str);

    // 4. Advanced validations
    handlers.validation_service.validate_address_matches_public_key(&address, &public_key)?;
    handlers.validation_service.validate_signature(&payload).await?;

    // 5. Execute business logic
    let command = RequestInviteCommand { /* ... */ };
    handlers.invite_service.request_invite(command).await?;

    Ok(axum::http::StatusCode::OK)
}
```

### Adding New Services

#### 1. Create the Service
```rust
// common/your_service.rs
pub struct YourService {
    // Service dependencies
    config: SomeConfig,
    client: HttpClient,
}

impl YourService {
    pub fn new(config: SomeConfig, client: HttpClient) -> Self {
        Self { config, client }
    }

    /// 🔑 KEY: Service registers its own handlers
    pub fn register_handlers(
        self: Arc<Self>,
        registry: &mut EventHandlerRegistry,
    ) {
        registry.register(Arc::new(YourEventHandler::new(Arc::clone(&self))));
        // Add more handlers as needed
    }

    // Service business logic methods
    pub async fn do_something(&self) -> Result<(), ServiceError> {
        // Implementation
    }
}
```

#### 2. Create Event Handlers
```rust
// features/your_feature/your_handler.rs
pub struct YourEventHandler {
    service: Arc<YourService>,
}

impl YourEventHandler {
    pub fn new(service: Arc<YourService>) -> Self {
        Self { service }
    }
}

#[async_trait]
impl EventHandler for YourEventHandler {
    fn can_handle(&self, event_type: &str) -> bool {
        matches!(event_type, "YourEvent" | "AnotherEvent")
    }

    async fn handle(&self, event: &StoredEvent) -> Result<(), EventHandlerError> {
        // Parse event data
        let event_data: YourEventData = serde_json::from_value(event.event_data.clone())?;

        // Use the service to handle the event
        self.service
            .do_something_with_event(&event_data)
            .await
            .map_err(|e| EventHandlerError::ExternalService(e.to_string()))?;

        Ok(())
    }

    fn name(&self) -> &'static str {
        "YourEventHandler"
    }
}
```

#### 3. Register in App
```rust
// app.rs
pub async fn run() -> anyhow::Result<()> {
    // Initialize your service
    let your_service = Arc::new(YourService::new(config, client));
    
    // Register handlers through service
    Arc::clone(&your_service).register_handlers(&mut handler_registry);
    
    // Continue with app setup...
}
```

### Code Style Guidelines

#### Naming Conventions
- **Services**: `EmailService`, `NotificationService`, `UserService`
- **Handlers**: `InviteEmailHandler`, `UserRegistrationHandler`, `OrderProcessingHandler`
- **Events**: `UserRegistered`, `InviteRequested`, `OrderPlaced`
- **Validation methods**: `validate_action`, `validate_domain`, `validate_username`

#### Error Handling
```rust
// Use Result types consistently
pub async fn service_method(&self) -> Result<Response, ServiceError> {
    // Implementation
}

// Convert errors appropriately in handlers
self.service
    .do_something()
    .await
    .map_err(|e| EventHandlerError::ExternalService(e.to_string()))?;
```

#### Testing Patterns
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_service_handler_registration() {
        let service = Arc::new(YourService::new(/* test config */));
        let mut registry = EventHandlerRegistry::new();
        
        // Test handler registration
        Arc::clone(&service).register_handlers(&mut registry);
        
        // Verify handlers are registered
        let handlers = registry.get_handlers_for("YourEvent");
        assert_eq!(handlers.len(), 1);
        assert_eq!(handlers[0].name(), "YourEventHandler");
    }
    
    #[tokio::test]
    async fn test_handler_processes_event() {
        let service = Arc::new(YourService::new(/* test config */));
        let handler = YourEventHandler::new(Arc::clone(&service));
        
        let event = create_test_event();
        let result = handler.handle(&event).await;
        
        assert!(result.is_ok());
        // Verify expected side effects
    }

    #[test]
    fn test_validation_methods() {
        let service = ValidationService::new();
        
        // Test valid cases
        assert!(service.validate_action("B2PIX - Solicitar Convite").is_ok());
        assert!(service.validate_domain("b2pix.org").is_ok());
        
        // Test invalid cases
        assert!(service.validate_action("invalid-action").is_err());
        assert!(service.validate_domain("example.com").is_err());
    }
}
```

## 📋 Pull Request Process

### Before Submitting
1. **Follow the service-based handler registration pattern**
2. **Follow the string-based payload validation pattern** (if applicable)
3. **Write tests** for new services and handlers
4. **Update documentation** if adding new features
5. **Run code formatting**: `cargo fmt`
6. **Run linting**: `cargo clippy`
7. **Ensure all tests pass**: `cargo test`

### PR Template
```markdown
## Description
Brief description of changes

## Changes Made
- [ ] Added new service: `YourService`
- [ ] Implemented handler: `YourEventHandler`
- [ ] Updated app.rs to register handlers
- [ ] Added validation methods (if applicable)
- [ ] Added tests for new functionality
- [ ] Updated documentation

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Handler registration works correctly
- [ ] Service business logic works as expected
- [ ] Validation logic works correctly (if applicable)
```

## 🧪 Testing Guidelines

### Test Structure
```
tests/
├── unit/                   # Unit tests for individual components
│   ├── services/          # Service logic tests
│   ├── handlers/          # Handler behavior tests
│   └── common/            # Common test utilities
├── integration/           # End-to-end integration tests
│   ├── api/              # API endpoint tests
│   ├── events/           # Event processing tests
│   └── database/         # Database integration tests
└── fixtures/             # Test data and fixtures
```

### Test Categories

#### Unit Tests
- **Service Logic**: Test business logic without external dependencies
- **Handler Behavior**: Test event processing in isolation
- **Registration**: Test handler registration works correctly

#### Integration Tests
- **Event Flow**: Test complete event processing pipeline
- **API Endpoints**: Test HTTP API with real database
- **Service Integration**: Test services working together

#### Test Utilities
```rust
// tests/common/mod.rs
pub fn create_test_event(event_type: &str) -> StoredEvent {
    StoredEvent {
        id: "test-id".to_string(),
        event_type: event_type.to_string(),
        event_data: serde_json::json!({"test": "data"}),
        // ... other fields
    }
}

pub fn create_test_registry() -> EventHandlerRegistry {
    EventHandlerRegistry::new()
}
```

## 🔍 Code Review Checklist

### Architecture Compliance
- [ ] Services register their own handlers
- [ ] Handlers receive `Arc<Service>` references
- [ ] App layer only knows about services
- [ ] Clear separation of concerns

### Code Quality
- [ ] Proper error handling with `Result<T, E>`
- [ ] Comprehensive logging with context
- [ ] Input validation and sanitization
- [ ] Memory-safe Arc usage

### Testing
- [ ] Unit tests for service logic
- [ ] Handler registration tests
- [ ] Event processing tests
- [ ] Integration tests for complete flows

### Documentation
- [ ] Code comments for complex logic
- [ ] Updated README for new features
- [ ] Architecture documentation updates
- [ ] API documentation updates

## 🚀 Common Patterns

### Service with Multiple Handlers
```rust
impl NotificationService {
    pub fn register_handlers(
        self: Arc<Self>,
        registry: &mut EventHandlerRegistry,
    ) {
        // Register multiple handlers for different events
        registry.register(Arc::new(EmailNotificationHandler::new(Arc::clone(&self))));
        registry.register(Arc::new(SMSNotificationHandler::new(Arc::clone(&self))));
        registry.register(Arc::new(PushNotificationHandler::new(Arc::clone(&self))));
    }
}
```

### Handler with Event Filtering
```rust
impl EventHandler for UserEventHandler {
    fn can_handle(&self, event_type: &str) -> bool {
        matches!(event_type, "UserRegistered" | "UserUpdated" | "UserDeleted")
    }

    async fn handle(&self, event: &StoredEvent) -> Result<(), EventHandlerError> {
        match event.event_type.as_str() {
            "UserRegistered" => self.handle_user_registered(event).await,
            "UserUpdated" => self.handle_user_updated(event).await,
            "UserDeleted" => self.handle_user_deleted(event).await,
            _ => Ok(()), // Should not happen due to can_handle
        }
    }
}
```

### Conditional Handler Registration
```rust
impl AnalyticsService {
    pub fn register_handlers(
        self: Arc<Self>,
        registry: &mut EventHandlerRegistry,
    ) {
        // Always register core handler
        registry.register(Arc::new(EventAnalyticsHandler::new(Arc::clone(&self))));
        
        // Conditionally register based on configuration
        if self.config.enable_detailed_analytics {
            registry.register(Arc::new(DetailedAnalyticsHandler::new(Arc::clone(&self))));
        }
    }
}
```

## 📚 Learning Resources

### Understanding the Architecture
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for overall system design
2. Study [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md) for event system details
3. Review existing services (`EmailService`) for implementation patterns
4. Examine handler implementations in `features/email/`

### Rust Best Practices
- [The Rust Programming Language](https://doc.rust-lang.org/book/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Effective Rust](https://www.lurklurk.org/effective-rust/)

### Testing in Rust
- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Tokio Testing](https://tokio.rs/tokio/topics/testing)

## 🤝 Getting Help

### Questions and Discussion
- **Architecture Questions**: Review existing documentation first
- **Implementation Help**: Look at similar existing services
- **Testing Guidance**: Check existing test patterns
- **Code Review**: Follow the checklist above

### Before Asking
1. **Read the documentation** (README, ARCHITECTURE, EVENT_ARCHITECTURE)
2. **Study existing code** for similar patterns
3. **Check tests** for usage examples
4. **Review PR guidelines** for requirements

Thank you for contributing to B2PIX! Your adherence to these patterns helps maintain a clean, scalable, and maintainable codebase. 🚀
