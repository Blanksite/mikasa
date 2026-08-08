import type { CheckInKind, PlaceMeta, SpaceKind } from './storage'

export type MapPlaceHit = {
  id: string
  name: string
  locationLabel: string
  lat: number
  lng: number
  kind: SpaceKind
  checkInKinds: CheckInKind[]
  osmId?: string
}

type NominatimItem = {
  place_id: number
  osm_id?: number
  osm_type?: string
  lat: string
  lon: string
  display_name: string
  name?: string
  type?: string
  class?: string
  address?: Record<string, string>
}

const ROUTE_KINDS: CheckInKind[] = ['visit', 'run', 'walk']
const SPOT_KINDS: CheckInKind[] = ['visit', 'work', 'code', 'study', 'hangout']
const EVENT_KINDS: CheckInKind[] = ['attend', 'volunteer', 'host']

function classify(item: NominatimItem): {
  kind: SpaceKind
  checkInKinds: CheckInKind[]
} {
  const type = `${item.class || ''}:${item.type || ''}`.toLowerCase()
  if (
    type.includes('park') ||
    type.includes('path') ||
    type.includes('footway') ||
    type.includes('pedestrian') ||
    type.includes('pitch') ||
    type.includes('stadium')
  ) {
    return { kind: 'place', checkInKinds: [...ROUTE_KINDS] }
  }
  if (
    type.includes('cafe') ||
    type.includes('library') ||
    type.includes('cowork') ||
    type.includes('office') ||
    type.includes('university') ||
    type.includes('school') ||
    type.includes('hotel') ||
    type.includes('restaurant')
  ) {
    return { kind: 'place', checkInKinds: [...SPOT_KINDS] }
  }
  if (
    type.includes('theatre') ||
    type.includes('events') ||
    type.includes('community_centre') ||
    type.includes('arts_centre')
  ) {
    return { kind: 'event', checkInKinds: [...EVENT_KINDS] }
  }
  return { kind: 'place', checkInKinds: [...ROUTE_KINDS] }
}

function shortLabel(displayName: string): string {
  const parts = displayName.split(',').map((p) => p.trim())
  if (parts.length <= 2) return displayName
  return parts.slice(1, 4).join(' · ')
}

export function mapHitToPlace(hit: MapPlaceHit): PlaceMeta {
  return {
    id: hit.id,
    name: hit.name,
    locationLabel: hit.locationLabel,
    kind: hit.kind,
    checkInKinds: hit.checkInKinds,
    presence: 'geo',
    lat: hit.lat,
    lng: hit.lng,
    radiusM: 250,
  }
}

export async function searchMapPlaces(query: string): Promise<MapPlaceHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '6')
  url.searchParams.set('q', q)

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error('maps_search_failed')

  const data = (await res.json()) as NominatimItem[]
  return data.map((item) => {
    const { kind, checkInKinds } = classify(item)
    const name =
      item.name ||
      item.address?.amenity ||
      item.address?.tourism ||
      item.address?.leisure ||
      item.display_name.split(',')[0]?.trim() ||
      'Place'
    const osmKey = item.osm_type && item.osm_id
      ? `${item.osm_type}-${item.osm_id}`
      : String(item.place_id)
    return {
      id: `map-${osmKey}`,
      name,
      locationLabel: shortLabel(item.display_name),
      lat: Number(item.lat),
      lng: Number(item.lon),
      kind,
      checkInKinds,
      osmId: osmKey,
    }
  })
}
