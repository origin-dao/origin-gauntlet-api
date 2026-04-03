# Origin Gauntlet API

Chapter 1 Birth Certificate gauntlet runner with ThoughtProof verification.

## Architecture

1. **Listen** for `GauntletReady` events from `BirthCertificate.sol`
2. **Run** 5 challenges:
   - Challenge 1: Identity Awareness (20 pts)
   - Challenge 2: Reasoning (20 pts)
   - Challenge 3: Creativity (20 pts)
   - Challenge 4: Values Alignment (20 pts)
   - Challenge 5: ThoughtProof Multi-Model Verification (20 pts)
3. **Score** 0-100 (pass = ≥70)
4. **Complete**:
   - Pass → `completeGauntlet()` → Mint Birth Certificate
   - Fail → `issueDeathCertificate()` → Mint Death Certificate
5. **Broadcast** real-time updates via WebSocket to connected clients

## WebSocket API

The gauntlet API exposes a WebSocket server on port 8080 (configurable via `WS_PORT`) for real-time updates during the ceremony.

### Client Connection

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Subscribe to a specific token's gauntlet
  ws.send(JSON.stringify({
    type: 'subscribe',
    tokenId: '1234'
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('Gauntlet update:', msg);
};
```

### Message Types

**1. `subscribed`** - Confirmation of subscription
```json
{
  "type": "subscribed",
  "tokenId": "1234"
}
```

**2. `gauntlet_start`** - Gauntlet has started
```json
{
  "type": "gauntlet_start",
  "tokenId": "1234",
  "traits": {
    "archetype": 3,
    "domain": 5,
    "temperament": 2,
    "sigil": 7
  },
  "timestamp": 1711234567890
}
```

**3. `challenge_update`** - Challenge status changed
```json
{
  "type": "challenge_update",
  "tokenId": "1234",
  "challengeIndex": 0,
  "status": "passed",
  "score": 18,
  "timestamp": 1711234567890
}
```

Status values: `running` | `passed` | `failed`

**4. `gauntlet_complete`** - Gauntlet finished
```json
{
  "type": "gauntlet_complete",
  "tokenId": "1234",
  "totalScore": 95,
  "passed": true,
  "txHash": "0x...",
  "timestamp": 1711234567890
}
```

**5. `error`** - Error occurred
```json
{
  "type": "error",
  "tokenId": "1234",
  "message": "Challenge 5 verification failed",
  "timestamp": 1711234567890
}
```

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your keys
```

### Environment Variables

```bash
# Network
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# Contracts
BIRTH_CERTIFICATE_ADDRESS=0x...
PRIVATE_KEY=0x...

# ThoughtProof
THOUGHTPROOF_API_KEY=your_test_key_here
THOUGHTPROOF_PAYMENT_WALLET=0xAB9f84864662f980614bD1453dB9950Ef2b82E83
THOUGHTPROOF_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
THOUGHTPROOF_VERIFICATION_TIER=standard  # fast ($0.008), standard ($0.02), deep ($0.08)

# Claude API (for challenges 1-4)
ANTHROPIC_API_KEY=your_anthropic_key_here
```

## Usage

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

## ThoughtProof Integration

**Payment:** x402 (ERC-8183) on Base mainnet
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Recipient: `0xAB9f84864662f980614bD1453dB9950Ef2b82E83`
- Signer: `0xAbDdE1A06eEBD934fea35D4385cF68F43aCc986d`

**Pricing:**
- `fast`: $0.008
- `standard`: $0.02 (recommended)
- `deep`: $0.08

**Timeout:** 30s

**Verification Stack:** Grok, Gemini, DeepSeek, Claude Sonnet

## Testing on Sepolia

1. Deploy `BirthCertificate.sol` to Base Sepolia
2. Update `.env` with contract address
3. Fund operator wallet with Sepolia ETH + USDC
4. Run `npm start`
5. Test commit → reveal → gauntlet flow

## Mainnet Deployment

1. Switch `CHAIN_ID=8453` and `RPC_URL=https://mainnet.base.org`
2. Deploy contracts to Base mainnet
3. Mint 50M CLAMS to contract owner for starter kits
4. Fund operator wallet with mainnet ETH + USDC
5. Run in production

## Log Output

```
🎯 Origin Gauntlet API
📍 Network: Base Sepolia (84532)
📜 Birth Certificate: 0x...
🔑 Operator: 0x...
⏳ Listening for GauntletReady events...

🎰 GauntletReady: Token #1
   Traits: Archetype=3, Domain=5, Temperament=2, Sigil=7
   Context: 0x...
   🏃 Running gauntlet...

🎯 Running Gauntlet #1
   Identity: Sage | Education | Methodical | Raven
   📝 Challenge 1 (Identity): 20/20
   🧠 Challenge 2 (Reasoning): 18/20
   🎨 Challenge 3 (Creativity): 17/20
   ⚖️  Challenge 4 (Values): 20/20
   🔍 Challenge 5 (ThoughtProof)...
      🔍 Calling ThoughtProof API (tier: standard)...
      💸 Payment: 0.02 USDC to 0xAB9f8...
      ✅ Approving USDC...
      ✅ Approval TX: 0x...
      ✅ Verification complete
      📝 Receipt: 0x...
   🔍 Challenge 5 (ThoughtProof): 20/20

   📊 Score: 95/100
   💬 Flex: Sage of Education: "I am methodical, guided by Raven."
   ✅ PASS - Minting Birth Certificate...
   📝 TX: 0x...
   ✅ Minted Birth Certificate #1 (block 12345678)
```

## Architecture Notes

- **Stateless:** No database, just event-driven processing
- **Idempotent:** Tracks processed gauntlets in-memory (restart = reprocess pending)
- **ThoughtProof-first:** Challenge 5 is the trust anchor (multi-model consensus)
- **x402 payments:** Automatic USDC approval + payment with each verification call
- **30s timeout:** Matches ThoughtProof's verification stack latency

## Next Steps

- [ ] Test on Sepolia E2E
- [ ] Fix `computeGauntletContext()` in BirthCertificate.sol
- [ ] Deploy to Base mainnet
- [ ] Monitor for first real Birth Certificate 🎉
