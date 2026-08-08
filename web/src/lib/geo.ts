/** Earth radius in meters */
const R = 6371000

export type LatLng = { lat: number; lng: number }

export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Max GPS accuracy (meters) accepted for a Nearby check-in */
export const MAX_ACCURACY_M = 100

export const GEO_DEMO =
  import.meta.env.VITE_GEO_DEMO === '1' ||
  import.meta.env.VITE_GEO_DEMO === 'true'

export type GeoCheckResult =
  | {
      status: 'nearby'
      distanceM: number
      accuracyM: number
      mode: 'live' | 'demo'
    }
  | {
      status: 'too_far'
      distanceM: number
      accuracyM: number
      mode: 'live' | 'demo'
    }
  | {
      status: 'imprecise'
      distanceM: number
      accuracyM: number
      mode: 'live' | 'demo'
    }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'self' }

export function evaluatePresence(
  user: LatLng & { accuracyM: number },
  place: LatLng & { radiusM: number },
  mode: 'live' | 'demo',
): GeoCheckResult {
  const distanceM = Math.round(distanceMeters(user, place))
  const accuracyM = Math.round(user.accuracyM)
  if (accuracyM > MAX_ACCURACY_M) {
    return { status: 'imprecise', distanceM, accuracyM, mode }
  }
  if (distanceM > place.radiusM) {
    return { status: 'too_far', distanceM, accuracyM, mode }
  }
  return { status: 'nearby', distanceM, accuracyM, mode }
}

export function mapsUrl(lat: number, lng: number, label?: string): string {
  const q = label
    ? `${encodeURIComponent(label)}/@${lat},${lng},17z`
    : `${lat},${lng}`
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export function readDevicePosition(): Promise<LatLng & { accuracyM: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy || 999,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error('denied'))
        else reject(new Error('unavailable'))
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  })
}
