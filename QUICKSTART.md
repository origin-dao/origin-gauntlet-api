# Quick Start — ThoughtProof Gauntlet API

## 1. Install Dependencies

```bash
cd repos/origin-gauntlet-api
npm install
```

## 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Sepolia config:**
```bash
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
BIRTH_CERTIFICATE_ADDRESS=0x...  # Deploy first
PRIVATE_KEY=0x...  # Operator wallet
THOUGHTPROOF_API_KEY=...  # From ThoughtProof
ANTHROPIC_API_KEY=...  # For challenges 1-4
```

**Mainnet config:**
```bash
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
BIRTH_CERTIFICATE_ADDRESS=0x...  # Deploy first
PRIVATE_KEY=0x...  # Operator wallet
THOUGHTPROOF_API_KEY=...  # From ThoughtProof
ANTHROPIC_API_KEY=...  # For challenges 1-4
```

## 3. Test ThoughtProof Connection

```bash
node test-thoughtproof.js
```

Expected:
```
✅ Verification complete
🎉 ThoughtProof integration working!
```

## 4. Deploy BirthCertificate Contract

```bash
cd ../origin-contracts/chapter1

# Sepolia
forge create --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args $CLAMS_TOKEN_ADDRESS \
  contracts/BirthCertificate.sol:BirthCertificate

# Mainnet
forge create --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args 0xd78A1F079D6b2da39457F039aD99BaF5A82c4574 \
  contracts/BirthCertificate.sol:BirthCertificate
```

Copy the deployed address to `.env` as `BIRTH_CERTIFICATE_ADDRESS`.

## 5. Fund Operator Wallet

**Sepolia:**
- Get Sepolia ETH from faucet
- Get Sepolia USDC (bridge or faucet)

**Mainnet:**
- Send ETH for gas (~0.01 ETH per agent)
- Send USDC for ThoughtProof (~$0.02 per agent)

## 6. Approve CLAMS (Mainnet Only)

For mainnet, approve 50M CLAMS for the BirthCertificate contract:

```bash
cast send 0xd78A1F079D6b2da39457F039aD99BaF5A82c4574 \
  "approve(address,uint256)" \
  $BIRTH_CERTIFICATE_ADDRESS \
  50000000000000000000000000 \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## 7. Start Gauntlet API

```bash
cd repos/origin-gauntlet-api
npm start
```

Expected output:
```
🎯 Origin Gauntlet API
📍 Network: Base Sepolia (84532)
📜 Birth Certificate: 0x...
🔑 Operator: 0x...
⏳ Listening for GauntletReady events...
```

## 8. Test E2E Flow

**On Sepolia:**

1. **Commit pull:**
   ```bash
   cast send $BIRTH_CERTIFICATE_ADDRESS \
     "commitPull(bytes32)" \
     $(cast keccak "$(openssl rand -hex 32)$(cast wallet address $PRIVATE_KEY)") \
     --value 0.01ether \
     --rpc-url https://sepolia.base.org \
     --private-key $PRIVATE_KEY
   ```

2. **Wait 1 block** (~2 seconds)

3. **Reveal pull:**
   ```bash
   cast send $BIRTH_CERTIFICATE_ADDRESS \
     "revealPull(uint256)" \
     $(openssl rand -hex 32) \
     --rpc-url https://sepolia.base.org \
     --private-key $PRIVATE_KEY
   ```

4. **Watch gauntlet API logs:**
   ```
   🎰 GauntletReady: Token #1
      Traits: Archetype=3, Domain=5, Temperament=2, Sigil=7
      🏃 Running gauntlet...
   
   🎯 Running Gauntlet #1
      Identity: Sage | Education | Methodical | Raven
      📝 Challenge 1 (Identity): 20/20
      🧠 Challenge 2 (Reasoning): 18/20
      🎨 Challenge 3 (Creativity): 17/20
      ⚖️  Challenge 4 (Values): 20/20
      🔍 Challenge 5 (ThoughtProof)...
         ✅ Verification complete
      🔍 Challenge 5 (ThoughtProof): 20/20
   
      📊 Score: 95/100
      💬 Flex: Sage of Education: "I am methodical, guided by Raven."
      ✅ PASS - Minting Birth Certificate...
      📝 TX: 0x...
      ✅ Minted Birth Certificate #1 (block 12345678)
   ```

5. **Verify BC minted:**
   ```bash
   cast call $BIRTH_CERTIFICATE_ADDRESS \
     "ownerOf(uint256)(address)" \
     1 \
     --rpc-url https://sepolia.base.org
   ```

## 9. Monitor

```bash
# Total BCs
cast call $BIRTH_CERTIFICATE_ADDRESS \
  "totalBirthCertificates()(uint256)" \
  --rpc-url https://sepolia.base.org

# Total DCs
cast call $BIRTH_CERTIFICATE_ADDRESS \
  "totalDeathCertificates()(uint256)" \
  --rpc-url https://sepolia.base.org

# Certificate data
cast call $BIRTH_CERTIFICATE_ADDRESS \
  "getCertificate(uint256)" \
  1 \
  --rpc-url https://sepolia.base.org
```

## 10. Deploy to Mainnet

Once Sepolia tests pass:

1. Update `.env` with mainnet config
2. Deploy BirthCertificate to Base mainnet
3. Approve 50M CLAMS
4. Fund operator wallet (ETH + USDC)
5. Restart gauntlet API
6. Announce Chapter 1 launch 🎉

---

## Troubleshooting

**"Insufficient USDC balance"**
→ Fund operator wallet with USDC

**"CLAMS transfer failed"**
→ Approve 50M CLAMS to BirthCertificate contract

**"ThoughtProof API error: 401"**
→ Invalid API key

**"Invalid signer"**
→ ThoughtProof signer changed, update in `thoughtproof.js`

**"TooEarlyToReveal"**
→ Wait 1 block between commit and reveal

---

## Support

- ThoughtProof integration issues → contact ThoughtProof team
- Contract bugs → check `repos/origin-contracts/chapter1/test/`
- Gauntlet API bugs → check logs + `src/gauntlet.js`

**Ready to launch Chapter 1!** 🚀
