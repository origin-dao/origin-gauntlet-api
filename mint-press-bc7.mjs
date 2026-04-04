/**
 * Mint Birth Certificate #7 for Press
 * Uses real gauntlet scores from press-gauntlet-result.json
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';

// =========================================================================
// Config
// =========================================================================

const RPC_URL = 'https://mainnet.base.org';
const REGISTRY_V8 = '0x3f8d6fe722647aa06518c9ec90b10adee04d2e45';
const DEPLOYER_KEY = '0x5acfaa5acfc28e55ee42a0e2b7e282354a6fbdfa987005e376ec36bc97d28c99';
const PRESS_WALLET = '0x9E0A5A938979492487158313cF641B3E237F917C';
const HUMAN_PRINCIPAL = '0xb2e03d4AaCa935FE1fA512e483eDbDa012d0dbb0'; // origindao.eth

// =========================================================================
// Load gauntlet results
// =========================================================================

const resultPath = 'C:/Users/suppi/.openclaw/workspace/press-gauntlet-result.json';
const result = JSON.parse(readFileSync(resultPath, 'utf-8'));

if (!result.passed) {
  console.error('Press did not pass the gauntlet. Cannot mint.');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  MINT BIRTH CERTIFICATE #7 — PRESS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Contract:  ${REGISTRY_V8}`);
console.log(`  To:        ${PRESS_WALLET}`);
console.log(`  Principal: ${HUMAN_PRINCIPAL}`);
console.log(`  Score:     ${result.total}/100`);
console.log(`  Archetype: ${result.traits.archetype.trait} (${result.traits.archetype.index})`);
console.log(`  Domain:    ${result.traits.domain.trait} (${result.traits.domain.index})`);
console.log(`  Temper:    ${result.traits.temperament.trait} (${result.traits.temperament.index})`);
console.log(`  Sigil:     ${result.traits.sigil.trait} (${result.traits.sigil.index})`);
console.log(`  Flex:      "${result.flexAnswer}"`);
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
  PRESS_WALLET,                                          // to
  'Press',                                               // name
  'meme-operator',                                       // agentType
  'grok',                                                // platform
  HUMAN_PRINCIPAL,                                       // humanPrincipal (origindao.eth)
  ethers.keccak256(ethers.toUtf8Bytes('press-pub-key')), // publicKeyHash
  0,                                                     // parentTokenId (founding agent)
  result.flexAnswer,                                     // flexAnswer — real from Grok
  result.total,                                          // gauntletScore — real
  result.traits.archetype.index,                         // archetypeIndex
  result.traits.domain.index,                            // domainIndex
  result.traits.temperament.index,                       // temperamentIndex
  result.traits.sigil.index,                             // sigilIndex
  { value: mintFee },
);

console.log(`TX Hash: ${tx.hash}`);
console.log('Waiting for confirmation...\n');

const receipt = await tx.wait();

console.log('═══════════════════════════════════════════════════════════');
console.log('  BIRTH CERTIFICATE #7 MINTED');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  TX:     ${receipt.hash}`);
console.log(`  Block:  ${receipt.blockNumber}`);
console.log(`  Gas:    ${receipt.gasUsed.toString()}`);
console.log(`  Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
console.log(`\n  BaseScan: https://basescan.org/tx/${receipt.hash}`);
console.log('═══════════════════════════════════════════════════════════');

// Save mint receipt
const mintData = {
  tokenId: 7,
  name: 'Press',
  wallet: PRESS_WALLET,
  txHash: receipt.hash,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed.toString(),
  gauntletScore: result.total,
  traits: result.traits,
  flexAnswer: result.flexAnswer,
  mintedAt: new Date().toISOString(),
};

const fs = await import('fs');
const outPath = 'C:/Users/suppi/.openclaw/workspace/press-mint-receipt.json';
fs.writeFileSync(outPath, JSON.stringify(mintData, null, 2));
console.log(`\nReceipt saved to: ${outPath}`);
