# B2PIX UI

Frontend interface for B2PIX platform - P2P Bitcoin Exchange with PIX integration.

## 📋 Prerequisites

- Node.js (version 18 or higher)
- npm (usually installed with Node.js)

## 🚀 Installation

1. Clone the repository (if you haven't already):
```bash
git clone <repository-url>
cd b2pix-ui
```

2. Install project dependencies:
```bash
npm install
```

## 🏃 Running the Project

### Development Mode

To start the development server:

```bash
ng serve
```

The application will be available at `http://localhost:4200/`. The page will automatically reload when you make changes to the code.

### Production Build

To generate optimized files for production:

```bash
npm run build
```

The build files will be generated in the `dist/` directory.

### Watch Mode

For development with automatic rebuild:

```bash
npm run watch
```

### Run Tests

To run unit tests:

```bash
npm test
```

## 🛠 Main Technologies

- **Angular 20+** - Frontend framework
- **TypeScript** - Programming language
- **Stacks Connect** - Stacks blockchain integration
- **SCSS** - CSS preprocessor

## 📁 Project Structure

```
src/
├── app/              # Application code
│   ├── components/   # Reusable components
│   ├── pages/        # Application pages
│   ├── services/     # Services
│   ├── guards/       # Route guards
│   └── libs/         # Libraries and utilities
├── environments/     # Environment configurations
└── styles/           # Global styles
```

## 🌐 Environments

The project has three configured environments:

- **development** - Local development environment
- **staging** - Staging environment
- **production** - Production environment

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Stacks wallet (Leather, Xverse, etc.)
- Brazilian bank account with PIX support (for trading)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ronoel/b2pix-ui.git
   cd b2pix-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:4200/`

### Available Scripts

- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run watch` - Build with file watching
- `ng serve --configuration production` - Start production server
- `ng serve --configuration staging` - Start production server

## 🌐 Environment Configuration

The app supports multiple environments:

- **Development**: Local testing with testnet
- **Staging**: Pre-production testing
- **Production**: Live mainnet deployment

Each environment configures:
- Stacks network (testnet/mainnet)
- API endpoints
- Smart contract addresses
- sBTC token configuration

## 🔐 Security Features

- **Non-custodial**: Users maintain control of their private keys
- **Smart contract escrow**: Funds are locked in smart contracts during trades
- **PIX verification**: Bank account verification for secure payments
- **Invite system**: Controlled access to maintain platform quality
- **Transaction verification**: All blockchain transactions are verified

## 🎯 How It Works

1. **Get Invited**: Request an invitation to join the platform
2. **Connect Wallet**: Link your Stacks-compatible wallet
3. **Setup PIX**: Configure your Brazilian bank account
4. **Trade Bitcoin**: Buy or sell Bitcoin with other users
5. **Instant Settlement**: PIX payments and Bitcoin transfers happen simultaneously

## 🤝 Contributing

This is an open-source project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Website**: [b2pix.org](https://b2pix.org)
- **Stacks Blockchain**: [stacks.org](https://stacks.org)
- **PIX**: [bcb.gov.br](https://www.bcb.gov.br/estabilidadefinanceira/pix)

## ⚡ About sBTC

sBTC (synthetic Bitcoin) is a 1:1 Bitcoin-backed asset on the Stacks blockchain that enables:
- Fast, cheap Bitcoin transactions
- Smart contract programmability
- DeFi integration while maintaining Bitcoin exposure
- Seamless conversion to/from real Bitcoin

---

