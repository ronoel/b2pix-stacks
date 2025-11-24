# sBTC Bridging Documentation

This document explains how sBTC bridging works in the B2Pix application, covering both BTC→sBTC (deposit) and sBTC→BTC (withdrawal) flows.

---

## Table of Contents

1. [Overview](#overview)
2. [sBTC to BTC Withdrawal Flow](#sbtc-to-btc-withdrawal-flow)
3. [Implementation Details](#implementation-details)
4. [Complete Transaction Example](#complete-transaction-example)
5. [Edge Cases and Error Handling](#edge-cases-and-error-handling)
6. [Architecture and Contract Details](#architecture-and-contract-details)
7. [Testing Scenarios](#testing-scenarios)

---

## Overview

The B2Pix application implements a complete sBTC bridging solution that allows users to:

- **Deposit (BTC → sBTC)**: Convert Bitcoin to sBTC tokens on the Stacks blockchain
- **Withdraw (sBTC → BTC)**: Convert sBTC tokens back to Bitcoin

This documentation focuses on the **sBTC → BTC withdrawal flow** implemented in the `SbtcToBtcComponent`.

### Key Concepts

- **sBTC**: A 1:1 Bitcoin-backed token on the Stacks blockchain
- **Signers**: Decentralized entities that facilitate the bridging process
- **Emily API**: The sBTC indexer that tracks withdrawal status
- **Withdrawal Request**: A Stacks smart contract call that initiates the peg-out process

---

## sBTC to BTC Withdrawal Flow

### High-Level Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    sBTC → BTC Withdrawal Flow                    │
└─────────────────────────────────────────────────────────────────┘

1. User Input
   └─> Enter Bitcoin address, amount, max fee

2. Address Validation
   └─> Validate and deconstruct Bitcoin address
   └─> Identify address type (P2PKH, P2SH, P2WPKH, P2WSH, P2TR)

3. Contract Call (Stacks Network)
   └─> Call `initiate-withdrawal-request` on sbtc-withdrawal contract
   └─> Lock sBTC amount + max fee
   └─> Transaction confirmed in ~10 seconds

4. Signers Processing (No user action)
   └─> Wait for Bitcoin block finality (~6 blocks after Stacks anchor)
   └─> Create and broadcast Bitcoin sweep transaction
   └─> Notify Emily API of acceptance

5. Bitcoin Transaction Confirmation
   └─> Signers send BTC to recipient address
   └─> Usually confirmed in next Bitcoin block (N+7)
   └─> Emily updates status to "confirmed"

6. Complete
   └─> User receives BTC in their Bitcoin wallet
   └─> Excess fees (if any) returned to user on Stacks
```

### Timeline

| Step | Network | Time | Description |
|------|---------|------|-------------|
| 1 | Stacks | ~10 seconds | User submits withdrawal request |
| 2 | Bitcoin | ~60 minutes | Wait for 6 Bitcoin confirmations (block N+6) |
| 3 | Bitcoin | ~10 minutes | Signers broadcast sweep transaction |
| 4 | Bitcoin | ~10 minutes | Transaction confirmed (block N+7) |
| **Total** | | **~80 minutes** | End-to-end completion time |

---

## Implementation Details

### Component Structure

The `SbtcToBtcComponent` is an Angular standalone component located at:
```
b2pix-ui/src/app/pages/sbtc-to-btc/sbtc-to-btc.component.ts
```

### Key Dependencies

```typescript
import { AddressType, getAddressInfo } from 'bitcoin-address-validation';
import * as bitcoin from 'bitcoinjs-lib';
import { request } from '@stacks/connect';
import { Cl, Pc } from '@stacks/transactions';
```

### Contract Configuration

```typescript
// Mainnet
SBTC_WITHDRAWAL_CONTRACT = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-withdrawal'
SBTC_TOKEN_CONTRACT = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token'

// Testnet
SBTC_WITHDRAWAL_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-withdrawal'
SBTC_TOKEN_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token'
```

### State Management

The component uses Angular signals for reactive state management:

```typescript
// User inputs
stacksAddress = signal<string>('');
btcAddress = '';
amount = 100000; // satoshis (0.001 BTC)
maxFee = 3000;   // satoshis

// UI state
currentStep = signal<'form' | 'processing'>('form');
isLoading = signal<boolean>(false);
errorMessage = signal<string>('');
btcAddressValid = signal<boolean | null>(null);

// Transaction tracking
stacksTxId = signal<string>('');
btcTxId = signal<string>('');
withdrawalStatus = signal<'pending' | 'accepted' | 'confirmed' | ''>('');
```

---

## Complete Transaction Example

### Step 1: User Input and Validation

```typescript
// User inputs
stacksAddress: 'SP14ZYP25NW67XZQWMCDQCGH9S178JT78QJYE6K37'
btcAddress: 'bc1q56auqnf8juw7a9j2fz6uanjhy6wzxge0nvnfx00xwd0qu2qgzsrs7xvfyq'
amount: 100000 (satoshis)
maxFee: 3000 (satoshis)
```

### Step 2: Bitcoin Address Deconstruction

```typescript
validateBtcAddress() {
  this.decodedBtcAddress = this.deconstructBtcAddress(this.btcAddress);
  this.btcAddressValid.set(true);
}

private deconstructBtcAddress(address: string): { type: string; hashbytes: Uint8Array } {
  // Type mapping
  const typeMapping: { [key: string]: string } = {
    'p2pkh': '0x00',   // Legacy
    'p2sh': '0x01',    // Script
    'p2wpkh': '0x04',  // SegWit
    'p2wsh': '0x05',   // SegWit Script
    'p2tr': '0x06',    // Taproot
  };

  const addressInfo = getAddressInfo(address);
  const { bech32 } = addressInfo;
  
  let hashbytes: Uint8Array;
  if (bech32) {
    // Bech32 addresses (bc1...)
    hashbytes = bitcoin.address.fromBech32(address).data;
  } else {
    // Base58 addresses (1... or 3...)
    hashbytes = bitcoin.address.fromBase58Check(address).hash;
  }

  const type = typeMapping[addressInfo.type];
  return { type, hashbytes };
}
```

**Example Output:**
```json
{
  "type": "0x04",
  "hashbytes": "a6abc068c9783dea16451549cebb174ee82618f9999b53334b2397e02c8a106f"
}
```

### Step 3: Initiate Withdrawal Request

```typescript
async initiateWithdrawal() {
  // 1. Construct recipient tuple
  const recipient = {
    version: Cl.bufferFromHex(this.decodedBtcAddress.type),
    hashbytes: Cl.buffer(this.decodedBtcAddress.hashbytes)
  };

  // 2. Create post condition (ensure correct amount is locked)
  const postCond = Pc.principal(this.stacksAddress())
    .willSendEq(this.amount + this.maxFee)
    .ft(this.SBTC_TOKEN_CONTRACT, 'sbtc-token');

  // 3. Call the withdrawal contract
  const result = await request('stx_callContract', {
    contract: this.SBTC_WITHDRAWAL_CONTRACT,
    functionName: 'initiate-withdrawal-request',
    functionArgs: [
      Cl.uint(this.amount),      // 100000 sats
      Cl.tuple(recipient),        // Bitcoin address components
      Cl.uint(this.maxFee)       // 3000 sats
    ],
    postConditions: [postCond],
    postConditionMode: 'deny',
    network: environment.network,
  });

  this.stacksTxId.set(result.txid);
  this.withdrawalStatus.set('pending');
  this.currentStep.set('processing');
  
  // Start polling for status updates
  this.startStatusPolling();
}
```

**Stacks Transaction Result:**
```json
{
  "txid": "0x4f4000a0ca61ea10e31bc7950672f57612880b6de3a61463bb98e29ca6bb6491"
}
```

### Step 4: Status Polling

```typescript
private startStatusPolling() {
  // Poll Emily API every 30 seconds
  this.statusPollingInterval = setInterval(() => {
    this.checkWithdrawalStatus();
  }, 30000);
}

async checkWithdrawalStatus() {
  // Query Emily API
  const emiliyUrl = environment.network === 'mainnet'
    ? 'https://sbtc-emily.com'
    : 'https://emily-testnet.sbtc.tech';

  const response = await fetch(
    `${emiliyUrl}/withdrawal/sender/${this.stacksAddress()}`
  );

  const data: WithdrawalResponse[] = await response.json();
  
  // Find our withdrawal
  const withdrawal = data.find(w => w.requestId === this.stacksTxId());

  if (withdrawal) {
    this.withdrawalStatus.set(withdrawal.status);
    
    if (withdrawal.txid) {
      this.btcTxId.set(withdrawal.txid);
    }

    // Stop polling when confirmed
    if (withdrawal.status === 'confirmed') {
      clearInterval(this.statusPollingInterval);
    }
  }
}
```

**Emily API Response (Pending):**
```json
{
  "withdrawals": [
    {
      "requestId": 748,
      "stacksBlockHash": "e19bea7a651136ed5a156e69d5952e86a3792f78df2bb20c8c5ab2009fd5617e",
      "stacksBlockHeight": 4461632,
      "recipient": "0020a6abc068c9783dea16451549cebb174ee82618f9999b53334b2397e02c8a106f",
      "sender": "SP14ZYP25NW67XZQWMCDQCGH9S178JT78QJYE6K37",
      "amount": 100000,
      "status": "pending"
    }
  ]
}
```

**Emily API Response (Accepted):**
```json
{
  "withdrawals": [
    {
      "requestId": 748,
      "status": "accepted",
      "amount": 100000,
      "lastUpdateHeight": 4462339
    }
  ]
}
```

**Emily API Response (Confirmed):**
```json
{
  "withdrawals": [
    {
      "requestId": 748,
      "status": "confirmed",
      "amount": 100000,
      "txid": "a355cd64374446e1d0de7096a7c1583bb4564fb6a997650bd9af26605805bfa0"
    }
  ]
}
```

### Step 5: Completion

Once the status is "confirmed", the user has successfully received BTC in their Bitcoin wallet. The `btcTxId` can be used to view the transaction on a Bitcoin block explorer.

**Bitcoin Transaction Explorer:**
```
https://mempool.space/tx/a355cd64374446e1d0de7096a7c1583bb4564fb6a997650bd9af26605805bfa0
```

---

## Edge Cases and Error Handling

### 1. Invalid Bitcoin Address

**Scenario:** User enters an invalid Bitcoin address

```typescript
validateBtcAddress() {
  try {
    if (!this.btcAddress || this.btcAddress.trim() === '') {
      this.btcAddressValid.set(null);
      return;
    }

    this.decodedBtcAddress = this.deconstructBtcAddress(this.btcAddress);
    this.btcAddressValid.set(true);
    this.errorMessage.set('');
  } catch (error) {
    console.error('Invalid Bitcoin address:', error);
    this.btcAddressValid.set(false);
    this.decodedBtcAddress = null;
  }
}
```

**UI Behavior:**
- Form input shows red error state
- Error message: "Endereço Bitcoin inválido"
- Submit button is disabled

### 2. Insufficient Balance

**Scenario:** User tries to withdraw more sBTC than they have

**Contract Behavior:**
- The post condition will fail
- Transaction will be rejected by the Stacks network
- No sBTC is locked

**UI Error Handling:**
```typescript
async initiateWithdrawal() {
  try {
    const result = await request('stx_callContract', {
      // ...contract call
    });
  } catch (error) {
    console.error('Error initiating withdrawal:', error);
    this.errorMessage.set('Erro ao iniciar retirada: ' + (error as Error).message);
    
    // Common error: insufficient balance
    if (error.message.includes('insufficient funds')) {
      this.errorMessage.set('Saldo insuficiente de sBTC');
    }
  }
}
```

### 3. Amount Below Minimum

**Scenario:** User tries to withdraw less than 10,000 satoshis

```typescript
async initiateWithdrawal() {
  if (this.amount < 10000) {
    this.errorMessage.set('Quantidade mínima é 10,000 satoshis');
    this.isLoading.set(false);
    return;
  }
  // ...
}
```

**Minimum Requirements:**
- Minimum withdrawal: 10,000 sats (0.0001 BTC)
- Recommended minimum: 100,000 sats (0.001 BTC) to account for fees

### 4. Transaction Timeout / Failed Fulfillment

**Scenario:** Signers create a transaction but it's never confirmed (fee spike)

**Detection:**
```typescript
async checkWithdrawalStatus() {
  const withdrawal = data.find(w => w.requestId === this.stacksTxId());
  
  if (withdrawal) {
    // Check if stuck in "accepted" status for too long
    const now = Date.now();
    const lastUpdate = new Date(withdrawal.lastUpdateBlockHash).getTime();
    const hoursStuck = (now - lastUpdate) / (1000 * 60 * 60);
    
    if (withdrawal.status === 'accepted' && hoursStuck > 24) {
      this.errorMessage.set(
        'Atenção: A retirada está demorando mais do que o esperado. ' +
        'Isso pode ocorrer devido a picos de taxa na rede Bitcoin.'
      );
    }
  }
}
```

**Why This Happens:**
- User sets low `maxFee`
- Bitcoin network fees spike above `maxFee`
- Signers' transaction cannot compete in the mempool
- Transaction may be dropped or delayed indefinitely

**Resolution:**
- Wait for Bitcoin fees to drop
- Or: User can create a new withdrawal with higher `maxFee`
- Original sBTC remains locked until timeout (implementation-dependent)

### 5. Emily API Unavailable

**Scenario:** Emily API is down or unreachable

```typescript
async checkWithdrawalStatus() {
  try {
    const response = await fetch(
      `${emiliyUrl}/withdrawal/sender/${this.stacksAddress()}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch withdrawal status');
    }

    const data = await response.json();
    // ...process data
  } catch (error) {
    console.error('Error checking withdrawal status:', error);
    this.errorMessage.set('Erro ao verificar status: ' + (error as Error).message);
    
    // Continue polling - API might come back
    // Don't clear the polling interval
  }
}
```

**Fallback Options:**
1. Continue polling (API might recover)
2. Check Stacks blockchain directly for finalization event
3. Use alternative indexer if available
4. Display warning but don't panic user - Bitcoin transaction may still complete

### 6. User Wallet Disconnection

**Scenario:** User's wallet disconnects during the process

```typescript
ngOnInit() {
  const address = this.walletManagerService.getSTXAddress();
  if (!address) {
    // Redirect to connect wallet
    this.router.navigate(['/connect-wallet']);
    return;
  }
  this.stacksAddress.set(address);
}

async initiateWithdrawal() {
  if (!this.stacksAddress()) {
    this.errorMessage.set('Endereço Stacks não encontrado');
    this.isLoading.set(false);
    return;
  }
  // ...
}
```

### 7. Network Mismatch

**Scenario:** User's wallet is on mainnet but app is configured for testnet

```typescript
// Environment configuration check
private readonly SBTC_WITHDRAWAL_CONTRACT = environment.network === 'mainnet'
  ? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-withdrawal'
  : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-withdrawal';

async initiateWithdrawal() {
  // Stacks Connect will throw error if network mismatch
  try {
    const result = await request('stx_callContract', {
      // ...
      network: environment.network,
    });
  } catch (error) {
    if (error.message.includes('network')) {
      this.errorMessage.set(
        'Erro de rede: Verifique se sua carteira está na rede correta ' +
        `(${environment.network})`
      );
    }
  }
}
```

### 8. Post Condition Failure

**Scenario:** Post condition doesn't match actual transfer

```typescript
// Post condition ensures exactly (amount + maxFee) is transferred
const postCond = Pc.principal(this.stacksAddress())
  .willSendEq(this.amount + this.maxFee)  // MUST match exactly
  .ft(this.SBTC_TOKEN_CONTRACT, 'sbtc-token');
```

**If Post Condition Fails:**
- Transaction is rejected before broadcast
- No sBTC is locked
- User sees error: "Post condition failed"
- This is a safety feature to prevent unexpected transfers

---

## Architecture and Contract Details

### Smart Contract Flow

```clarity
;; sbtc-withdrawal contract

(define-public (initiate-withdrawal-request 
  (amount uint)
  (recipient (tuple (version (buff 1)) (hashbytes (buff 32))))
  (max-fee uint))
  
  ;; 1. Lock amount + max-fee from sender
  (try! (stx-transfer? (+ amount max-fee) tx-sender CONTRACT))
  
  ;; 2. Emit withdrawal event
  (print {
    event: "withdrawal-request",
    amount: amount,
    recipient: recipient,
    max-fee: max-fee,
    sender: tx-sender
  })
  
  ;; 3. Return success
  (ok true)
)

;; Later: Signers call this after sending BTC
(define-public (accept-withdrawal-request
  (request-id uint)
  (actual-fee uint)
  (bitcoin-txid (buff 32)))
  
  ;; Return excess fee if actual-fee < max-fee
  (let ((excess-fee (- max-fee actual-fee)))
    (if (> excess-fee u0)
      (try! (stx-transfer? excess-fee CONTRACT sender))
      true
    )
  )
  
  ;; Mark as complete
  (ok true)
)
```

### Bitcoin Address Types Supported

| Type | Prefix | Clarity Version | Hash Length | Example |
|------|--------|----------------|-------------|---------|
| P2PKH | `1` | `0x00` | 20 bytes | `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` |
| P2SH | `3` | `0x01` | 20 bytes | `3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy` |
| P2WPKH | `bc1q` | `0x04` | 20 bytes | `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4` |
| P2WSH | `bc1q` | `0x05` | 32 bytes | `bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3` |
| P2TR | `bc1p` | `0x06` | 32 bytes | `bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr` |

### Fee Structure

```
Total Locked = amount + maxFee

Example:
  amount: 100,000 sats
  maxFee: 3,000 sats
  Total Locked: 103,000 sats

After completion:
  User receives: 100,000 sats BTC
  Bitcoin miner fee: 2,500 sats (actual)
  Excess returned: 500 sats sBTC
```

**Fee Recommendations:**
- **Low priority:** 1,000 - 2,000 sats
- **Medium priority:** 3,000 - 5,000 sats
- **High priority:** 10,000+ sats

---

## Testing Scenarios

### Test Case 1: Successful Withdrawal

**Prerequisites:**
- Connected wallet with Stacks address
- sBTC balance ≥ 110,000 sats (100k + fees)

**Steps:**
1. Enter valid Bitcoin address: `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`
2. Enter amount: `100000`
3. Enter max fee: `3000`
4. Click "Iniciar Retirada"
5. Approve transaction in wallet
6. Wait for Stacks confirmation (~10 seconds)
7. Observe status change to "pending"
8. Wait for Bitcoin block finality (~60 minutes)
9. Observe status change to "accepted"
10. Wait for Bitcoin confirmation (~10 minutes)
11. Observe status change to "confirmed"
12. Verify BTC received in Bitcoin wallet

**Expected Result:**
- ✅ Transaction completes successfully
- ✅ User receives 100,000 sats BTC
- ✅ Excess fee (if any) returned as sBTC

### Test Case 2: Invalid Bitcoin Address

**Steps:**
1. Enter invalid Bitcoin address: `invalid_address_123`
2. Attempt to submit form

**Expected Result:**
- ❌ Error message: "Endereço Bitcoin inválido"
- ❌ Submit button disabled
- ❌ No transaction initiated

### Test Case 3: Insufficient Balance

**Prerequisites:**
- sBTC balance < requested amount + fee

**Steps:**
1. Enter amount: `1000000` (more than balance)
2. Click "Iniciar Retirada"
3. Approve in wallet

**Expected Result:**
- ❌ Post condition fails
- ❌ Error: "Saldo insuficiente de sBTC"
- ❌ No sBTC locked

### Test Case 4: Amount Below Minimum

**Steps:**
1. Enter amount: `5000` (below 10,000 minimum)
2. Click "Iniciar Retirada"

**Expected Result:**
- ❌ Error: "Quantidade mínima é 10,000 satoshis"
- ❌ No transaction initiated

### Test Case 5: User Cancels Wallet Prompt

**Steps:**
1. Fill form correctly
2. Click "Iniciar Retirada"
3. Cancel wallet popup

**Expected Result:**
- ⚠️ Error: User cancelled transaction
- ❌ No sBTC locked
- ✅ Form remains filled for retry

### Test Case 6: Network Interruption During Polling

**Steps:**
1. Initiate successful withdrawal
2. Disconnect internet during "pending" status
3. Reconnect after 5 minutes

**Expected Result:**
- ⚠️ Polling errors displayed
- ✅ Manual "Verificar Status" button still works
- ✅ Transaction continues in background
- ✅ Status updates when reconnected

### Test Case 7: Fee Spike Scenario

**Prerequisites:**
- Set very low maxFee: `1000` sats
- Initiate during high Bitcoin fee period

**Steps:**
1. Initiate withdrawal with low maxFee
2. Wait in "accepted" status for extended period

**Expected Result:**
- ⚠️ Status remains "accepted" for hours/days
- ⚠️ Warning message after 24 hours
- ⚠️ Bitcoin transaction may never confirm
- ✅ User can initiate new withdrawal with higher fee

---

## Component Lifecycle

### Initialization

```typescript
ngOnInit() {
  // Load Stacks address from wallet
  const address = this.walletManagerService.getSTXAddress();
  if (address) {
    this.stacksAddress.set(address);
  }
}
```

### Cleanup

```typescript
ngOnDestroy() {
  // Clear polling interval to prevent memory leaks
  if (this.statusPollingInterval) {
    clearInterval(this.statusPollingInterval);
  }
}
```

### Reset Function

```typescript
reset() {
  // Clear polling
  if (this.statusPollingInterval) {
    clearInterval(this.statusPollingInterval);
    this.statusPollingInterval = null;
  }

  // Reset state
  this.currentStep.set('form');
  this.errorMessage.set('');
  this.stacksTxId.set('');
  this.btcTxId.set('');
  this.withdrawalStatus.set('');
  this.btcAddress = '';
  this.btcAddressValid.set(null);
  this.decodedBtcAddress = null;
}
```

---

## API Reference

### Emily API Endpoints

**Get Withdrawals by Sender:**
```
GET https://sbtc-emily.com/withdrawal/sender/<stacks-address>
GET https://emily-testnet.sbtc.tech/withdrawal/sender/<stacks-address>
```

**Response Schema:**
```typescript
interface WithdrawalResponse {
  requestId: string;
  status: 'pending' | 'accepted' | 'confirmed';
  txid?: string;  // Bitcoin transaction ID (only when confirmed)
  amount: number;
  stacksBlockHeight?: number;
  lastUpdateHeight?: number;
  recipient?: string;
  sender?: string;
}
```

---

## Security Considerations

### 1. Post Conditions

Post conditions are **critical security features** that ensure:
- Exact amount transferred (no more, no less)
- Correct token contract used
- Transaction fails safely if conditions not met

```typescript
const postCond = Pc.principal(this.stacksAddress())
  .willSendEq(this.amount + this.maxFee)  // Exact match required
  .ft(this.SBTC_TOKEN_CONTRACT, 'sbtc-token');
```

### 2. Address Validation

Always validate Bitcoin addresses before constructing transactions:
```typescript
const addressInfo = getAddressInfo(address);
// Throws error if invalid
```

### 3. Network Awareness

Ensure contract addresses match the network:
```typescript
environment.network === 'mainnet' ? MAINNET_CONTRACT : TESTNET_CONTRACT
```

### 4. Amount Bounds

Enforce minimum amounts to prevent dust:
```typescript
if (this.amount < 10000) {
  throw new Error('Minimum 10,000 satoshis');
}
```

---

## Troubleshooting

### Issue: Transaction Stuck in "Pending"

**Possible Causes:**
1. Stacks transaction not yet confirmed
2. Emily API delayed/offline
3. Bitcoin blockchain reorg

**Solutions:**
- Wait 5-10 minutes for Stacks confirmation
- Check Stacks explorer: `https://explorer.hiro.so/txid/<txid>`
- Manually query Emily API
- Use manual "Verificar Status" button

### Issue: Transaction Stuck in "Accepted"

**Possible Causes:**
1. Waiting for Bitcoin block finality (normal)
2. Fee too low for current mempool
3. Signers temporarily offline

**Solutions:**
- Wait 60-90 minutes (normal processing time)
- Check Bitcoin fees: `https://mempool.space`
- If > 24 hours, consider new withdrawal with higher fee

### Issue: Emily API Returns Empty Array

**Possible Causes:**
1. Wrong network (mainnet vs testnet)
2. Incorrect Stacks address
3. No withdrawals yet initiated

**Solutions:**
- Verify `environment.network` setting
- Check `stacksAddress` value
- Verify transaction succeeded on Stacks

### Issue: "Post Condition Failed" Error

**Possible Causes:**
1. Insufficient sBTC balance
2. Incorrect contract address
3. Token contract mismatch

**Solutions:**
- Check sBTC balance ≥ (amount + maxFee)
- Verify `SBTC_TOKEN_CONTRACT` address
- Ensure wallet on correct network

---

## Future Enhancements

### Planned Features

1. **Real-time Fee Estimation**
   - Query mempool for current Bitcoin fees
   - Suggest optimal `maxFee` based on desired confirmation time

2. **Reclaim Functionality**
   - Allow users to reclaim locked sBTC if transaction fails
   - Implement timeout logic (after N blocks)

3. **Batch Withdrawals**
   - Support multiple withdrawals in single Bitcoin transaction
   - Reduce per-user fees

4. **Push Notifications**
   - WebSocket connection to Emily API
   - Instant status updates without polling

5. **Transaction History**
   - Store past withdrawals in local storage
   - Display history with status

6. **Advanced Fee Controls**
   - "Slow/Medium/Fast" presets
   - Dynamic fee calculation based on mempool

---

## References

- [sBTC Documentation](https://docs.stacks.co/build/misc.-guides/sbtc)
- [Stacks Connect](https://github.com/hirosystems/connect)
- [Emily API](https://github.com/stacks-network/sbtc)
- [Bitcoin Address Validation](https://github.com/ruigomeseu/bitcoin-address-validation)
- [BitcoinJS](https://github.com/bitcoinjs/bitcoinjs-lib)
