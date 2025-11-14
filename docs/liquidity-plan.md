# Liquidity Structure Plan (Pilot Phase)
**B2PIX – Milestone 1**

## 1. Overview
During the pilot, all liquidity (both sBTC and BRL via PIX) will be provided by a **single market maker**, the operator of the project.  
This simplifies early testing, reduces risk, and allows the team to validate the escrow contract, PIX attestation logic, and full trade flow before opening liquidity to external providers.

The system will operate as a controlled P2P environment, with B2PIX coordinating on-chain escrow and off-chain PIX confirmation.

---

## 2. Liquidity Provider (Maker)

### 2.1 Provider Identity
- **Single liquidity provider:** The project operator (founder).
- **Role:** Provide sBTC liquidity and receive PIX payments directly through a personal or dedicated bank account.

### 2.2 Responsibilities
- Maintain sufficient sBTC balance in the liquidity wallet.
- Receive PIX payments from buyers.
- Confirm receipt of PIX (manually during the pilot).
- Add or withdraw liquidity as required.

---

## 3. Liquidity Wallets

### 3.1 Liquidity Wallet (Stacks / sBTC)
Used to:
- deposit sBTC into the B2PIX escrow contract,
- provide liquidity for pilot trades,
- receive returned sBTC from expired or cancelled trades.

Requirements:
- wallet dedicated exclusively to the pilot phase,
- secure private key handling,
- minimum operational balance defined (example: 0.01–0.1 sBTC).

### 3.2 Bank Account (PIX)
Used to:
- receive PIX payments from buyers,
- verify the status of these payments via manual checking, API mock, or real PSP integration.

Requirements:
- personal bank account of the operator,
- dedicated PIX key exclusively for B2PIX (recommended).

---

## 4. Trade Flow (Pilot Version)

### 4.1 Summary Flow
1. The liquidity provider deposits sBTC in the B2PIX escrow contract.  
2. A buyer creates a purchase order.  
3. The contract locks the corresponding amount of sBTC.  
4. The platform displays the provider’s PIX key.  
5. The buyer sends a PIX payment.  
6. B2PIX verifies the payment (mock or API).  
7. Upon confirmation, the contract releases sBTC to the buyer.  
8. If payment is not confirmed, the contract returns sBTC to the provider after a timeout.

### 4.2 Guarantees
- sBTC remains locked in escrow until a valid PIX confirmation is provided.
- The provider cannot withdraw funds locked in active trades.
- A buyer cannot force release without official payment confirmation.

---

## 5. Funding Strategy

### 5.1 sBTC (Bitcoin Side)
- Provider supplies initial sBTC liquidity (e.g., 0.01–0.1 sBTC).
- Funds are deposited into the contract through a `deposit-liquidity` function.
- Amount can be adjusted as testing needs evolve.

### 5.2 BRL (PIX Side)
- PIX payments are received directly into the provider’s bank account.
- During the pilot, only “buy BTC” flows will be supported, so no BRL payouts are required.

---

## 6. Risk Management

### 6.1 Operational Limits
- **Maximum amount per trade:** defined to reduce exposure (e.g., R$50–R$200).
- **Daily overall limit:** to mitigate risk in case of suspicious activity.

### 6.2 Monitoring
- Manual confirmation of PIX receipts during the pilot.
- Local logs for each confirmed transaction.

### 6.3 Contract Safety
- sBTC is locked until authenticated PIX confirmation is provided.
- Timeout automatically returns funds to the provider when payment is not confirmed.

---

## 7. Liquidity Evolution Roadmap
After the pilot phase:
1. Introduce **multiple liquidity providers** with a whitelisting mechanism.  
2. Implement **staking or bonded liquidity pools** to decentralize liquidity.  
3. Enable **maker fee incentives** for external providers.  
4. Automate PIX confirmation using bank APIs or a PSP partner.

---

## 8. Conclusion
The pilot’s liquidity structure is simple, controlled, and designed for safe functional validation of the B2PIX protocol.  
Using a single market maker reduces operational complexity and ensures a stable testing environment where the escrow contract, PIX attestations, and sBTC flow can be verified end-to-end before scaling to broader market participation.