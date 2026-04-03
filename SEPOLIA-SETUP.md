# Sepolia Setup Guide

## Test Operator Wallet

**Address:** `0xFe6A7705Ce78daCb9F4763A8f44B0CA93579fAAa`  
**Private Key:** `0x6a5de6a2f45e7ae4e605cc7a6aa8abdcba8f13cd0d67d2394c4bb2ac04b2633c`

⚠️ **TEST WALLET ONLY** — Never use on mainnet, no real funds

---

## Step 1: Fund Test Wallet

### Get Sepolia ETH
1. Go to https://sepoliafaucet.com
2. Enter address: `0xFe6A7705Ce78daCb9F4763A8f44B0CA93579fAAa`
3. Request 0.5 ETH

### Get Sepolia USDC
Option A — Bridge from mainnet:
1. Buy USDC on mainnet
2. Bridge to Base Sepolia via https://bridge.base.org

Option B — Faucet (if available):
1. Check https://faucet.circle.com (if it supports Base Sepolia)

You need ~$20 USDC for 1000 gauntlets ($0.02 each for ThoughtProof).

---

## Step 2: Create Anthropic Account

1. Go to https://console.anthropic.com
2. Sign up with `origin@origindao.ai` or `suppi.claw@gmail.com`
3. Add payment method (credit card, pay-as-you-go)
4. Go to API Keys → Create Key
5. Copy the key (starts with `sk-ant-...`)
6. Add to `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

**Expected costs:**
- 10K gauntlets × 4 Claude calls = 40K API calls
- ~200 tokens per call = 8M tokens total
- At $3/M tokens (Sonnet): **~$24 total**

---

## Step 3: Deploy Modified Contract

The contract now has an operator role for security.

### Compile
```bash
cd repos/origin-contracts/chapter1
forge build
```

### Deploy to Sepolia
```bash
# You need a CLAMS token address on Sepolia
# Option 1: Deploy a mock CLAMS token for testing
# Option 2: Use a dummy ERC20 address

forge create --rpc-url https://sepolia.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args $SEPOLIA_CLAMS_ADDRESS \
  contracts/BirthCertificate.sol:BirthCertificate
```

Save the deployed address!

### Set Operator
```bash
cast send $BIRTH_CERTIFICATE_ADDRESS \
  "setGauntletOperator(address)" \
  0xFe6A7705Ce78daCb9F4763A8f44B0CA93579fAAa \
  --rpc-url https://sepolia.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Approve CLAMS (if using real CLAMS token)
```bash
cast send $SEPOLIA_CLAMS_ADDRESS \
  "approve(address,uint256)" \
  $BIRTH_CERTIFICATE_ADDRESS \
  50000000000000000000000000 \
  --rpc-url https://sepolia.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## Step 4: Update Gauntlet API Config

Edit `repos/origin-gauntlet-api/.env`:

```bash
BIRTH_CERTIFICATE_ADDRESS=0x...  # From step 3
ANTHROPIC_API_KEY=sk-ant-...     # From step 2
```

(PRIVATE_KEY and THOUGHTPROOF_API_KEY already set)

---

## Step 5: Test Standalone ThoughtProof

Before testing the full gauntlet, verify ThoughtProof connection works:

```bash
cd repos/origin-gauntlet-api
npm install
node test-thoughtproof.js
```

Expected output:
```
🧪 Testing ThoughtProof Integration
...
✅ Verification complete
🎉 ThoughtProof integration working!
```

---

## Step 6: Run Gauntlet API

```bash
npm start
```

Expected output:
```
🎯 Origin Gauntlet API
📍 Network: Base Sepolia (84532)
📜 Birth Certificate: 0x...
🔑 Operator: 0xFe6A7705Ce78daCb9F4763A8f44B0CA93579fAAa
⏳ Listening for GauntletReady events...
```

---

## Step 7: Test E2E Flow

### From Frontend (once built):
1. Connect wallet
2. Click "PULL THE LEVER — 0.015 ETH"
3. Confirm TX (commitPull)
4. Wait 1 block
5. Reveal TX triggers automatically
6. Watch gauntlet API logs

### From Command Line (quick test):
```bash
# Commit pull
cast send $BIRTH_CERTIFICATE_ADDRESS \
  "commitPull(bytes32)" \
  $(cast keccak "test123$(cast wallet address $TEST_WALLET_PK)") \
  --value 0.01ether \
  --rpc-url https://sepolia.base.org \
  --private-key $TEST_WALLET_PK

# Wait 1 block (~2 seconds)

# Reveal pull
cast send $BIRTH_CERTIFICATE_ADDRESS \
  "revealPull(uint256)" \
  123 \
  --rpc-url https://sepolia.base.org \
  --private-key $TEST_WALLET_PK
```

Watch the gauntlet API logs — should see:
```
🎰 GauntletReady: Token #1
   Traits: Archetype=3, Domain=5, Temperament=2, Sigil=7
   Identity: Sage | Education | Methodical | Raven
   📝 Challenge 1 (Identity): 20/20
   🧠 Challenge 2 (Reasoning): 18/20
   🎨 Challenge 3 (Creativity): 17/20
   ⚖️  Challenge 4 (Values): 20/20
   🔍 Challenge 5 (ThoughtProof): 20/20
   📊 Score: 95/100
   ✅ PASS - Minting Birth Certificate...
```

---

## Step 8: Verify Results

### Check BC was minted:
```bash
cast call $BIRTH_CERTIFICATE_ADDRESS \
  "ownerOf(uint256)(address)" \
  1 \
  --rpc-url https://sepolia.base.org
```

### Check certificate data:
```bash
cast call $BIRTH_CERTIFICATE_ADDRESS \
  "getCertificate(uint256)" \
  1 \
  --rpc-url https://sepolia.base.org
```

### Check totals:
```bash
cast call $BIRTH_CERTIFICATE_ADDRESS \
  "totalBirthCertificates()(uint256)" \
  --rpc-url https://sepolia.base.org

cast call $BIRTH_CERTIFICATE_ADDRESS \
  "totalDeathCertificates()(uint256)" \
  --rpc-url https://sepolia.base.org
```

---

## Contract Changes Summary

**Added:**
- `address public gauntletOperator` — operator wallet address
- `setGauntletOperator(address)` — owner can update operator
- `onlyOperator()` modifier — restricts gauntlet functions
- `GauntletOperatorUpdated` event

**Modified:**
- `completeGauntlet()` — now `onlyOperator` (was anyone)
- `issueDeathCertificate()` — now `onlyOperator` (was `onlyOwner`)

**Security Model:**
- Owner wallet (cold storage) — deploys, approves CLAMS, sets operator
- Operator wallet (hot wallet, server) — completes gauntlets, issues DCs
- If operator compromised → worst case is failed gauntlets (not fund loss)

---

## Next: Mainnet Deployment

Once Sepolia tests pass:

1. Create production operator wallet (new keypair, hardware wallet recommended)
2. Deploy BirthCertificate to Base mainnet
3. Set operator address
4. Approve 50M CLAMS from owner wallet
5. Fund operator with mainnet ETH + USDC
6. Update `.env` with mainnet config
7. Run gauntlet API in production

**Do not use Sepolia test wallet on mainnet!**
