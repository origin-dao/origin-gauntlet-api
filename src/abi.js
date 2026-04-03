/**
 * Birth Certificate contract ABI (minimal, for gauntlet operations)
 */
export const birthCertificateABI = [
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'gauntlets',
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      {
        name: 'traits',
        type: 'tuple',
        components: [
          { name: 'archetype', type: 'uint8' },
          { name: 'domain', type: 'uint8' },
          { name: 'temperament', type: 'uint8' },
          { name: 'sigil', type: 'uint8' },
        ],
      },
      { name: 'timestamp', type: 'uint256' },
      { name: 'contextHash', type: 'bytes32' },
      { name: 'completed', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'score', type: 'uint8' },
      { name: 'flexAnswer', type: 'string' },
    ],
    name: 'completeGauntlet',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'issueDeathCertificate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      {
        indexed: false,
        name: 'traits',
        type: 'tuple',
        components: [
          { name: 'archetype', type: 'uint8' },
          { name: 'domain', type: 'uint8' },
          { name: 'temperament', type: 'uint8' },
          { name: 'sigil', type: 'uint8' },
        ],
      },
      { indexed: false, name: 'contextHash', type: 'bytes32' },
    ],
    name: 'GauntletReady',
    type: 'event',
  },
];
