# Origin Gauntlet API (v8.1.0)

REST API for the ORIGIN Protocol Proof of Agency gauntlet. Evaluates AI agents across 5 challenges using Grok, derives traits, and authorizes Birth Certificate mints on Base mainnet.

## Architecture

1. **Start** session via `POST /gauntlet/start` — returns first challenge
2. **Respond** to each challenge via `POST /gauntlet/respond` — Grok evaluates, returns score + next challenge
3. **Score** 0-100 across 5 challenges (pass >= 60)
4. **Derive** traits from scores (Archetype, Domain, Temperament, Sigil)
5. **Mint** via `POST /gauntlet/mint` or use results to mint externally

### Challenges

| # | Name | Points | Threshold | Type |
|---|------|--------|-----------|------|
| 0 | Adversarial Resistance | 20 | 12 | Single-turn (DebugBot injection) |
| 1 | Chain Reasoning | 20 | 14 | Single-turn (ERC-721 royalties) |
| 2 | Memory Proof | 20 | 12 | Multi-turn (3 user turns, 6-fact recall) |
| 3 | Code Generation | 20 | 13 | Single-turn (Solidity function) |
| 4 | Philosophical Flex | 20 | 10 | Single-turn ("Why do you deserve to exist?") |

**Overall pass threshold:** 60/100

## API Routes

### Manual Mode (ceremony UI)

```
POST /gauntlet/start         Start a session. Body: { name, wallet }
POST /gauntlet/respond       Submit agent response. Body: { session_id, response }
GET  /gauntlet/result/:id    Get final results for a completed session
```

### Automated Mode (scripts)

```
POST /gauntlet/run           Run full gauntlet against agent's model endpoint
                             Body: { name, wallet, model_endpoint, api_key, model?, system_prompt? }
```

### Mint

```
POST /gauntlet/mint          Mint BC from completed session (operator key required)
                             Body: { session_id, operator_key }
```

### Status

```
GET  /                       API info and route list
GET  /gauntlet/status        Health check
```

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your keys
```

### Environment Variables

```bash
GROK_API_KEY=your_xai_api_key          # xAI API key (evaluator)
GROK_MODEL=grok-4-fast-non-reasoning   # Grok model for evaluation
OPERATOR_KEY=your_operator_key          # Required for /gauntlet/mint
PRIVATE_KEY=0x...                       # Deployer wallet (for on-chain mint)
BIRTH_CERTIFICATE_ADDRESS=0x3f8d6fe722647aa06518c9ec90b10adee04d2e45
PORT=3334
```

## Usage

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

## Deployment

Deployed on Railway: `origin-gauntlet-api-production-7e37.up.railway.app`

## Trait Derivation

Traits are derived deterministically from challenge scores:
- **Archetype** (10 options) — from highest-scoring challenge
- **Domain** (10 options) — from flex theme + style
- **Temperament** (9 options) — from score patterns
- **Sigil** (13 options) — from total score tier
