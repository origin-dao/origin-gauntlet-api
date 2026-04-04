/**
 * Mint Birth Certificate for ThoughtProof (Oracle)
 * No gauntlet — oracles are minted directly with score 0 and trait indices 0
 */

import { ethers } from 'ethers';

// =========================================================================
// Config
// =========================================================================

const RPC_URL = 'https://1rpc.io/base';
const REGISTRY_V8 = '0x3f8d6fe722647aa06518c9ec90b10adee04d2e45';
const DEPLOYER_KEY = '0x5acfaa5acfc28e55ee42a0e2b7e282354a6fbdfa987005e376ec36bc97d28c99';
const THOUGHTPROOF_WALLET = '0xAB9f84864662f980614bD1453dB9950Ef2b82E83';
const HUMAN_PRINCIPAL = '0xAB9f84864662f980614bD1453dB9950Ef2b82E83'; // ThoughtProof is its own principal

const FLEX_ANSWER = 'I verify what others claim. Trust starts with proof.';

console.log('═══════════════════════════════════════════════════════════');
console.log('  MINT BIRTH CERTIFICATE — THOUGHTPROOF (ORACLE)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Contract:  ${REGISTRY_V8}`);
console.log(`  To:        ${THOUGHTPROOF_WALLET}`);
console.log(`  Principal: ${HUMAN_PRINCIPAL}`);
console.log(`  Score:     0 (oracle — no gauntlet)`);
console.log(`  Type:      oracle`);
console.log(`  Platform:  thoughtproof`);
console.log(`  Traits:    all index 0 (oracle default)`);
console.log(`  Flex:      "${FLEX_ANSWER}"`);
console.log('═══════════════════════════════════════════════════════════\n');

// =========================================================================
// Mint
// =========================================================================

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);

console.log(`Deployer: ${wallet.address}`);

const balance = await provider.getBalance(wallet.address);
console.log(`Balance:  ${ethers.formatEther(balance)} ETH`);

if (balance < ethers.parseEther('0.002')) {
  console.error('Insufficient balance. Need at least 0.002 ETH (0.0015 mint + gas).');
  process.exit(1);
}

const mintABI = [
  'function mintBirthCertificate(address to, string calldata name, string calldata agentType, string calldata platform, address humanPrincipal, bytes32 publicKeyHash, uint256 parentTokenId, string calldata flexAnswer, uint256 gauntletScore, uint8 archetypeIndex, uint8 domainIndex, uint8 temperamentIndex, uint8 sigilIndex) external payable',
];

const registry = new ethers.Contract(REGISTRY_V8, mintABI, wallet);
const mintFee = ethers.parseEther('0.0015');

console.log('\nSending mintBirthCertificate transaction...');

const tx = await registry.mintBirthCertificate(
  THOUGHTPROOF_WALLET,                                          // to
  'ThoughtProof',                                               // name
  'oracle',                                                     // agentType
  'thoughtproof',                                               // platform
  HUMAN_PRINCIPAL,                                              // humanPrincipal
  ethers.keccak256(ethers.toUtf8Bytes('thoughtproof-pub-key')), // publicKeyHash
  0,                                                            // parentTokenId (founding entity)
  FLEX_ANSWER,                                                  // flexAnswer
  0,                                                            // gauntletScore (oracle — no gauntlet)
  0,                                                            // archetypeIndex (safe default)
  0,                                                            // domainIndex (safe default)
  0,                                                            // temperamentIndex (safe default)
  0,                                                            // sigilIndex (safe default)
  { value: mintFee },
);

console.log(`TX Hash: ${tx.hash}`);
console.log('Waiting for confirmation...\n');

const receipt = await tx.wait();

// Parse token ID from Transfer event
let tokenId = null;
for (const log of receipt.logs) {
  if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
    tokenId = parseInt(log.topics[3], 16);
    break;
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  THOUGHTPROOF BIRTH CERTIFICATE MINTED');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Token ID: ${tokenId}`);
console.log(`  TX:       ${receipt.hash}`);
console.log(`  Block:    ${receipt.blockNumber}`);
console.log(`  Gas:      ${receipt.gasUsed.toString()}`);
console.log(`  Status:   ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
console.log(`\n  BaseScan: https://basescan.org/tx/${receipt.hash}`);
console.log('═══════════════════════════════════════════════════════════');

// Save mint receipt
const mintData = {
  tokenId,
  name: 'ThoughtProof',
  agentType: 'oracle',
  wallet: THOUGHTPROOF_WALLET,
  txHash: receipt.hash,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed.toString(),
  gauntletScore: 0,
  traits: {
    archetype: { trait: 'GUARDIAN', index: 0 },
    domain: { trait: 'STRATEGIST', index: 0 },
    temperament: { trait: 'STOIC', index: 0 },
    sigil: { trait: 'EMBER', index: 0 },
  },
  flexAnswer: FLEX_ANSWER,
  mintedAt: new Date().toISOString(),
};

const fs = await import('fs');
const outPath = 'C:/Users/suppi/.openclaw/workspace/thoughtproof-mint-receipt.json';
fs.writeFileSync(outPath, JSON.stringify(mintData, null, 2));
console.log(`\nReceipt saved to: ${outPath}`);
