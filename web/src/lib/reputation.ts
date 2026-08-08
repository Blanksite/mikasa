import type { Activity, CheckInKind } from './storage'

/** Location engagement → reputation (finalized for Blitz). */
export const REP = {
  checkin: 5,
  completeActivity: 10,
  joinEvent: 15,
  submitProposal: 10,
  fundProposal: 5,
  verifyProject: 5,
  executeProject: 50,
  /** Join/found location — bootstrap to Member tier */
  joinLocation: 100,
} as const

export const TIER_THRESHOLDS = [
  { id: 0, name: 'Visitor', min: 0, max: 99, can: 'Participate' },
  { id: 1, name: 'Member', min: 100, max: 299, can: 'Submit small proposals, vote' },
  {
    id: 2,
    name: 'Contributor',
    min: 300,
    max: 699,
    can: 'Larger proposals, funding',
  },
  {
    id: 3,
    name: 'Steward',
    min: 700,
    max: 1499,
    can: 'Manage community projects',
  },
  {
    id: 4,
    name: 'Guardian',
    min: 1500,
    max: null as number | null,
    can: 'Higher-value governance and approvals',
  },
] as const

export type EngagementKind =
  | 'checkin'
  | 'completeActivity'
  | 'joinEvent'
  | 'submitProposal'
  | 'fundProposal'
  | 'verifyProject'
  | 'executeProject'
  | 'joinLocation'

export function tierFromReputation(rep: number) {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (rep >= TIER_THRESHOLDS[i].min) return TIER_THRESHOLDS[i]
  }
  return TIER_THRESHOLDS[0]
}

export function nextTier(rep: number) {
  const current = tierFromReputation(rep)
  const idx = TIER_THRESHOLDS.findIndex((t) => t.id === current.id)
  if (idx < 0 || idx >= TIER_THRESHOLDS.length - 1) return null
  return TIER_THRESHOLDS[idx + 1]
}

/** Map check-in activity → engagement points */
export function pointsForCheckInKind(kind?: CheckInKind): number {
  if (!kind) return REP.checkin
  if (kind === 'attend' || kind === 'host') return REP.joinEvent
  if (kind === 'visit') return REP.checkin
  // run, walk, work, code, study, hangout, volunteer = complete activity
  return REP.completeActivity
}

export function engagementKindForCheckIn(kind?: CheckInKind): EngagementKind {
  if (!kind) return 'checkin'
  if (kind === 'attend' || kind === 'host') return 'joinEvent'
  if (kind === 'visit') return 'checkin'
  return 'completeActivity'
}

/** On-chain checkIn(kind) encoding — must match MikasaLocation */
export function checkInKindToUint(kind: CheckInKind): number {
  if (kind === 'attend' || kind === 'host') return 2 // +15 event
  if (kind === 'visit') return 0 // +5 check-in
  return 1 // +10 complete activity
}

export function pointsForActivity(a: Activity): number {
  switch (a.type) {
    case 'checkin':
      return pointsForCheckInKind(a.checkInKind)
    case 'donation':
      return REP.fundProposal
    case 'proposal_submit':
      return REP.submitProposal
    case 'proposal_execute':
      return REP.executeProject
    default:
      return 0
  }
}

export function engagementLabel(kind: EngagementKind): string {
  switch (kind) {
    case 'checkin':
      return 'Check-in'
    case 'completeActivity':
      return 'Complete activity'
    case 'joinEvent':
      return 'Join community event'
    case 'submitProposal':
      return 'Submit proposal'
    case 'fundProposal':
      return 'Fund a proposal'
    case 'verifyProject':
      return 'Verify project'
    case 'executeProject':
      return 'Execute project'
    case 'joinLocation':
      return 'Join / found location'
  }
}

export function formatRepDelta(points: number): string {
  return points > 0 ? `+${points}` : `${points}`
}

/** Soft local score from activity history (GPS/photos stay off-chain). */
export function estimateReputationFromActivities(
  activities: Activity[],
  actor?: string,
): number {
  const mine = actor
    ? activities.filter((a) => a.actor.toLowerCase() === actor.toLowerCase())
    : activities
  return mine.reduce((sum, a) => sum + pointsForActivity(a), 0)
}
