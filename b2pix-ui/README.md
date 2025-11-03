# B2PIX - Bitcoin PIX Exchange

A peer-to-peer Bitcoin trading platform that enables seamless Bitcoin transactions using Brazil's PIX instant payment system. Built on the Stacks blockchain with sBTC integration for secure, non-custodial trading.

## 🚀 Overview

**B2PIX** is a privacy-focused, automated P2P Bitcoin exchange platform that bridges traditional Brazilian banking (PIX) with Bitcoin. Users can buy and sell Bitcoin directly with each other using instant PIX transfers, all while maintaining custody of their funds through smart contracts on the Stacks blockchain.

### Key Features

- **Non-Custodial Trading**: Your Bitcoin stays in your wallet until the trade is completed
- **PIX Integration**: Instant Brazilian real transfers using PIX payment system
- **Stacks Blockchain**: Built on Bitcoin's most advanced layer-2 solution
- **sBTC Support**: Trade with synthetic Bitcoin (sBTC) for faster, cheaper transactions
- **Privacy First**: Invite-only platform with minimal data collection
- **Smart Contracts**: Automated escrow and trade settlement
- **Bank Integration**: Direct integration with Brazilian banks for PIX setup

## 🛠 Technology Stack

- **Frontend**: Angular 20+ with TypeScript
- **Blockchain**: Stacks blockchain smart contracts
- **Wallet**: Stacks Connect wallet integration
- **Payments**: PIX (Brazilian instant payment system)
- **Styling**: SCSS with custom design system
- **Assets**: sBTC (synthetic Bitcoin) tokens

## 🏗 Architecture

The platform consists of several key components:

### Core Services
- **Wallet Service**: Stacks wallet connection and management
- **sBTC Token Service**: Smart contract interactions for sBTC transfers
- **Bolt Protocol Service**: Lightning-fast Bitcoin layer integration
- **PIX Integration**: Brazilian banking system connectivity

### Smart Contract Features
- Escrow management for secure trading
- Automated trade settlement
- Fee management and distribution
- Multi-signature transaction support

### User Interface
- **Landing Page**: Public information and invite requests
- **Dashboard**: Trade overview and account management  
- **Buy/Sell**: P2P marketplace for Bitcoin trading
- **PIX Account**: Bank account setup and management
- **Ad Management**: Create and manage trading advertisements

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

- `npm start` - Start development server
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

