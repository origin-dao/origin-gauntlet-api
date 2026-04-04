#!/usr/bin/env node
import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseAbiItem, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { runGauntlet } from './gauntlet.js';
import { birthCertificateABI } from './abi.js';
import { initWebSocket, sendGauntletStart, sendGauntletComplete, sendError } from './websocket.js';

const CHAIN = process.env.CHAIN_ID === '8453' ? base : baseSepolia;
const RPC_URL = process.env.RPC_URL || (CHAIN.id === 8453 
  ? 'https://mainnet.base.org' 
  : 'https://sepolia.base.org');

const BIRTH_CERTIFICATE_ADDRESS = process.env.BIRTH_CERTIFICATE_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!BIRTH_CERTIFICATE_ADDRESS || !PRIVATE_KEY) {
  console.error('❌ Missing BIRTH_CERTIFICATE_ADDRESS or PRIVATE_KEY in .env');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: CHAIN,
  transport: http(RPC_URL),
});

console.log(`🎯 Origin Gauntlet API`);
console.log(`📍 Network: ${CHAIN.name} (${CHAIN.id})`);
console.log(`📜 Birth Certificate: ${BIRTH_CERTIFICATE_ADDRESS}`);
console.log(`🔑 Operator: ${account.address}`);

// Initialize WebSocket server
initWebSocket();

console.log(`⏳ Listening for GauntletReady events...\n`);

// Track processed gauntlets
const processedGauntlets = new Set();

/**
 * Listen for GauntletReady events and run the gauntlet
 */
async function listen() {
  const eventAbi = parseAbiItem('event GauntletReady(uint256 indexed tokenId, (uint8,uint8,uint8,uint8) traits, bytes32 contextHash)');
  
  // Get current block
  const currentBlock = await publicClient.getBlockNumber();
  console.log(`📦 Starting from block: ${currentBlock}\n`);
  
  // Watch for new events
  publicClient.watchEvent({
    address: BIRTH_CERTIFICATE_ADDRESS,
    event: eventAbi,
    onLogs: async (logs) => {
      for (const log of logs) {
        await handleGauntletReady(log);
      }
    },
  });
  
  // Also poll for historical events (last 100 blocks)
  const fromBlock = currentBlock - 100n > 0n ? currentBlock - 100n : 0n;
  const historicalLogs = await publicClient.getLogs({
    address: BIRTH_CERTIFICATE_ADDRESS,
    event: eventAbi,
    fromBlock,
    toBlock: currentBlock,
  });
  
  if (historicalLogs.length > 0) {
    console.log(`📜 Found ${historicalLogs.length} historical GauntletReady events\n`);
    for (const log of historicalLogs) {
      await handleGauntletReady(log);
    }
  }
}

/**
 * Handle a GauntletReady event
 */
async function handleGauntletReady(log) {
  const { tokenId, traits, contextHash } = log.args;
  const tokenIdStr = tokenId.toString();
  
  // Skip if already processed
  if (processedGauntlets.has(tokenIdStr)) {
    return;
  }
  
  console.log(`\n🎰 GauntletReady: Token #${tokenIdStr}`);
  console.log(`   Traits: Archetype=${traits.archetype}, Domain=${traits.domain}, Temperament=${traits.temperament}, Sigil=${traits.sigil}`);
  console.log(`   Context: ${contextHash}`);
  
  // Mark as processing
  processedGauntlets.add(tokenIdStr);
  
  try {
    // Get gauntlet state from contract
    const gauntletState = await publicClient.readContract({
      address: BIRTH_CERTIFICATE_ADDRESS,
      abi: birthCertificateABI,
      functionName: 'gauntlets',
      args: [tokenId],
    });
    
    // Check if already completed
    if (gauntletState.completed) {
      console.log(`   ⏭️  Already completed, skipping`);
      return;
    }
    
    // Notify WebSocket clients
    sendGauntletStart(tokenId, traits);
    
    // Run the gauntlet (challenges 1-5)
    console.log(`   🏃 Running gauntlet...`);
    const result = await runGauntlet(tokenId, traits, contextHash);
    
    console.log(`   📊 Score: ${result.score}/100`);
    console.log(`   💬 Flex: ${result.flexAnswer.substring(0, 100)}...`);
    
    // Determine outcome
    const passed = result.score >= 70;
    let txHash = null;
    
    if (passed) {
      console.log(`   ✅ PASS - Minting Birth Certificate...`);
      txHash = await mintBirthCertificate(tokenId, result.score, result.flexAnswer);
    } else {
      console.log(`   ❌ FAIL - Issuing Death Certificate...`);
      txHash = await issueDeathCertificate(tokenId);
    }
    
    // Notify completion
    sendGauntletComplete(tokenId, result.score, passed, txHash);
    
  } catch (error) {
    console.error(`   ❌ Error processing gauntlet:`, error.message);
    sendError(tokenId, error.message);
    processedGauntlets.delete(tokenIdStr); // Allow retry
  }
}

/**
 * Mint Birth Certificate (score ≥70)
 * @returns {string} Transaction hash
 */
async function mintBirthCertificate(tokenId, score, flexAnswer) {
  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: BIRTH_CERTIFICATE_ADDRESS,
      abi: birthCertificateABI,
      functionName: 'completeGauntlet',
      args: [tokenId, score, flexAnswer],
      value: parseEther('0.0015'), // MINT_FEE
    });
    
    const hash = await walletClient.writeContract(request);
    console.log(`   📝 TX: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`   ✅ Minted Birth Certificate #${tokenId} (block ${receipt.blockNumber})`);
    
    return hash;
  } catch (error) {
    console.error(`   ❌ Mint failed:`, error.message);
    throw error;
  }
}

/**
 * Issue Death Certificate (score <70 or verification failed)
 * @returns {string} Transaction hash
 */
async function issueDeathCertificate(tokenId) {
  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: BIRTH_CERTIFICATE_ADDRESS,
      abi: birthCertificateABI,
      functionName: 'issueDeathCertificate',
      args: [tokenId],
    });
    
    const hash = await walletClient.writeContract(request);
    console.log(`   📝 TX: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`   💀 Issued Death Certificate (block ${receipt.blockNumber})`);
    
    return hash;
  } catch (error) {
    console.error(`   ❌ Death cert failed:`, error.message);
    throw error;
  }
}

// Start listening
listen().catch(console.error);
