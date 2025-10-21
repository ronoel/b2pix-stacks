# B2PIX - Bitcoin PIX Exchange

## 🚀 Overview

**B2PIX** is a privacy-focused, automated P2P Bitcoin exchange platform that bridges traditional Brazilian banking (PIX) with Bitcoin. Users can buy and sell Bitcoin directly with each other using instant PIX transfers, all while maintaining custody of their funds through smart contracts on the Stacks blockchain.

### Key Features

- **Non-Custodial Trading**: Your Bitcoin stays in your wallet until the trade is completed
- **PIX Integration**: Instant Brazilian real transfers using PIX payment system
- **Stacks Blockchain**: Built on Bitcoin's most advanced layer-2 solution
- **sBTC Support**: Trade with synthetic Bitcoin (sBTC) for faster, cheaper transactions
- **Privacy First**: Invite-only platform with minimal data collection
- **Fee UX via Bolt:** Pay Stacks tx fees in **sBTC** (Bolt Protocol) for simpler UX.  
- **Bank Integration**: Direct integration with Brazilian banks for PIX setup

## 🎯 How It Works

1. **Get Invited**: Request an invitation to join the platform
2. **Connect Wallet**: Link your Stacks-compatible wallet
3. **Setup PIX**: Configure your Brazilian bank account
4. **Trade Bitcoin**: Buy or sell Bitcoin with other users

---

## 💳 Single‑Token UX via Bolt Protocol (No STX Required)

A key UX feature of **B2PIX** is **no dual‑token requirement** on Stacks. New users don’t need **STX** to pay transaction fees — they can use a **fresh wallet** and operate **only with sBTC**:

- **Fees in sBTC:** All contract calls can pay network fees in **sBTC** instead of STX.  
- **No STX setup friction:** Users can acquire sBTC and transact immediately without preloading STX.  
- **Powered by Bolt Protocol:** This is enabled by the **Bolt Protocol**, which allows Stacks fees to be paid in sBTC. See: https://github.com/ronoel/bolt-protocol

> Result: simpler onboarding and a Bitcoin‑native UX focused on sBTC.

## 🧩 Smart Contracts

### Escrow Contract (Addresses & Functions)

**Contract address — Testnet**  
`ST3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02W1N0YJF.boltproto-sbtc-rc-2-0-0`

**Contract address — Mainnet**  
`SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ.boltproto-sbtc-v2`

**Functions used by B2PIX trade flow**  
- **Lock seller sBTC:** `transfer-stacks-to-bolt`  
- **Release to buyer:** `transfer-bolt-to-stacks`

### Trust & Assumptions

- **On-chain truth:** Asset custody and state are enforced by Clarity contracts.  
- **Off-chain signal:** PIX “payment received” is verified off-chain (bank app/PSP event).  
- **Disputes / timeouts:** If no valid confirmation before expiry, send refunds to the seller.

---

- Wallets: any implementing **SIP-030** should work.  
- Transactions: contract calls use **sBTC**; with **Bolt**, fees can be paid in sBTC to avoid STX UX friction.

---

## 🔄 Trade Flow

1. **Seller posts offer** → defines price, min/max, and deposit `lock(...)`.  
2. **Buyer takes offer** → UI shows PIX instructions.  
3. **Buyer sends PIX** → off-chain payment occurs.  
4. **PIX confirmation** → webhook/manual confirm triggers `confirm(trade-id)`.  
5. **Contract releases** → sBTC transfers to the buyer’s wallet.  
6. **Timeout** → if no confirm before `expiry`, seller get refund.

**Failure Modes**
- Buyer sends PIX but never confirmed → dispute channel; seller can refund after expiry if no valid proof.  
- Seller locks funds but disappears → either confirm (if proof exists) or refund after expiry.  
- Indexer downtime → safe restart; reconcile from on-chain events.

---

## Payment Verification Flow

```
  BUYER                       BACKEND                      SELLER
    │                            │                            │
    │ 1. Send BRL via PIX        │                            │
    │───────────────────────────▶│                            │
    │    to seller's PIX key     │                            │
    │                            │                            │
    │ 2. Mark as Paid            │                            │
    │                            │                            │
    │───────────────────────────▶│                            │
    │                            │ 3. Verify                  │
    │                            │    - Check PIX transaction │
    │                            │    - Verify amount         │
    │                            │                            │
    │                            │ 4. Update Buy Status       │
    │                            │    PAID → PAYMENT_CONFIRMED│
    │                            │                            │
    │                            │ 5. Notify Seller           │
    │                            │───────────────────────────▶│
    │                            │                            │
    │                            │ 6. Release sBTC            │
    │◀───────────────────────────┤    (Bolt to Stacks)        │
    │    Bitcoin received        │                            │
    │                            │                            │
```

---

## 🔗 Links

- **Website**: [b2pix.org](https://b2pix.org)

## ⚡ About sBTC

sBTC (synthetic Bitcoin) is a 1:1 Bitcoin-backed asset on the Stacks blockchain that enables:
- Fast, cheap Bitcoin transactions
- Smart contract programmability
- DeFi integration while maintaining Bitcoin exposure
- Seamless conversion to/from real Bitcoin
