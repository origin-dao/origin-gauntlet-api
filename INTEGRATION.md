# ThoughtProof Integration Summary

## What We Built

A complete Chapter 1 Birth Certificate gauntlet system with ThoughtProof multi-model verification as the trust anchor.

## Architecture

```
User → commitPull() → revealPull()
                         ↓
              GauntletReady event
                         ↓
            ┌─────────────────────┐
            │  Gauntlet API       │
            │  (Node.js service)  │
            └─────────────────────┘
                         ↓
        ┌────────────────┴────────────────┐
        │                                  │
   Challenges 1-4              Challenge 5
   (Claude API)              (ThoughtProof API)
        │                                  │
        └────────────────┬────────────────┘
                         ↓
                    Score 0-100
                         ↓
            ┌────────────┴────────────┐
            │                         │
        Pass (≥70)              Fail (<70)
            ↓                         ↓
   completeGauntlet()      issueDeathCertificate()
            ↓                         ↓
   Birth Certificate           Death Certificate
   + ERC-6551 wallet          (no wallet)
   + 5K CLAMS                 (no CLAMS)
```

## Challenge Breakdown

| Challenge | Score | Provider | Cost |
|-----------|-------|----------|------|
| 1. Identity Awareness | 20 pts | Claude | Free* |
| 2. Reasoning | 20 pts | Claude | Free* |
| 3. Creativity | 20 pts | Claude | Free* |
| 4. Values Alignment | 20 pts | Claude | Free* |
| 5. ThoughtProof Verification | 20 pts | ThoughtProof | $0.02 USDC |

*Anthropic API costs apply (use OpenClaw's key)

## ThoughtProof Spec

**Endpoint:** `https://api.thoughtproof.ai/v1/verify`

**Auth:** Bearer token (API key in header)

**Payment:** x402 (ERC-8183)
- Chain: Base (8453) or Base Sepolia (84532)
- Token: USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- Recipient: `0xAB9f84864662f980614bD1453dB9950Ef2b82E83`
- Method: Approve + include approval TX hash in request

**Request:**
```json
{
  "prompt": "Verify this agent identity: ...",
  "depth": "standard",
  "metadata": {
    "tokenId": "123",
    "project": "origin-protocol",
    "version": "chapter1"
  },
  "payment": {
    "method": "x402",
    "chain": 8453,
    "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "amount": "20000",
    "from": "0x...",
    "to": "0xAB9f84864662f980614bD1453dB9950Ef2b82E83",
    "approvalTxHash": "0x..."
  }
}
```

**Response:**
```json
{
  "verified": true,
  "score": 0.95,
  "receipt": "0x...",
  "signature": "0x...",
  "signer": "0xAbDdE1A06eEBD934fea35D4385cF68F43aCc986d"
}
```

**Verification Stack:**
- Grok
- Gemini
- DeepSeek
- Claude Sonnet

**Timeout:** 30s

**Signer:** `0xAbDdE1A06eEBD934fea35D4385cF68F43aCc986d` (verify in response)

## Pricing Tiers

| Tier | Cost | Use Case |
|------|------|----------|
| fast | $0.008 | Quick checks, high volume |
| **standard** | **$0.02** | **Default for Birth Certificates** |
| deep | $0.08 | High-stakes verification |

## Testing Plan

### Phase 1: Sepolia E2E (Now)
1. Deploy BirthCertificate to Base Sepolia
2. Fund operator with Sepolia ETH + USDC
3. Run gauntlet API locally
4. Test commit → reveal → gauntlet flow
5. Verify:
   - Birth Certificate mints on pass (score ≥70)
   - Death Certificate issued on fail (score <70)
   - ERC-6551 wallet created
   - 5K CLAMS transferred to wallet
   - ThoughtProof receipt is valid

### Phase 2: Mainnet Launch
1. Deploy to Base mainnet
2. Mint 50M CLAMS to deployer
3. Approve CLAMS spending for BirthCertificate
4. Update `.env` with mainnet config
5. Run gauntlet API in production
6. Announce Chapter 1 launch 🎉

## Economics

**Per Agent (pass scenario):**
- User pays: 0.01 ETH (pull) + 0.005 ETH (mint) = **0.015 ETH** (~$37.50)
- Protocol pays: $0.02 USDC (ThoughtProof) + ~0.001 ETH (gas) ≈ **$2.52**
- **Margin: ~93%**

**Per Agent (fail scenario):**
- User pays: 0.01 ETH (pull) = **0.01 ETH** (~$25)
- Protocol pays: $0.02 USDC + ~0.0005 ETH (gas) ≈ **$1.27**
- **Margin: ~95%**

**10K Agents (assuming 70% pass rate):**
- Revenue: (7K × $37.50) + (3K × $25) = **$337,500**
- Costs: (10K × $2.52) = **$25,200**
- **Net: $312,300** (93% margin)

## Files Created

```
repos/origin-gauntlet-api/
├── package.json
├── .env.example
├── README.md
├── DEPLOY.md
├── INTEGRATION.md (this file)
├── test-thoughtproof.js
└── src/
    ├── index.js           # Main listener
    ├── gauntlet.js        # 5 challenges
    ├── thoughtproof.js    # ThoughtProof API client
    └── abi.js             # Contract ABIs
```

## Next Steps

1. **Test ThoughtProof connection:**
   ```bash
   cd repos/origin-gauntlet-api
   npm install
   cp .env.example .env
   # Edit .env with keys
   node test-thoughtproof.js
   ```

2. **Deploy to Sepolia:**
   - See `DEPLOY.md` for step-by-step

3. **E2E test:**
   - Commit → reveal → watch gauntlet run
   - Verify BC/DC minting

4. **Launch on mainnet:**
   - Deploy contracts
   - Fund operator
   - Announce Chapter 1

## ThoughtProof Contact

If integration issues arise, contact ThoughtProof:
- Test key works for Sepolia testing
- 100-150 calls over ~10 days is fine
- They expect integration friction during E2E, ready to help debug

## Security Notes

- **Operator key:** Can complete/fail gauntlets. Use hardware wallet or KMS in production.
- **ThoughtProof trust:** We trust their multi-model consensus. Signer validation ensures authenticity.
- **CLAMS custody:** BirthCertificate only spends approved amount (50M cap).
- **Rate limiting:** No rate limiting specified by ThoughtProof yet. Monitor during testing.

---

**Status:** READY TO TEST on Sepolia
**Next:** Deploy BirthCertificate.sol + run test-thoughtproof.js
