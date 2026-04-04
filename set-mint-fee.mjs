/**
 * Update mintFee on OriginRegistryV8 via setMintFee()
 * Requires PERM_ADMIN (deployer has all permissions)
 */

import { ethers } from 'ethers';

const RPC_URL = 'https://1rpc.io/base';
const REGISTRY_V8 = '0x3f8d6fe722647aa06518c9ec90b10adee04d2e45';
const DEPLOYER_KEY = '0x5acfaa5acfc28e55ee42a0e2b7e282354a6fbdfa987005e376ec36bc97d28c99';
const NEW_FEE = '0.005'; // ETH

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);

const abi = [
  'function setMintFee(uint256 _fee) external',
  'function mintFee() view returns (uint256)',
];

const registry = new ethers.Contract(REGISTRY_V8, abi, wallet);

// Read current fee
const currentFee = await registry.mintFee();
console.log(`Current mintFee: ${ethers.formatEther(currentFee)} ETH`);

const newFeeWei = ethers.parseEther(NEW_FEE);
console.log(`Setting mintFee to: ${NEW_FEE} ETH (${newFeeWei} wei)`);

const tx = await registry.setMintFee(newFeeWei);
console.log(`TX Hash: ${tx.hash}`);
console.log('Waiting for confirmation...');

const receipt = await tx.wait();
console.log(`Confirmed in block ${receipt.blockNumber}, gas used: ${receipt.gasUsed}`);

// Verify
const updatedFee = await registry.mintFee();
console.log(`Updated mintFee: ${ethers.formatEther(updatedFee)} ETH`);
