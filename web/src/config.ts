import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://testnet.monadvision.com' },
  },
} as const

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
})

/** @deprecated single-contract MVP */
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ||
  '') as `0x${string}`

export const MEMBERSHIP_ADDRESS = (import.meta.env.VITE_MEMBERSHIP_ADDRESS ||
  '') as `0x${string}`
export const LOCATION_ADDRESS = (import.meta.env.VITE_LOCATION_ADDRESS ||
  '') as `0x${string}`
export const PROPOSAL_ADDRESS = (import.meta.env.VITE_PROPOSAL_ADDRESS ||
  '') as `0x${string}`
export const TREASURY_ADDRESS = (import.meta.env.VITE_TREASURY_ADDRESS ||
  '') as `0x${string}`

export const hasMikasa = Boolean(
  MEMBERSHIP_ADDRESS?.startsWith('0x') &&
    LOCATION_ADDRESS?.startsWith('0x') &&
    PROPOSAL_ADDRESS?.startsWith('0x') &&
    TREASURY_ADDRESS?.startsWith('0x'),
)

export const TIER_LABEL = [
  'Visitor',
  'Member',
  'Contributor',
  'Steward',
  'Guardian',
] as const

export const PROPOSAL_STATUS_LABEL = [
  'Voting',
  'Approved',
  'Rejected',
  'Funding',
  'Execution',
  'Completed',
] as const

export const STATUS_LABEL = [
  'Active',
  'Funded',
  'Executed',
  'Verified',
  'Cancelled',
] as const

export const EXPLORER_BASE = 'https://testnet.monadvision.com'

export function explorerTxUrl(hash: `0x${string}` | string) {
  return `${EXPLORER_BASE}/tx/${hash}`
}

export function explorerAddressUrl(addr: `0x${string}` | string) {
  return `${EXPLORER_BASE}/address/${addr}`
}
