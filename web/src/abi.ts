export const mikasaMembershipAbi = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getMember',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'registered', type: 'bool' },
      { name: 'reputation', type: 'uint256' },
      { name: 'contributionCount', type: 'uint256' },
      { name: 'joinedAt', type: 'uint64' },
      { name: 'tier', type: 'uint8' },
      { name: 'power', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'tierOf',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'votingPower',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setModule',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'module', type: 'address' },
      { name: 'allowed', type: 'bool' },
    ],
    outputs: [],
  },
] as const

export const mikasaLocationAbi = [
  {
    type: 'function',
    name: 'createLocation',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'locationLabel', type: 'string' },
      { name: 'latE6', type: 'int256' },
      { name: 'lngE6', type: 'int256' },
    ],
    outputs: [{ name: 'locationId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'joinLocation',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'locationId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'checkIn',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'locationId', type: 'uint256' },
      { name: 'kind', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isMember',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getLocation',
    stateMutability: 'view',
    inputs: [{ name: 'locationId', type: 'uint256' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'locationLabel', type: 'string' },
      { name: 'latE6', type: 'int256' },
      { name: 'lngE6', type: 'int256' },
      { name: 'creator', type: 'address' },
      { name: 'memberCount', type: 'uint256' },
      { name: 'checkInCount', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'locationCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const mikasaTreasuryAbi = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [{ name: 'locationId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'proposalEscrow',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setProposalModule',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'module', type: 'address' }],
    outputs: [],
  },
] as const

export const mikasaProposalAbi = [
  {
    type: 'function',
    name: 'createProposal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'locationId', type: 'uint256' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'goalWei', type: 'uint256' },
      { name: 'milestoneBps', type: 'uint16[]' },
      { name: 'votingPeriodSeconds', type: 'uint64' },
    ],
    outputs: [{ name: 'proposalId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'vote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'closeVoting',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'contribute',
    stateMutability: 'payable',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'submitProof',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'milestoneId', type: 'uint256' },
      { name: 'ipfsCid', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'verifyMilestone',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'milestoneId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getProposal',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'locationId', type: 'uint256' },
      { name: 'creator', type: 'address' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'goal', type: 'uint256' },
      { name: 'raised', type: 'uint256' },
      { name: 'yesPower', type: 'uint256' },
      { name: 'noPower', type: 'uint256' },
      { name: 'deadline', type: 'uint64' },
      { name: 'status', type: 'uint8' },
      { name: 'milestoneCount', type: 'uint8' },
    ],
  },
  {
    type: 'function',
    name: 'getMilestone',
    stateMutability: 'view',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'milestoneId', type: 'uint256' },
    ],
    outputs: [
      { name: 'bps', type: 'uint16' },
      { name: 'ipfsCid', type: 'string' },
      { name: 'proven', type: 'bool' },
      { name: 'released', type: 'bool' },
      { name: 'yesVerifies', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'proposalCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

/** @deprecated legacy single-contract MVP — prefer mikasa*Abi */
export { communityPlaceAbi } from './abi.legacy'
