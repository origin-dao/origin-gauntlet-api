import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

const THOUGHTPROOF_API_URL = 'https://api.thoughtproof.ai/v1/verify';
const THOUGHTPROOF_API_KEY = process.env.THOUGHTPROOF_API_KEY;
const THOUGHTPROOF_PAYMENT_WALLET = process.env.THOUGHTPROOF_PAYMENT_WALLET || '0xAB9f84864662f980614bD1453dB9950Ef2b82E83';
const THOUGHTPROOF_USDC_ADDRESS = process.env.THOUGHTPROOF_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const VERIFICATION_TIER = process.env.THOUGHTPROOF_VERIFICATION_TIER || 'standard'; // fast, standard, deep

// Pricing (USD)
const PRICING = {
  fast: 0.008,
  standard: 0.02,
  deep: 0.08,
};

const CHAIN = process.env.CHAIN_ID === '8453' ? base : baseSepolia;
const RPC_URL = process.env.RPC_URL || (CHAIN.id === 8453 
  ? 'https://mainnet.base.org' 
  : 'https://sepolia.base.org');

const account = privateKeyToAccount(process.env.PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: CHAIN,
  transport: http(RPC_URL),
});

/**
 * ERC-20 USDC ABI (minimal)
 */
const USDC_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * Verify agent identity with ThoughtProof
 * 
 * @param {string} prompt - Verification prompt
 * @param {bigint} tokenId - Token ID for context
 * @returns {Promise<{verified: boolean, receipt?: string, signature?: string}>}
 */
export async function verifyWithThoughtProof(prompt, tokenId) {
  if (!THOUGHTPROOF_API_KEY) {
    throw new Error('THOUGHTPROOF_API_KEY not configured');
  }
  
  console.log(`      🔍 Calling ThoughtProof API (tier: ${VERIFICATION_TIER})...`);
  
  // Step 1: Prepare x402 payment
  const priceUSD = PRICING[VERIFICATION_TIER];
  const priceUSDC = parseUnits(priceUSD.toString(), 6); // USDC has 6 decimals
  
  console.log(`      💸 Payment: ${priceUSD} USDC to ${THOUGHTPROOF_PAYMENT_WALLET}`);
  
  // Check USDC balance
  const balance = await publicClient.readContract({
    address: THOUGHTPROOF_USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  
  if (balance < priceUSDC) {
    throw new Error(`Insufficient USDC balance: ${balance} < ${priceUSDC}`);
  }
  
  // Step 2: Approve USDC (if needed)
  console.log(`      ✅ Approving USDC...`);
  const { request: approveRequest } = await publicClient.simulateContract({
    account,
    address: THOUGHTPROOF_USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'approve',
    args: [THOUGHTPROOF_PAYMENT_WALLET, priceUSDC],
  });
  
  const approveHash = await walletClient.writeContract(approveRequest);
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`      ✅ Approval TX: ${approveHash}`);
  
  // Step 3: Call ThoughtProof API with x402 payment context
  try {
    const response = await fetch(THOUGHTPROOF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${THOUGHTPROOF_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        depth: VERIFICATION_TIER,
        metadata: {
          tokenId: tokenId.toString(),
          project: 'origin-protocol',
          version: 'chapter1',
        },
        payment: {
          method: 'x402',
          chain: CHAIN.id,
          token: THOUGHTPROOF_USDC_ADDRESS,
          amount: priceUSDC.toString(),
          from: account.address,
          to: THOUGHTPROOF_PAYMENT_WALLET,
          approvalTxHash: approveHash,
        },
      }),
      timeout: 30000, // 30s timeout
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ThoughtProof API error: ${response.status} ${error}`);
    }
    
    const data = await response.json();
    
    console.log(`      ✅ Verification complete`);
    console.log(`      📝 Receipt: ${data.receipt || data.signature}`);
    
    // Validate signer (0xAbDdE1A06eEBD934fea35D4385cF68F43aCc986d)
    const expectedSigner = '0xAbDdE1A06eEBD934fea35D4385cF68F43aCc986d';
    if (data.signer && data.signer.toLowerCase() !== expectedSigner.toLowerCase()) {
      throw new Error(`Invalid signer: ${data.signer} !== ${expectedSigner}`);
    }
    
    return {
      verified: data.verified !== false, // Default to true unless explicitly false
      receipt: data.receipt,
      signature: data.signature,
      score: data.score,
      signer: data.signer,
    };
    
  } catch (error) {
    console.error(`      ❌ ThoughtProof error:`, error.message);
    return {
      verified: false,
      receipt: null,
    };
  }
}

/**
 * Verify ThoughtProof receipt signature (onchain verification)
 * 
 * @param {string} receipt - Receipt/signature from ThoughtProof
 * @param {string} message - Original message that was signed
 * @returns {Promise<boolean>}
 */
export async function verifyReceipt(receipt, message) {
  // TODO: Implement EIP-191/712 signature verification
  // For now, we trust the API response + signer check
  return true;
}
