export type CheckInKind =
  | 'visit'
  | 'run'
  | 'walk'
  | 'work'
  | 'code'
  | 'study'
  | 'hangout'
  | 'attend'
  | 'volunteer'
  | 'host'

export type ActivityType = 'donation' | 'checkin' | 'proposal_submit' | 'proposal_execute'

export type Activity = {
  id: string
  type: ActivityType
  placeId: string
  placeName: string
  actor: string
  actorName?: string
  amountMon?: string
  checkInKind?: CheckInKind
  proposalTitle?: string
  photoDataUrl?: string
  createdAt: number
  /** Device GPS was within place radius (live only) */
  geoVerified?: boolean
  distanceM?: number
  accuracyM?: number
  geoMode?: 'live' | 'demo' | 'self'
}

export type SpaceKind = 'place' | 'project' | 'cause' | 'event'

export type PlacePresence = 'geo' | 'self'

export type PlaceMeta = {
  id: string
  name: string
  locationLabel: string
  kind: SpaceKind
  /** Activity choices for check-in — should match what people actually do here */
  checkInKinds?: CheckInKind[]
  /** geo = must be near pin; self = desk/home style, no GPS gate */
  presence?: PlacePresence
  lat?: number
  lng?: number
  radiusM?: number
  thumbDataUrl?: string
  onChainPlaceId?: string
  /** MikasaLocation id on Monad */
  onChainLocationId?: string
}

const ROUTE_KINDS: CheckInKind[] = ['visit', 'run', 'walk']
const SPOT_KINDS: CheckInKind[] = ['visit', 'work', 'code', 'study', 'hangout']
const EVENT_KINDS: CheckInKind[] = ['attend', 'volunteer', 'host']

export function getCheckInKinds(place: PlaceMeta): CheckInKind[] {
  if (place.checkInKinds?.length) return place.checkInKinds
  if (place.kind === 'event') return EVENT_KINDS
  return ROUTE_KINDS
}

export type Profile = {
  name: string
  photoDataUrl?: string
}

export type ProposalMilestone = {
  id: number
  title: string
  bps: number
  status: 'pending' | 'proven' | 'released'
}

export type LocalProposal = {
  id: string
  placeId: string
  title: string
  description: string
  goalMon: string
  raisedMon: string
  status: 'ongoing' | 'funded' | 'completed'
  creator: string
  votes: string[]
  /** Unix ms — voting closes after this */
  votingDeadline?: number
  milestones?: ProposalMilestone[]
  onChainProposalId?: string
}

export const DEFAULT_PROPOSAL_MILESTONES: ProposalMilestone[] = [
  { id: 0, title: 'Materials / setup', bps: 3000, status: 'pending' },
  { id: 1, title: 'Build / install', bps: 4000, status: 'pending' },
  { id: 2, title: 'Community inspection', bps: 3000, status: 'pending' },
]

export function normalizeProposal(p: LocalProposal): LocalProposal {
  return {
    ...p,
    votingDeadline:
      p.votingDeadline || Date.now() + 1000 * 60 * 60 * 24 * 3,
    milestones:
      p.milestones?.length
        ? p.milestones
        : DEFAULT_PROPOSAL_MILESTONES.map((m) => ({ ...m })),
  }
}

const profileKey = (addr: string) => `mikasa:profile:${addr.toLowerCase()}`
const activitiesKey = 'mikasa:activities'
const placesKey = 'mikasa:places'
const proposalsKey = 'mikasa:proposals'

const DEMO_PEERS = [
  {
    address: '0x1111111111111111111111111111111111111111',
    name: 'Alya',
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    name: 'Bima',
  },
  {
    address: '0x3333333333333333333333333333333333333333',
    name: 'Citra',
  },
] as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Retry without bulky photos if storage is full
    if (key === activitiesKey && Array.isArray(value)) {
      const slim = (value as Activity[]).map((a, i) =>
        i < 8 ? a : { ...a, photoDataUrl: undefined },
      )
      localStorage.setItem(key, JSON.stringify(slim))
      return
    }
    throw new Error('Storage full — try a smaller photo.')
  }
}

export function loadProfile(addr: string): Profile {
  return readJson(profileKey(addr), { name: `nad ${addr.slice(2, 6)}` })
}

export function saveProfile(addr: string, profile: Profile) {
  writeJson(profileKey(addr), profile)
}

function seedPeerActivities(): Activity[] {
  const now = Date.now()
  return [
    {
      id: 'seed-act-1',
      type: 'checkin',
      placeId: 'place-bogor',
      placeName: 'Lingkar Kebun Raya Bogor',
      actor: DEMO_PEERS[0].address,
      actorName: DEMO_PEERS[0].name,
      checkInKind: 'run',
      createdAt: now - 1000 * 60 * 35,
    },
    {
      id: 'seed-act-2',
      type: 'donation',
      placeId: 'project-indie-game',
      placeName: 'Nusa Quest',
      actor: DEMO_PEERS[1].address,
      actorName: DEMO_PEERS[1].name,
      amountMon: '0.25',
      createdAt: now - 1000 * 60 * 90,
    },
    {
      id: 'seed-act-3',
      type: 'proposal_submit',
      placeId: 'place-bogor',
      placeName: 'Lingkar Kebun Raya Bogor',
      actor: DEMO_PEERS[2].address,
      actorName: DEMO_PEERS[2].name,
      proposalTitle: 'Water station near gate 2',
      createdAt: now - 1000 * 60 * 180,
    },
    {
      id: 'seed-act-4',
      type: 'donation',
      placeId: 'place-bogor',
      placeName: 'Lingkar Kebun Raya Bogor',
      actor: DEMO_PEERS[0].address,
      actorName: DEMO_PEERS[0].name,
      amountMon: '0.05',
      createdAt: now - 1000 * 60 * 240,
    },
    {
      id: 'seed-act-5',
      type: 'checkin',
      placeId: 'place-bogor',
      placeName: 'Lingkar Kebun Raya Bogor',
      actor: DEMO_PEERS[1].address,
      actorName: DEMO_PEERS[1].name,
      checkInKind: 'walk',
      createdAt: now - 1000 * 60 * 400,
    },
  ]
}

function seedPeerProposals(): LocalProposal[] {
  const now = Date.now()
  const day = 1000 * 60 * 60 * 24
  return [
    {
      id: 'seed-prop-paths',
      placeId: 'place-bogor',
      title: 'Improve running paths',
      description:
        'Repair uneven sections along the loop and mark safer lanes for morning runners.',
      goalMon: '2.5',
      raisedMon: '0.6',
      status: 'ongoing',
      creator: DEMO_PEERS[0].address,
      votes: [DEMO_PEERS[1].address.toLowerCase()],
      votingDeadline: now + day * 5,
      milestones: [
        { id: 0, title: 'Survey & materials', bps: 3000, status: 'pending' },
        { id: 1, title: 'Path repair', bps: 4000, status: 'pending' },
        { id: 2, title: 'Community walk-through', bps: 3000, status: 'pending' },
      ],
    },
    {
      id: 'seed-prop-lighting',
      placeId: 'place-bogor',
      title: 'Install lighting',
      description: 'Add warm path lights on darker stretches for evening runs.',
      goalMon: '3.2',
      raisedMon: '0.15',
      status: 'ongoing',
      creator: DEMO_PEERS[1].address,
      votes: [],
      votingDeadline: now + day * 7,
      milestones: DEFAULT_PROPOSAL_MILESTONES.map((m) => ({ ...m })),
    },
    {
      id: 'seed-prop-bins',
      placeId: 'place-bogor',
      title: 'Add trash bins',
      description: 'Place bins near rest spots so the loop stays clean after peak hours.',
      goalMon: '0.8',
      raisedMon: '0.2',
      status: 'ongoing',
      creator: DEMO_PEERS[2].address,
      votes: [DEMO_PEERS[0].address.toLowerCase()],
      votingDeadline: now + day * 4,
      milestones: DEFAULT_PROPOSAL_MILESTONES.map((m) => ({ ...m })),
    },
    {
      id: 'seed-prop-water',
      placeId: 'place-bogor',
      title: 'Add water stations',
      description: 'A small refill point near gate 2 for morning runners.',
      goalMon: '1.5',
      raisedMon: '0.4',
      status: 'ongoing',
      creator: DEMO_PEERS[2].address,
      votes: [DEMO_PEERS[0].address.toLowerCase()],
      votingDeadline: now + day * 6,
      milestones: DEFAULT_PROPOSAL_MILESTONES.map((m) => ({ ...m })),
    },
    {
      id: 'seed-prop-run-event',
      placeId: 'place-bogor',
      title: 'Organize running events',
      description: 'Weekly community 5K meetups with volunteer marshals.',
      goalMon: '1.0',
      raisedMon: '0.1',
      status: 'ongoing',
      creator: DEMO_PEERS[0].address,
      votes: [],
      votingDeadline: now + day * 10,
      milestones: DEFAULT_PROPOSAL_MILESTONES.map((m) => ({ ...m })),
    },
    {
      id: 'seed-prop-community',
      placeId: 'place-bogor',
      title: 'Organize community activities',
      description:
        'Weekend clean-ups, stretching circles, and neighbor meetups around the loop.',
      goalMon: '0.6',
      raisedMon: '0.05',
      status: 'ongoing',
      creator: DEMO_PEERS[1].address,
      votes: [],
      votingDeadline: now + day * 9,
      milestones: DEFAULT_PROPOSAL_MILESTONES.map((m) => ({ ...m })),
    },
    {
      id: 'seed-prop-2',
      placeId: 'project-indie-game',
      title: 'Pixel art village pack',
      description: 'Fund a community art pack for Nusa Quest.',
      goalMon: '3',
      raisedMon: '0.25',
      status: 'ongoing',
      creator: DEMO_PEERS[1].address,
      votes: [],
      votingDeadline: now + day * 8,
      milestones: DEFAULT_PROPOSAL_MILESTONES.map((m) => ({ ...m })),
    },
  ]
}

export function ensureDemoProfiles() {
  for (const peer of DEMO_PEERS) {
    const key = profileKey(peer.address)
    if (!localStorage.getItem(key)) {
      writeJson(key, { name: peer.name } satisfies Profile)
    }
  }
}

export function loadActivities(): Activity[] {
  ensureDemoProfiles()
  const seededFlag = localStorage.getItem('mikasa:demo-seeded')
  const existing = readJson<Activity[]>(activitiesKey, [])
  if (seededFlag === '1') return existing
  const seeded = seedPeerActivities()
  // Keep any real user activities that somehow existed
  const merged = [...existing, ...seeded]
  writeJson(activitiesKey, merged)
  localStorage.setItem('mikasa:demo-seeded', '1')
  return merged
}

export function addActivity(activity: Activity) {
  const all = loadActivities()
  all.unshift(activity)
  writeJson(activitiesKey, all)
  return all
}

export function loadPlaces(): PlaceMeta[] {
  const stored = readJson<PlaceMeta[]>(placesKey, [])
  const places = stored.map((space) => enrichPlace(space))
  if (places.length) {
    let dirty = false
    if (!places.some((space) => space.id === 'project-indie-game')) {
      places.push({
        id: 'project-indie-game',
        name: 'Nusa Quest',
        locationLabel: 'Indie game · Community-funded',
        kind: 'project',
      })
      dirty = true
    }
    if (!places.some((space) => space.id === 'place-home-desk')) {
      places.push(homeDeskPlace())
      dirty = true
    }
    // Persist geo metadata onto existing Bogor / home entries
    for (let i = 0; i < places.length; i++) {
      const before = JSON.stringify(places[i])
      places[i] = enrichPlace(places[i])
      if (JSON.stringify(places[i]) !== before) dirty = true
    }
    if (dirty) writeJson(placesKey, places)
    return places
  }
  const seed: PlaceMeta[] = [
    bogorPlace(),
    homeDeskPlace(),
    {
      id: 'project-indie-game',
      name: 'Nusa Quest',
      locationLabel: 'Indie game · Community-funded',
      kind: 'project',
    },
  ]
  writeJson(placesKey, seed)
  return seed
}

function bogorPlace(): PlaceMeta {
  return {
    id: 'place-bogor',
    name: 'Lingkar Kebun Raya Bogor',
    locationLabel: 'Bogor · Running and walking route',
    kind: 'place',
    checkInKinds: [...ROUTE_KINDS],
    presence: 'geo',
    // Approximate pin near Kebun Raya Bogor main area
    lat: -6.5976,
    lng: 106.7996,
    radiusM: 250,
  }
}

function homeDeskPlace(): PlaceMeta {
  return {
    id: 'place-home-desk',
    name: 'Meja Rumah',
    locationLabel: 'Home · Desk and deep work',
    kind: 'place',
    checkInKinds: [...SPOT_KINDS],
    presence: 'self',
  }
}

function enrichPlace(space: PlaceMeta): PlaceMeta {
  const next: PlaceMeta = {
    ...space,
    kind: space.kind || ('place' as const),
  }
  if (space.id === 'place-bogor') {
    const seed = bogorPlace()
    next.locationLabel = seed.locationLabel
    next.checkInKinds = next.checkInKinds?.length ? next.checkInKinds : seed.checkInKinds
    next.presence = 'geo'
    next.lat = next.lat ?? seed.lat
    next.lng = next.lng ?? seed.lng
    next.radiusM = next.radiusM ?? seed.radiusM
  }
  if (space.id === 'place-home-desk') {
    const seed = homeDeskPlace()
    next.locationLabel = seed.locationLabel
    next.checkInKinds = next.checkInKinds?.length ? next.checkInKinds : seed.checkInKinds
    next.presence = 'self'
  }
  if (!next.presence) {
    next.presence = next.kind === 'event' || next.kind === 'place' ? 'geo' : 'self'
  }
  return next
}

export function savePlaces(places: PlaceMeta[]) {
  writeJson(placesKey, places)
}

export function upsertPlace(place: PlaceMeta) {
  const places = loadPlaces()
  const i = places.findIndex((p) => p.id === place.id)
  if (i >= 0) places[i] = place
  else places.push(place)
  savePlaces(places)
  return places
}

export function loadProposals(): LocalProposal[] {
  ensureDemoProfiles()
  const seededFlag = localStorage.getItem('mikasa:demo-proposals-seeded')
  const communityFlag = localStorage.getItem('mikasa:community-proposals-v3')
  let existing = readJson<LocalProposal[]>(proposalsKey, []).map(normalizeProposal)

  if (seededFlag !== '1') {
    const seeded = seedPeerProposals()
    existing = [...existing, ...seeded].map(normalizeProposal)
    writeJson(proposalsKey, existing)
    localStorage.setItem('mikasa:demo-proposals-seeded', '1')
    localStorage.setItem('mikasa:community-proposals-v3', '1')
    return existing
  }

  // Upgrade older seeds with community proposal examples once
  if (communityFlag !== '1') {
    const seeded = seedPeerProposals()
    const byId = new Map(existing.map((p) => [p.id, p]))
    for (const p of seeded) {
      if (!byId.has(p.id)) byId.set(p.id, p)
    }
    existing = [...byId.values()].map(normalizeProposal)
    writeJson(proposalsKey, existing)
    localStorage.setItem('mikasa:community-proposals-v3', '1')
  }

  return existing
}

export function saveProposals(proposals: LocalProposal[]) {
  writeJson(proposalsKey, proposals)
}

export function upsertProposal(proposal: LocalProposal) {
  const list = loadProposals()
  const normalized = normalizeProposal(proposal)
  const i = list.findIndex((p) => p.id === normalized.id)
  if (i >= 0) list[i] = normalized
  else list.unshift(normalized)
  saveProposals(list)
  return list
}

export function summarizeActivities(list: Activity[]) {
  const donations = list.filter((a) => a.type === 'donation')
  const checkins = list.filter((a) => a.type === 'checkin')
  const submits = list.filter((a) => a.type === 'proposal_submit')
  const executes = list.filter((a) => a.type === 'proposal_execute')
  const donated = donations.reduce((s, a) => s + Number(a.amountMon || 0), 0)
  return {
    donationCount: donations.length,
    donatedMon: donated,
    checkins: checkins.length,
    submits: submits.length,
    executes: executes.length,
  }
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
