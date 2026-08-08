export const TIER_NAMES = [
  'Visitor',
  'Member',
  'Contributor',
  'Steward',
  'Guardian',
] as const

export { checkInKindToUint } from './reputation'

export function latLngToE6(lat: number, lng: number): { latE6: bigint; lngE6: bigint } {
  return {
    latE6: BigInt(Math.round(lat * 1e6)),
    lngE6: BigInt(Math.round(lng * 1e6)),
  }
}

/** Default 30% / 40% / 30% milestone split */
export const DEFAULT_MILESTONE_BPS = [3000, 4000, 3000] as const

export function stubCidFromPhoto(dataUrl?: string): string {
  if (!dataUrl) return `bafy-mikasa-${Date.now()}`
  // Lightweight local stub (not real IPFS) for Blitz demos
  let h = 0
  const slice = dataUrl.slice(0, 2000)
  for (let i = 0; i < slice.length; i++) h = (h * 31 + slice.charCodeAt(i)) >>> 0
  return `bafy-mikasa-${h.toString(16)}`
}
