![B2Pix logo](logo-vertical-branco.png?raw=true)

# B2Pix - Bitcoin Payments for Everyday Life in Brazil

## Overview

**B2Pix** is a non-custodial platform that bridges sBTC on Stacks with Brazil's PIX instant payment system, enabling Brazilians to use Bitcoin in their everyday life. Users can pay electricity bills, buy on Amazon and Mercado Livre, pay for groceries — anything that accepts PIX can be paid with sBTC.

Unlike traditional crypto-to-fiat offramps that require exchanges, KYC, and days of waiting, B2Pix settles instantly through PIX. The entire process is trustless: a Clarity smart contract holds the sBTC in escrow until the PIX payment is verified by our attestation service. No intermediary ever has custody of user funds.

## App & Social

* **[Website](https://b2pix.org)**
* **[Video Demo](https://www.youtube.com/watch?v=lZwk6rVDvzI)**
* **[X/Twitter](https://x.com/b2pixorg)**
* **[Telegram](https://t.me/+XGmtL15A4BszMmQx)**
* **[Instagram](https://www.instagram.com/b2pix_)**

Watch our demonstration video that showcases how B2Pix works:

[![B2Pix Demo](https://img.youtube.com/vi/lZwk6rVDvzI/0.jpg)](https://youtu.be/lZwk6rVDvzI)

### Key Features

* **Bill Payments**: Pay any Brazilian bill (electricity, water, internet, phone) directly with sBTC. Paste the bill's PIX QR code, and B2Pix handles the rest.
* **E-commerce Purchases**: Buy on any Brazilian e-commerce platform (including Amazon and Mercado Livre) that accepts PIX, using your sBTC.
* **P2P Exchange**: Buy and sell Bitcoin directly with other users using instant PIX transfers.
* **Non-Custodial Escrow**: Clarity smart contracts ensure no party has custody of funds. sBTC is locked until PIX payment is verified.
* **Fee UX via Bolt Protocol**: Pay Stacks transaction fees in sBTC — no need to hold STX. Zero friction for new users.
* **Embedded Wallet**: Built-in non-custodial wallet with passkey/WebAuthn authentication. No browser extension required.
* **PIX Attestation Service**: Verification of PIX payments for trustless settlement.
* **Email Notifications**: Transactional e-mail alerts (e.g., purchase completed, sale completed, payment confirmed).

## 🎯 How It Works

### Paying Bills & E-commerce

1. **Open B2Pix**: Access the platform through the embedded wallet or connect your Stacks wallet
2. **Paste PIX QR Code**: Copy the bill's PIX QR code or the e-commerce checkout PIX code
3. **Confirm Payment**: B2Pix creates a non-custodial escrow in a Clarity smart contract, locking your sBTC
4. **PIX Settlement**: The payment is made via PIX and verified by our attestation service
5. **Done**: Your bill is paid or your purchase is completed. Instant settlement.

### P2P Trading

1. **Connect Wallet**: Use the embedded wallet or link your Stacks-compatible wallet
2. **Setup PIX**: Configure your Brazilian bank account
3. **Trade Bitcoin**: Buy or sell Bitcoin with other users via PIX

---

## Stacks Technology Used

* **Clarity Smart Contracts**: Non-custodial escrow for SIP-010 tokens
* **sBTC**: Primary asset for payments (SIP-010)
* **Bolt Protocol**: Fee abstraction enabling sBTC fee payments (created by the B2Pix team)
* **stacks.js / @stacks/connect v8**: Wallet integration and transaction handling
* **SIP-030**: Sponsored transactions for gasless user experience
* **Passkey/WebAuthn**: Blockchain private key protection for embedded wallet

---

## Single-Token UX via Bolt Protocol (No STX Required)

A key UX feature of **B2Pix** is **no dual-token requirement** on Stacks. New users don't need **STX** to pay transaction fees — they can use a **fresh wallet** and operate **only with sBTC**:

* **Fees in sBTC:** All contract calls can pay network fees in **sBTC** instead of STX.
* **No STX setup friction:** Users can acquire sBTC and transact immediately without preloading STX.
* **Powered by Bolt Protocol:** This is enabled by the [**Bolt Protocol**](https://github.com/ronoel/bolt-protocol), which allows Stacks fees to be paid in sBTC.

**Bolt Protocol Resources:**

* [GitHub Repository](https://github.com/ronoel/bolt-protocol)
* [Contract Source Code](https://github.com/ronoel/bolt-protocol/blob/main/bolt-protocol-contracts/contracts/boltproto-sbtc.clar)
* [Mainnet Contract Explorer](https://explorer.hiro.so/txid/SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ.boltproto-sbtc-v2?chain=mainnet)

> Result: simpler onboarding and a Bitcoin-native UX focused on sBTC.

## Embedded Wallet for Web2-like UX

To make onboarding into the Stacks ecosystem as smooth as possible, **B2Pix** offers two wallet options:

* **Connect External Wallet:** Users can connect their preferred Stacks wallet (such as Xverse or Leather) through `@stacks/connect`.
* **Use Embedded Wallet:** Alternatively, users can choose the built-in non-custodial wallet that is fully integrated into the dApp.

The **embedded wallet** is designed to offer a **Web2-like experience** — allowing users to start trading instantly without installing extensions or leaving the app:

* **Instant Onboarding:** Create or import a wallet directly in-app with passkey/WebAuthn authentication.
* **Secure Key Storage:** Private keys are encrypted and stored locally in the browser, with optional encrypted backup/export.
* **Seamless UX:** Eliminates friction for first-time users of the Stacks blockchain, while maintaining full self-custody.

> Result: a **simpler and smoother onboarding experience** for new users, bridging familiar Web2 usability with the power and security of Web3 on Stacks.

---

## Architecture

### Architecture Diagram

```
flowchart TD
  subgraph Client
    F["@stacks/connect"]
  end

  subgraph Backend
    API["REST API"]
    Server["B2Pix Server"]
  end

  subgraph Protocol["Bolt Protocol"]
    BOLT["Bolt Protocol API"]
  end

  subgraph Chain["Stacks Blockchain"]
    Hiro["Hiro API"]
    C["Smart Contract"]
  end

  subgraph Bank["Bank"]
    PIX["PIX API/PSP"]
  end


  F -->|Signed Requests| API

  API <--> Server
  Server <-->|Submit Tx / Fees in sBTC| BOLT

  Server <--> PIX

  BOLT --> Hiro
  Hiro --> C
```

* **Frontend (Angular):** Requires a SIP-030 Stacks wallet and uses `@stacks/connect` for authentication and transaction signing.
  + **Embedded Wallet Integration:**
    The frontend includes an in-app **key manager** for the embedded wallet.
    It handles wallet creation, import, encryption, signing, and optional backup/export —
    enabling direct communication between the dApp and smart contracts without relying on external extensions.
* **Backend (Rust):** Event-driven services (orders, escrow, PIX). Communicates with the **Bolt Protocol API** to interact with the Stacks blockchain and enable **fees in sBTC** (no STX required).
* **PIX Integration:** The server communicates with Brazilian **PIX APIs** (banks/PSPs) to verify incoming payments.
* **Signed FrontBack Communications:** All requests from the frontend to the backend carry **messages signed by the user's SIP-030 wallet**, providing origin authentication and replay protection.

### Payment Verification Flow

```
  BUYER                       BACKEND                      SELLER
    │                            │                            │
    │                            │                            │
    │                            │ 0. Create Advertisement    │
    │                            │                            │
    │                            │<───────────────────────────│
    │                            │                            │
    │                            │ 1. Lock sBTC in            │
    │                            │    Smart Contract (Bolt)   │
    │                            │<───────────────────────────│
    │                            │                            │
    │ 2. Request to Buy          │                            │
    │───────────────────────────▶│                            │
    │                            │                            │
    │                            │ 3. Reserve sBTC amount     │
    │                            │    for Buyer in contract   │
    │                            │                            │
    │ 4. Send BRL via PIX        │                            │
    │    to seller's PIX key     │                            │
    │                            │                            │
    │ 5. Mark as Paid            │                            │
    │───────────────────────────▶│                            │
    │                            │ 6. Verify Payment          │
    │                            │    - Check PIX transaction │
    │                            │    - Verify amount         │
    │                            │                            │
    │                            │ 7. Update Buy Status       │
    │                            │    PAID  PAYMENT_CONFIRMED │
    │                            │                            │
    │                            │ 8. Notify Seller           │
    │                            │───────────────────────────▶│
    │                            │                            │
    │                            │ 9. Release sBTC from       │
    │◀───────────────────────────┤    Smart Contract (Bolt → Stacks)
    │    Bitcoin received        │                            │
    │                            │                            │
```

## Smart Contracts

### Escrow Contract (Addresses & Functions)

**Contract Source Code**
[boltproto-sbtc.clar](https://github.com/ronoel/bolt-protocol/blob/main/bolt-protocol-contracts/contracts/boltproto-sbtc.clar)

**Contract address — Testnet**
`ST3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02W1N0YJF.boltproto-sbtc-rc-2-0-0`
[View on Explorer](https://explorer.hiro.so/txid/ST3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02W1N0YJF.boltproto-sbtc-rc-2-0-0?chain=testnet)

**Contract address — Mainnet**
`SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ.boltproto-sbtc-v2`
[View on Explorer](https://explorer.hiro.so/txid/SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ.boltproto-sbtc-v2?chain=mainnet)

**Functions used by B2Pix trade flow**

* **Lock seller sBTC:** `transfer-stacks-to-bolt`
* **Release to buyer:** `transfer-bolt-to-stacks`

### Trust & Assumptions

* **On-chain truth:** Asset custody and state are enforced by Clarity contracts.
* **Off-chain signal:** PIX "payment received" is verified off-chain (bank app/PSP event).
* **Disputes / timeouts:** If no valid confirmation before expiry, funds are refunded to the seller.

---

## Roadmap

### Now — sBTC + PIX
* Pay bills with sBTC (electricity, water, internet, phone)
* Buy on Amazon and Mercado Livre with sBTC
* P2P Bitcoin exchange via PIX
* Real users, real transactions — **live in production**

### Next — USDCx + PIX
* Add USDCx support — same architecture, no fundamental changes needed (SIP-010 compatible)
* Stablecoin payments via PIX
* Cross-border remittances

### Future — Global Payments
* Expand to every country with instant payment systems
* India UPI (350M+ users), Mexico SPEI, Colombia, Thailand, Indonesia
* Bridge Bitcoin and stablecoins on Stacks to every instant payment rail in the world

### Competitive Advantages

* **Non-custodial:** Users retain full control of their sBTC through Clarity smart contracts
* **Instant settlement:** PIX enables real-time fiat transfers (24/7/365)
* **Bitcoin-native UX:** Single-token experience via Bolt Protocol — no STX needed
* **Mainstream accessible:** Embedded wallet with passkey auth, no crypto knowledge required
* **USDCx ready:** Built on SIP-010, adding new assets requires no architectural changes

---

## Technical Innovation

**B2Pix** showcases several cutting-edge features in the Stacks ecosystem:

* **Built on [Bolt Protocol](https://github.com/ronoel/bolt-protocol)** for sBTC fee payment
* **Hybrid wallet architecture** combining external wallet support with embedded Web2-like experience
* **Server-side PIX verification** integrated with smart contract escrow
* **SIP-030 message signing** for secure frontend-backend communication

---

## License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.