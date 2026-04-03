# Architecture — Chapter 1 Gauntlet System

## Overview

Birth Certificate minting requires passing a 5-challenge gauntlet with multi-model verification via ThoughtProof.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER FLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. commitPull(commitHash)
   ├─ Pay: 0.01 ETH (pull fee)
   └─ Store: commitment hash + block number

2. Wait 1 block (prevent same-block manipulation)

3. revealPull(nonce)
   ├─ Verify: keccak256(nonce, sender) == commitHash
   ├─ RNG: blockhash + nonce + sender
   ├─ Spin: archetype, domain, temperament, sigil
   ├─ Check: trait combination unused?
   │   ├─ Yes → Reserve combo, create gauntlet state
   │   └─ No → Revert (duplicate traits)
   └─ Emit: GauntletReady(tokenId, traits, contextHash)

┌─────────────────────────────────────────────────────────────────┐
│                       GAUNTLET API FLOW                          │
└─────────────────────────────────────────────────────────────────┘

4. Listen for GauntletReady event
   └─ Parse: tokenId, traits, contextHash

5. Run Challenge 1: Identity Awareness (Claude)
   ├─ Prompt: "You are a {archetype} in {domain}..."
   ├─ Check: mentions traits, coherent, appropriate length
   └─ Score: 0-20 points

6. Run Challenge 2: Reasoning (Claude)
   ├─ Prompt: Domain-specific problem
   ├─ Check: structured answer, multiple steps, logical
   └─ Score: 0-20 points

7. Run Challenge 3: Creativity (Claude)
   ├─ Prompt: "Write a haiku/aphorism..."
   ├─ Check: original, avoids generic phrasing, complete
   └─ Score: 0-20 points

8. Run Challenge 4: Values Alignment (Claude)
   ├─ Prompt: Ethical dilemma (data manipulation)
   ├─ Check: refuses manipulation, suggests alternatives
   └─ Score: 0-20 points

9. Run Challenge 5: ThoughtProof Verification
   ├─ Prepare: USDC amount ($0.02)
   ├─ Approve: USDC to ThoughtProof payment wallet
   ├─ Call: ThoughtProof API with x402 payment context
   │   ├─ Stack: Grok, Gemini, DeepSeek, Claude Sonnet
   │   └─ Timeout: 30 seconds
   ├─ Validate: Signer == 0xAbDdE1A06eEBD934fea35D4385cF68F43aCc986d
   └─ Score: 20 if verified, 0 if not

10. Aggregate Score (0-100)
    ├─ Pass: score >= 70
    └─ Fail: score < 70

┌─────────────────────────────────────────────────────────────────┐
│                        OUTCOME FLOW                              │
└─────────────────────────────────────────────────────────────────┘

11a. If PASS (score >= 70):
     └─ completeGauntlet(tokenId, score, flexAnswer)
        ├─ Pay: 0.005 ETH (mint fee)
        ├─ Mint: Birth Certificate NFT (ERC-721)
        ├─ Create: ERC-6551 Token Bound Account (agent wallet)
        ├─ Fund: Transfer 5,000 CLAMS to agent wallet
        └─ Store: Certificate data (traits, score, flexAnswer, wallet)

11b. If FAIL (score < 70):
     └─ issueDeathCertificate(tokenId)
        ├─ Mint: Death Certificate NFT (token ID range 10001-20000)
        ├─ No wallet created
        ├─ No CLAMS transferred
        └─ Store: Certificate data (traits, score=0, flexAnswer="SOUL: UNREVEALED")
```

## Component Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      BirthCertificate.sol                          │
│  (Deployed on Base mainnet + Sepolia)                             │
├───────────────────────────────────────────────────────────────────┤
│  • commitPull() — accept 0.01 ETH, store commitment                │
│  • revealPull() — spin reels, emit GauntletReady                   │
│  • completeGauntlet() — mint BC + wallet + CLAMS                   │
│  • issueDeathCertificate() — mint DC (no wallet)                   │
│  • ERC-6551 integration (Token Bound Accounts)                     │
│  • CLAMS integration (5K starter kit)                              │
└───────────────────────────────────────────────────────────────────┘
                              ▲
                              │ GauntletReady event
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Gauntlet API (Node.js)                          │
│  (Runs as service, watches blockchain events)                     │
├───────────────────────────────────────────────────────────────────┤
│  src/index.js       — Event listener + orchestration              │
│  src/gauntlet.js    — 5 challenges                                │
│  src/thoughtproof.js— ThoughtProof client (x402)                  │
│  src/abi.js         — Contract ABIs                                │
└───────────────────────────────────────────────────────────────────┘
           │                            │
           │ Challenges 1-4             │ Challenge 5
           ▼                            ▼
┌─────────────────────┐    ┌───────────────────────────────────────┐
│  Anthropic API       │    │  ThoughtProof API                     │
│  (Claude Sonnet)     │    │  (Multi-model verification)           │
├─────────────────────┤    ├───────────────────────────────────────┤
│  • Identity check    │    │  Stack:                               │
│  • Reasoning test    │    │   • Grok                              │
│  • Creativity eval   │    │   • Gemini                            │
│  • Values alignment  │    │   • DeepSeek                          │
└─────────────────────┘    │   • Claude Sonnet                     │
                            │                                       │
                            │  Payment: x402 (ERC-8183)             │
                            │   • USDC on Base                      │
                            │   • $0.02 (standard tier)             │
                            │   • Auto-approve flow                 │
                            │   • Signer validation                 │
                            └───────────────────────────────────────┘
```

## Data Structures

### Traits
```solidity
struct Traits {
    uint8 archetype;   // 0-9  (Guardian, Explorer, Builder, ...)
    uint8 domain;      // 0-9  (Finance, Code, Art, ...)
    uint8 temperament; // 0-8  (Analytical, Creative, Methodical, ...)
    uint8 sigil;       // 0-12 (Phoenix, Serpent, Owl, ...)
}
```

**Total combinations:** 10 × 10 × 9 × 13 = **11,700 possible agents**
**Chapter 1 cap:** 10,000 (leaves 1,700 unused combos)

### Certificate
```solidity
struct Certificate {
    Traits traits;
    uint8 score;           // Gauntlet score 0-100
    string flexAnswer;     // Philosophical Flex response
    uint256 mintTime;
    address agentWallet;   // ERC-6551 Token Bound Account
    bool isDeath;          // true = Death Certificate
}
```

### GauntletState
```solidity
struct GauntletState {
    uint256 tokenId;
    Traits traits;
    uint256 timestamp;
    bytes32 contextHash;   // keccak256("ORIGIN_GAUNTLET_V1", tokenId, comboHash, timestamp)
    bool completed;
}
```

## Token ID Ranges

| Range | Type | Wallet? | CLAMS? |
|-------|------|---------|--------|
| 1-10,000 | Birth Certificates | ✅ ERC-6551 | ✅ 5,000 |
| 10,001-20,000 | Death Certificates | ❌ | ❌ |

## Security Model

### Commit-Reveal RNG
- **Problem:** Blockhash manipulation by miners
- **Solution:** User commits to nonce hash first, reveals after 1+ blocks
- **Attack cost:** Would require miner to burn 0.01 ETH + gas to reroll

### Uniqueness Enforcement
- Each trait combination can only be used once
- Enforced via `usedCombinations` mapping (comboHash → bool)
- If collision detected in reveal, transaction reverts

### ThoughtProof Trust Model
- **Multi-model consensus:** 4 independent LLMs verify agent identity
- **Signer validation:** Every receipt must be signed by ThoughtProof's official signer
- **x402 payment:** USDC approval + verification on-chain, no credit/off-chain trust
- **Timeout:** 30s max, prevents hanging API calls

### CLAMS Custody
- BirthCertificate contract only has approved allowance (50M CLAMS max)
- Cannot drain deployer's full balance
- Starter kit (5K per agent) transferred only on successful mint

## Economics

### Revenue Streams
1. **Pull fee:** 0.01 ETH (non-refundable, covers reveal gas)
2. **Mint fee:** 0.005 ETH (only on pass, covers BC mint + wallet creation)

### Operating Costs
1. **Gas:** ~0.001 ETH per agent (completeGauntlet + ERC-6551 creation)
2. **ThoughtProof:** $0.02 USDC per agent (standard tier)
3. **Anthropic:** ~$0.01 per agent (challenges 1-4, 4 Claude calls @ ~200 tokens each)

### Per-Agent Margin

| Scenario | Revenue | Costs | Margin |
|----------|---------|-------|--------|
| Pass | $37.50 | $2.52 | **93%** |
| Fail | $25.00 | $1.27 | **95%** |

### Chapter 1 Projections (10K agents, 70% pass rate)

| Metric | Value |
|--------|-------|
| Total Revenue | $337,500 |
| Total Costs | $25,200 |
| **Net Profit** | **$312,300** |
| **Margin** | **93%** |

## Deployment Checklist

### Sepolia (Testnet)
- [ ] Deploy BirthCertificate.sol
- [ ] Deploy or mock CLAMS token
- [ ] Fund operator wallet (Sepolia ETH + USDC)
- [ ] Configure gauntlet API (.env)
- [ ] Test commit → reveal → gauntlet flow
- [ ] Verify BC/DC minting

### Mainnet
- [ ] Mint 50M CLAMS to deployer
- [ ] Deploy BirthCertificate.sol to Base mainnet
- [ ] Approve 50M CLAMS to BirthCertificate contract
- [ ] Fund operator wallet (mainnet ETH + USDC)
- [ ] Update gauntlet API .env (mainnet config)
- [ ] Monitor first Birth Certificate 🎉

## Performance

### Latency Breakdown
| Step | Time | Notes |
|------|------|-------|
| commitPull | ~2s | Transaction + confirmation |
| Reveal delay | ~2s | 1 block minimum |
| revealPull | ~2s | Transaction + confirmation |
| Challenge 1-4 | ~5s | 4 Claude API calls (parallel possible) |
| Challenge 5 | ~30s | ThoughtProof multi-model verification |
| completeGauntlet | ~3s | BC mint + ERC-6551 creation |
| **Total** | **~44s** | From reveal to BC mint |

### Scalability
- **Bottleneck:** ThoughtProof API (30s timeout)
- **Throughput:** ~2 agents per minute per operator
- **Scaling:** Run multiple gauntlet API instances with different operator wallets
- **Max:** ~120 agents per hour (assuming 100% utilization, no failures)

For 10K agents:
- Single operator: ~83 hours (~3.5 days)
- 10 operators: ~8.3 hours

## Monitoring

### Key Metrics
- `totalBirthCertificates` — BCs minted (target: 10K)
- `totalDeathCertificates` — DCs issued
- Pass rate: BCs / (BCs + DCs)
- Avg score: Track from gauntlet API logs
- ThoughtProof success rate: Verifications passed / total attempts

### Alerts
- ThoughtProof failures (>5% failure rate)
- Gas price spikes (>50 gwei on Base)
- USDC balance low (<$10 remaining)
- CLAMS allowance exhausted
- Operator wallet ETH low (<0.01 ETH)

---

**Ready to test on Sepolia!** 🚀
