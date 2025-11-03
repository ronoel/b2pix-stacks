# B2PIX Rust Server

A production-ready Rust server implementing a **service-oriented, event-driven architecture** with robust invite management and EFI Pay banking integration.

## 🎯 Overview

### Key Features
- **🔐 Cryptographic Authentication**: Stacks blockchain signature verification
- **📧 Email Integration**: Automated invite notifications via ZeptoMail API
- **🏦 Banking Integration**: EFI Pay PIX operations with OAuth2 and certificate management
- **☁️ Cloud Storage**: Secure certificate storage in Google Cloud Storage  
- **📊 Event Sourcing**: Complete audit trail of all system operations
- **🔄 Async Processing**: Event-driven architecture with MongoDB event store
- **🛡️ Security First**: PKCS#12 to PEM conversion, scope validation, signature verification

### API Endpoints Overview
| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/v1/invites/send` | Send invite request | Signature Required |
| POST | `/v1/invites/claim` | Claim existing invite | Signature Required |
| GET | `/v1/invites/code/{code}` | Get invite by code | None |
| GET | `/v1/invites/address/{address}` | Get invite by address | None |
| POST | `/v1/invites/banksetup` | Setup EFI Pay banking | Signature Required |

📖 **[Complete API Documentation →](API_EXAMPLES.md)**

## 🚀 Quick Start

### Prerequisites
- Rust (latest stable version)
- MongoDB (for event storage and business data)
- Docker (optional, for containerized deployment)
- EFI Pay account with PIX permissions (for banking features)

### Environment Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and configure:
   ```bash
   MONGODB_URI=mongodb://localhost:27017
   EMAIL_API_KEY=your_zeptomail_api_key
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME="Your Company Name"
   SERVER_PORT=8080
   GCS_BUCKET_NAME=your-gcs-bucket-name
   ```

3. Configure Google Cloud Storage authentication (choose one option):
   ```bash
   # Option 1: Service account key file path
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   
   # Option 2: Service account key JSON content  
   export GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project",...}'
   ```

### Setting up MongoDB
```bash
# Create MongoDB container
docker run -d -p 27017:27017 --name mongocrypto mongo:6.0.3

# Start/stop the database container
docker start mongocrypto
docker stop mongocrypto
```

### Running the Server
```bash
# Setup Google Cloud Storage (run once)
./setup_gcs.sh

# Or manually set environment variables:

# Build and run
cargo run --bin b2pix-rust-server

# Debug mode
RUST_LOG=debug cargo run --bin b2pix-rust-server

# Using VS Code task
# Ctrl+Shift+P → "Tasks: Run Task" → "Build and Run B2PIX Server"
```

### Testing
```bash
# Run all tests
cargo test

# Test signature verification
cargo test test_verify_message_signature_rsv_with_logging -- --nocapture
```

## First Invite

```json
{
  "code": "KG7AEWJ4",
  "email": "email@gmail.com",
  "address": null,
  "username": null,
  "parent_id": "genesis",
  "status": "created",
  "created_at": {
    "$date": "2025-09-28T14:56:34.733Z"
  },
  "claimed_at": null,
  "pem_file_path": null,
  "client_id": null,
  "client_secret": null,
  "certificate_gcs_path": null,
  "bank_status": "pending"
}
```

## 🏗️ Architecture Overview

B2PIX follows a **service-oriented, event-driven architecture** with these key principles:

### 🔧 Service-Oriented Design
- **Services encapsulate business logic** and manage their own dependencies
- **Services register their own event handlers** for clean separation of concerns
- **App layer only knows about services**, not individual handlers
- **Easy to extend** with new services without modifying existing code

### 📨 Event-Driven Architecture
- **All business actions generate events** that are processed asynchronously
- **Complete audit trail** through persistent event storage
- **Individual handler tracking** prevents duplicate processing
- **Automatic retry logic** with exponential backoff for failed events

### 🎯 Domain-Driven Design
- **Features organized around business domains** (invites, users, etc.)
- **Clear boundaries** between different business contexts
- **Shared concepts** extracted to common modules
- **Repository pattern** for clean data access abstraction

## 📁 Project Structure

```
src/
├── app.rs                      # 🎯 Application orchestration & service setup
├── main.rs                     # 🚀 Application entry point
├── config.rs                   # ⚙️ Configuration management
├── common/                     # 🔧 Shared services & utilities
│   ├── email_service.rs        # 📧 Email service with handler registration
│   ├── errors.rs               # ❌ Common error types
│   └── ...
├── events/                     # 📨 Event processing system
│   ├── store.rs                # 💾 Event persistence
│   ├── publisher.rs            # 📤 Event publishing
│   ├── processor.rs            # ⚙️ Event processing orchestration
│   └── handlers.rs             # 🎛️ Core event handlers
├── features/                   # 🎨 Business feature modules
│   ├── email/                  # 📧 Email feature
│   │   └── email_handler.rs    # Email-specific event handlers
│   ├── invites/                # 🎫 Invite management
│   │   ├── domain/             # 📋 Business entities & rules
│   │   ├── services/           # 🔧 Business services
│   │   ├── repositories/       # 💾 Data access implementations
│   │   └── ports/              # 🔌 Repository interfaces
│   └── shared/                 # 🤝 Shared domain concepts
├── api/                        # 🌐 HTTP API layer
│   └── v1/                     # Version 1 API
├── infrastructure/             # 🏗️ External system integrations
│   ├── database/               # 💾 Database implementations
│   └── blockchain/             # ⛓️ Blockchain integrations
```

## 🔧 Service-Based Handler Registration

### Core Pattern
Services are responsible for registering their own event handlers:

```rust
// 1. Service implements handler registration
impl EmailService {
    pub fn register_handlers(
        self: Arc<Self>,
        registry: &mut EventHandlerRegistry,
    ) {
        registry.register(Arc::new(InviteEmailHandler::new(Arc::clone(&self))));
        // Add more handlers as needed
    }
}

// 2. App registers services, not individual handlers
pub async fn run() -> anyhow::Result<()> {
    let email_service = Arc::new(EmailService::new(config.from_email).await.unwrap());
    
    let mut handler_registry = EventHandlerRegistry::new();
    Arc::clone(&email_service).register_handlers(&mut handler_registry);
    
    // Continue with setup...
}
```

### Benefits
- ✅ **Clean separation of concerns**
- ✅ **Easy to extend** with new handlers
- ✅ **Services manage their own dependencies**
- ✅ **App layer stays simple** and focused
- ✅ **Testable** services and handlers

## 🎯 Key Features

### 📧 Email Service
- **ZeptoMail API integration** for transactional emails
- **Template-based** email sending
- **Event-driven** email processing
- **Automatic retry** for failed emails

### 🎫 Invite Management
- **Stacks blockchain integration** for signature verification
- **String-based payload parsing** with line-by-line validation
- **Domain validation** ensuring requests come from "b2pix.org"
- **Event sourcing** for complete audit trail
- **Validation services** for input sanitization
- **Repository pattern** for data access

### 🏦 Banking Integration
- **EFI Pay PIX operations** with OAuth2 authentication
- **Certificate management** with PKCS#12 to PEM conversion
- **Scope validation** ensuring proper permissions
- **Secure certificate storage** in Google Cloud Storage

### 📨 Event System
- **MongoDB-based** event storage
- **Individual handler tracking** prevents duplicate processing
- **Exponential backoff** retry logic
- **Complete audit trail** for compliance

### 🔐 Security
- **Cryptographic signature verification**
- **Input validation** and sanitization
- **Domain validation** for request origin verification
- **Environment-based configuration**
- **Structured error handling**

## 📄 API Reference

### 🎫 Invite Management Endpoints

#### 1. Send Invite
**Endpoint:** `POST /v1/invites/send`

Creates a new invite with specified parent and sends it via email.

**Request Example:**
```json
{
  "address": "SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ",
  "publicKey": "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92",
  "signature": "30ad6b29941229924b0b61cb245d4adbb85555ff31e4547e6e95a72a6373307b031f3d57689eb8f418fee0bf8455a3fcdd22286e10b4469c8160d41e8796ec0101",
  "payload": "B2PIX - Enviar Convite\nb2pix.org\nronoeljr@gmail.com\n2025-07-18T02:42:22.817Z"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "code": "8KH3P8Y1",
  "status": "created"
}
```

**Payload Structure:**
The `payload` string contains exactly **5 lines** separated by `\n`:

| Line | Field | Value | Validation |
|------|-------|-------|------------|
| 1 | Action | `"B2PIX - Enviar Convite"` | Must match exactly |
| 2 | Domain | `"b2pix.org"` | Must match exactly |
| 3 | Username | `"Bob Dino"` | 2-32 characters |
| 4 | Email | `"ronoeljr@gmail.com"` | Valid email format |
| 5 | Timestamp | `"2025-07-09 17:51:55.309 UTC"` | ISO format |

#### 2. Claim Invite
**Endpoint:** `POST /v1/invites/claim`

Claims an existing invite by providing the code and wallet address.

**Request Example:**
```json
{
  "publicKey": "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92",
  "signature": "40ad6b29941229924b0b61cb245d4adbb85555ff31e4547e6e95a72a6373307b031f3d57689eb8f418fee0bf8455a3fcdd22286e10b4469c8160d41e8796ec0101",
  "payload": "B2PIX - Resgatar Convite\nb2pix.org\n8KH3P8Y1\nSP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\n2025-07-18T02:42:22.817Z"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "claimed"
}
```

**Payload Structure:**
The `payload` string contains exactly **5 lines** separated by `\n`:

| Line | Field | Value | Validation |
|------|-------|-------|------------|
| 1 | Action | `"B2PIX - Resgatar Convite"` | Must match exactly |
| 2 | Domain | `"b2pix.org"` | Must match exactly |
| 3 | Invite Code | `"8KH3P8Y1"` | Valid invite code |
| 4 | Wallet Address | `"SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ"` | Valid Stacks address |
| 5 | Timestamp | `"2025-07-18T02:42:22.817Z"` | ISO format |

#### 3. Get Invite by Code
**Endpoint:** `GET /v1/invites/code/{code}`

Retrieves invite information by invite code.

**Request Example:**
```http
GET /v1/invites/code/8KH3P8Y1
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "created"
}
```

#### 4. Get Invite by Address
**Endpoint:** `GET /v1/invites/address/{address}`

Retrieves invite information by wallet address (for claimed invites).

**Request Example:**
```http
GET /v1/invites/address/SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "claimed"
}
```

### 🔐 Security & Validation

#### Signature Verification
POST endpoints require cryptographic signature verification:

1. **Message Construction**: The `payload` string is used as the message to verify
2. **Public Key Validation**: Must be a valid Stacks public key format
3. **Address Derivation**: The public key must derive to the provided address
4. **Signature Format**: Uses RSV format for signature verification

#### Authorization
- **Send Invites**: Only authorized public keys can send invites:
  ```
  Authorized Public Key: 037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92
  ```
- **Claim Invites**: Any valid Stacks address can claim an available invite

#### Validation Rules
- ✅ **Action validation**: Must match expected action strings
- ✅ **Domain validation**: Must be exactly "b2pix.org"
- ✅ **Username validation**: 2-32 characters for sending invites
- ✅ **Email validation**: Valid email format for sending invites
- ✅ **Address validation**: Valid Stacks address format
- ✅ **Code validation**: Valid invite code for claiming
- ✅ **Signature verification**: Cryptographic signature validation
- ✅ **Address-PublicKey match**: Derived address must match provided address

### 📧 Email Notifications

#### Invite Request Email
- **Trigger**: When invite is successfully created
- **Template**: `RequestInviteCode` (ID: 37)
- **Parameters**: `code`, `username`
- **Recipient**: User's email address

#### Invite Approval Email
- **Trigger**: When invite is successfully approved
- **Template**: `InviteApproved` (ID: 38)
- **Parameters**: `username`, `address`
- **Recipient**: User's email address

### ❌ Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid payload format: expected 6 lines"
}
```

#### 401 Unauthorized
```json
{
  "error": "Invalid signature"
}
```

#### 403 Forbidden
```json
{
  "error": "Unauthorized public key for approval"
}
```

#### 404 Not Found
```json
{
  "error": "Invite not found"
}
```

#### 409 Conflict
```json
{
  "error": "Invite is already approved or cannot be approved in its current status"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to process request"
}
```

### 📊 Event Flow

#### Invite Request Flow
```
1. POST /v1/invites/request
   ↓
2. Validate signature & payload
   ↓
3. Create/Update invite in database
   ↓
4. Publish "InviteRequested" event
   ↓
5. Send invite code email
```

#### Invite Approval Flow
```
1. POST /v1/invites/approve
   ↓
2. Validate authorized public key
   ↓
3. Validate signature & payload
   ↓
4. Find invite by code
   ↓
5. Update status to "approved"
   ↓
6. Publish "InviteApproved" event
   ↓
7. Send welcome email
```

## 🧪 Testing & Development

### Running Tests
```bash
# Run all tests
cargo test

# Integration tests
cargo test --test integration_tests

# Email testing (requires ZeptoMail API key)
cargo test test_send_transactional_email -- --ignored

# Test signature verification with logging
cargo test test_verify_message_signature_rsv_with_logging -- --nocapture
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t b2pix-server .

# Run container
docker run -p 8080:8080 --env-file .env b2pix-server
```

### Production Considerations
- **Environment variables** for configuration
- **MongoDB connection pooling** for performance
- **Structured logging** with tracing
- **Health checks** for monitoring
- **Event replay** for disaster recovery

### Health & Monitoring Endpoints
- `GET /health` - Service health check
- `GET /v1/events` - Get event history (admin)
- `GET /v1/events/consumers` - Get event processing status

