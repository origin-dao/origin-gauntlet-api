#!/usr/bin/env node
/**
 * Test ThoughtProof integration without deploying contracts
 * Usage: node test-thoughtproof.js
 */

import 'dotenv/config';
import { verifyWithThoughtProof } from './src/thoughtproof.js';

const TEST_PROMPT = `Verify this agent identity: Guardian | Finance | Analytical | Phoenix

Is this a coherent agent persona? Respond with a brief assessment.`;

const TEST_TOKEN_ID = 999999n; // Fake token ID for testing

console.log(`🧪 Testing ThoughtProof Integration\n`);
console.log(`Network: ${process.env.CHAIN_ID === '8453' ? 'Base Mainnet' : 'Base Sepolia'}`);
console.log(`Tier: ${process.env.THOUGHTPROOF_VERIFICATION_TIER || 'standard'}`);
console.log(`\nPrompt:\n${TEST_PROMPT}\n`);

try {
  const result = await verifyWithThoughtProof(TEST_PROMPT, TEST_TOKEN_ID);
  
  console.log(`\n✅ Test Complete!\n`);
  console.log(`Verified: ${result.verified}`);
  console.log(`Score: ${result.score || 'N/A'}`);
  console.log(`Receipt: ${result.receipt || result.signature}`);
  console.log(`Signer: ${result.signer || 'N/A'}`);
  
  if (result.verified) {
    console.log(`\n🎉 ThoughtProof integration working!`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Verification failed - check API key and USDC balance`);
    process.exit(1);
  }
  
} catch (error) {
  console.error(`\n❌ Test failed:`, error.message);
  console.error(error.stack);
  process.exit(1);
}
