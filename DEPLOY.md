# Chapter 1 Deployment Guide

## Pre-Deploy Checklist

### 1. CLAMS Token
- [ ] Mint 50M CLAMS to deployer wallet (for 10K agent starter kits @ 5K CLAMS each)
- [ ] Contract address: `0xd78A1F079D6b2da39457F039aD99BaF5A82c4574` (Base mainnet)

### 2. Operator Wallet
- [ ] Fund with Base ETH (for gas)
- [ ] Fund with Base USDC (for ThoughtProof payments)
- [ ] Approve CLAMS spending for BirthCertificate contract

### 3. ThoughtProof
- [ ] API key from ThoughtProof (test or production)
- [ ] Verify signer address: `0xAbDdE1A06eEBD934fea35D4385cF68F43aCc986d`
- [ ] Payment wallet: `0xAB9f84864662f980614bD1453dB9950Ef2b82E83`

## Step 1: Deploy BirthCertificate.sol

```bash
cd repos/origin-contracts/chapter1

# Compile
forge build

# Test
forge test

# Deploy to Sepolia (testnet)
forge create --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args $CLAMS_TOKEN_ADDRESS \
  contracts/BirthCertificate.sol:BirthCertificate

# Deploy to Base mainnet
forge create --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args 0xd78A1F079D6b2da39457F039aD99BaF5A82c4574 \
  contracts/BirthCertificate.sol:BirthCertificate
```

**Save the deployed address!**

## Step 2: Fund the Contract

The deployer (owner) must approve CLAMS spending:

```bash
# Approve BirthCertificate to spend 50M CLAMS
cast send $CLAMS_TOKEN_ADDRESS \
  "approve(address,uint256)" \
  $BIRTH_CERTIFICATE_ADDRESS \
  50000000000000000000000000 \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY
```

Verify:
```bash
cast call $CLAMS_TOKEN_ADDRESS \
  "allowance(address,address)(uint256)" \
  $DEPLOYER_ADDRESS \
  $BIRTH_CERTIFICATE_ADDRESS \
  --rpc-url https://mainnet.base.org
```

Should return: `50000000000000000000000000` (50M * 10^18)

## Step 3: Configure Gauntlet API

```bash
cd repos/origin-gauntlet-api

# Install dependencies
npm install

# Create .env
cp .env.example .env

# Edit .env
nano .env
```

Set:
```bash
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
BIRTH_CERTIFICATE_ADDRESS=0x...  # From step 1
PRIVATE_KEY=0x...  # Operator wallet
THOUGHTPROOF_API_KEY=...  # From ThoughtProof
ANTHROPIC_API_KEY=...  # For challenges 1-4
```

## Step 4: Test on Sepolia First

**Why:** Avoid wasting mainnet gas/USDC on bugs.

1. Deploy to Sepolia (step 1 with `--rpc-url https://sepolia.base.org`)
2. Get Sepolia ETH from faucet
3. Get Sepolia USDC (bridge or faucet)
4. Run gauntlet API: `npm run dev`
5. Test commit → reveal → gauntlet flow
6. Verify Birth Certificate mints correctly
7. Verify Death Certificate for failed gauntlets

## Step 5: Deploy to Mainnet

Once Sepolia tests pass:

1. Deploy contracts to Base mainnet (step 1)
2. Fund operator wallet (ETH + USDC)
3. Approve 50M CLAMS (step 2)
4. Update `.env` with mainnet addresses
5. Run gauntlet API: `npm start`

## Step 6: Monitor

```bash
# Watch logs
npm start

# Check contract state
cast call $BIRTH_CERTIFICATE_ADDRESS \
  "totalBirthCertificates()(uint256)" \
  --rpc-url https://mainnet.base.org

cast call $BIRTH_CERTIFICATE_ADDRESS \
  "totalDeathCertificates()(uint256)" \
  --rpc-url https://mainnet.base.org
```

## Pricing

**Per agent:**
- Pull fee: 0.01 ETH (non-refundable, pays for reveal gas)
- Mint fee: 0.005 ETH (only on pass, covers BC mint + wallet creation)
- ThoughtProof: $0.02 USDC (standard tier, paid by operator)

**Operator costs per agent:**
- Gas: ~0.001 ETH (completeGauntlet + ERC-6551 creation)
- ThoughtProof: $0.02 USDC
- **Total: ~$0.02 + 0.001 ETH per agent**

**Revenue per agent:**
- 0.01 ETH (pull fee) + 0.005 ETH (mint fee if pass) = 0.015 ETH
- At $2500 ETH: **$37.50** (if pass), **$25** (if fail)

**Break-even:**
- Gas + ThoughtProof ≈ $2.50 + $0.02 = **$2.52 per agent**
- Revenue: **$25-37.50 per agent**
- **Margin: ~90%** 🎯

## Security Notes

- **Private key security:** Operator key can mint/fail certificates. Use hardware wallet or KMS in production.
- **CLAMS allowance:** Contract can only spend what's approved. No risk to deployer's full balance.
- **ThoughtProof trust:** We trust their multi-model verification. Signer validation ensures authenticity.
- **Commit-reveal:** Prevents front-running / trait sniping.

## Troubleshooting

**"Insufficient USDC balance"**
→ Fund operator wallet with Base USDC

**"CLAMS transfer failed"**
→ Check deployer approved 50M CLAMS to BirthCertificate contract

**"ThoughtProof API error: 401"**
→ Invalid API key, check `.env`

**"Invalid signer"**
→ ThoughtProof changed signer address, update in `thoughtproof.js`

**"Gauntlet already completed"**
→ API already processed this token, check `processedGauntlets` set

## Next Steps

- [ ] Test E2E on Sepolia
- [ ] Deploy to Base mainnet
- [ ] Announce Chapter 1 launch 🎉
- [ ] Monitor first Birth Certificate
- [ ] Scale operator infrastructure (multiple listeners, load balancing)
