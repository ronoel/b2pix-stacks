# B2PIX Rust Server

Rust server with service-oriented and event-driven architecture, implementing invite management, banking integration, and cryptographic authentication.

## 📋 Prerequisites

Before starting, make sure you have installed:

- **Rust** (latest stable version)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
  
- **MongoDB** (version 6.0 or higher)
  - Required for event storage and business data
  
- **Docker** (optional, but recommended for MongoDB)
  ```bash
  # Ubuntu/Debian
  sudo apt-get install docker.io
  
  # macOS
  brew install docker
  ```

- **Google Cloud SDK** (for GCS integration)
  ```bash
  # Install gcloud CLI
  curl https://sdk.cloud.google.com | bash
  exec -l $SHELL
  ```

## 🚀 Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd b2pix-server
```

### 2. Configure MongoDB

Make sure MongoDB is running and accessible. You can use Docker or a local installation:

```bash
# Using Docker (example)
docker run -d -p 27017:27017 --name mongocrypto mongo:6.0.3
```

### 3. Configure Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=b2pix

# Servidor
SERVER_PORT=8080
RUST_LOG=info

# Email (ZeptoMail)
EMAIL_API_KEY=your_zeptomail_api_key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="B2PIX"

# Google Cloud Storage
GCS_BUCKET_NAME=your-gcs-bucket-name
```

### 4. Configure Google Cloud Storage

Choose one of the options below:

#### Option A: Using credentials file
```bash
# 1. Download the JSON credentials file from GCP Console
# 2. Set the environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

#### Option B: Using JSON content directly
```bash
export GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project",...}'
```

#### Option C: Using setup script (recommended)
```bash
./setup_gcs.sh
```

## 🏃 Running the Project

### Development Mode
```bash
# Build and run
cargo run --bin b2pix-rust-server

# With detailed logs (debug)
RUST_LOG=debug cargo run --bin b2pix-rust-server

# With module-specific logs
RUST_LOG=b2pix_rust_server=debug,actix_web=info cargo run --bin b2pix-rust-server
```

### Release Mode (Production)
```bash
# Build in optimized mode
cargo build --release

# Run optimized binary
./target/release/b2pix-rust-server
```

### Using VS Code
1. Open the command palette: `Ctrl+Shift+P` (Linux/Windows) or `Cmd+Shift+P` (macOS)
2. Select: `Tasks: Run Task`
3. Choose: `Build and Run B2PIX Server`

### Using the Startup Script
```bash
chmod +x start_server.sh
./start_server.sh
```

## 🧪 Running Tests

### Full Test Suite
```bash
# Run all tests
cargo test

# Run with detailed output
cargo test -- --nocapture

# Run with logs
RUST_LOG=debug cargo test -- --nocapture
```

### Specific Tests

#### Integration Tests
```bash
cargo test --test integration_tests
```

#### Cryptographic Signature Tests
```bash
# Basic signature verification test
cargo test test_verify_message_signature

# With detailed logs
cargo test test_verify_message_signature_rsv_with_logging -- --nocapture
```

#### Email Tests (Requires API Key)
```bash
# Tests ignored by default (require real configuration)
cargo test test_send_transactional_email -- --ignored
```

#### Module-Specific Tests
```bash
# Invite tests
cargo test --package b2pix-rust-server --lib features::invites

# Event tests
cargo test --package b2pix-rust-server --lib events

# Banking service tests
cargo test --package b2pix-rust-server --lib services::banking
```

### Tests with Coverage
```bash
# Install coverage tool
cargo install cargo-tarpaulin

# Run tests with coverage
cargo tarpaulin --out Html --output-dir coverage
```

### Code Verification

#### Clippy (Linter)
```bash
# Run clippy to check code
cargo clippy

# With all features enabled
cargo clippy --all-features -- -D warnings
```

#### Formatting
```bash
# Check formatting
cargo fmt -- --check

# Apply automatic formatting
cargo fmt
```

## 🔍 Verifying the Installation

After starting the server, you can verify it's working correctly:

```bash
# Health check
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy"}
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

## 🐛 Troubleshooting

### Issue: Compilation errors
```bash
# Clean cache and rebuild
cargo clean
cargo build

# Update dependencies
cargo update
```

### Issue: Tests failing
```bash
# Check if MongoDB is running
docker ps

# Run tests with detailed logs
RUST_LOG=debug cargo test -- --nocapture --test-threads=1
```

### Issue: Environment variables not loading
```bash
# Check if .env file exists
ls -la .env

# Run with explicit variables
MONGODB_URI=mongodb://localhost:27017 cargo run
```

## 📚 Additional Resources

### Documentation
- [Cargo Book](https://doc.rust-lang.org/cargo/) - Rust package manager
- [Actix Web](https://actix.rs/) - Web framework used in the project
- [MongoDB Rust Driver](https://docs.rs/mongodb/latest/mongodb/)

### Project Structure
```
src/
├── main.rs                 # Application entry point
├── app.rs                  # Service configuration and orchestration
├── config.rs               # Configuration management
├── api/                    # HTTP API layer
├── features/               # Business feature modules
├── events/                 # Event processing system
├── services/               # External services (email, banking, etc)
└── infrastructure/         # External system integrations
```

## 🚀 Next Steps

After setting up the environment and running tests successfully:

1. **Explore the API**: Check `API_EXAMPLES.md` for endpoint details
2. **Understand the Architecture**: Read about event-driven architecture in the code
3. **Configure Integrations**: Full setup of EFI Pay and emails
4. **Deploy**: See `deploy/README.md` for production instructions
