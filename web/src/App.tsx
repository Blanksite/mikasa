import { useEffect, useMemo, useRef, useState } from 'react'
import { parseEther } from 'viem'
import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
  useSwitchChain,
} from 'wagmi'
import {
  communityPlaceAbi,
  mikasaLocationAbi,
  mikasaMembershipAbi,
  mikasaProposalAbi,
  mikasaTreasuryAbi,
} from './abi'
import {
  CONTRACT_ADDRESS,
  LOCATION_ADDRESS,
  MEMBERSHIP_ADDRESS,
  PROPOSAL_ADDRESS,
  TREASURY_ADDRESS,
  TIER_LABEL,
  explorerAddressUrl,
  explorerTxUrl,
  hasMikasa,
} from './config'
import { useI18n, type CopyKey } from './i18n'
import {
  GEO_DEMO,
  evaluatePresence,
  mapsUrl,
  readDevicePosition,
  type GeoCheckResult,
} from './lib/geo'
import {
  checkInKindToUint,
  latLngToE6,
  stubCidFromPhoto,
} from './lib/mikasa'
import {
  REP,
  TIER_THRESHOLDS,
  engagementKindForCheckIn,
  engagementLabel,
  estimateReputationFromActivities,
  formatRepDelta,
  nextTier,
  pointsForActivity,
  pointsForCheckInKind,
  tierFromReputation,
} from './lib/reputation'
import {
  mapHitToPlace,
  searchMapPlaces,
  type MapPlaceHit,
} from './lib/mapsSearch'
import {
  type Activity,
  type CheckInKind,
  type LocalProposal,
  type PlaceMeta,
  type Profile,
  addActivity,
  ensureDemoProfiles,
  getCheckInKinds,
  loadActivities,
  loadPlaces,
  loadProfile,
  loadProposals,
  saveProfile,
  shortAddr,
  summarizeActivities,
  uid,
  upsertPlace,
  upsertProposal,
  DEFAULT_PROPOSAL_MILESTONES,
  normalizeProposal,
} from './lib/storage'

type View =
  | { name: 'feed' }
  | { name: 'profile' }
  | { name: 'otherProfile'; address: string }
  | { name: 'location'; placeId: string }
  | { name: 'proposalDetail'; proposalId: string }
  | { name: 'editProfile' }
  | { name: 'checkin' }
  | { name: 'donate' }
  | { name: 'proposal' }

type ProfileTab = 'activities' | 'locations' | 'proposals'
type LocationTab = 'activities' | 'proposals'

const hasContract = Boolean(CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith('0x'))

function fileToDataUrl(file: File, maxEdge = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const raw = String(reader.result)
      const img = new Image()
      img.onerror = () => resolve(raw)
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(raw)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = raw
    }
    reader.readAsDataURL(file)
  })
}

function openActor(
  actor: string,
  self: string,
  setView: (view: View) => void,
) {
  if (actor.toLowerCase() === self.toLowerCase()) {
    setView({ name: 'profile' })
    return
  }
  setView({ name: 'otherProfile', address: actor })
}

function App() {
  const { t } = useI18n()
  const { address, isConnected, chainId } = useAccount()
  const connectors = useConnectors()
  const { connect, isPending: connecting, error: connectError, reset: resetConnect } =
    useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: switchingChain } = useSwitchChain()
  const { writeContract, writeContractAsync, data: txHash, isPending, error: writeError, reset } =
    useWriteContract()
  const { isSuccess, isLoading: txConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  })
  const publicClient = usePublicClient()

  const { data: memberData, refetch: refetchMember } = useReadContract({
    address: hasMikasa ? MEMBERSHIP_ADDRESS : undefined,
    abi: mikasaMembershipAbi,
    functionName: 'getMember',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(hasMikasa && address) },
  })

  const [view, setView] = useState<View>({ name: 'feed' })
  const [profileTab, setProfileTab] = useState<ProfileTab>('activities')
  const [locationTab, setLocationTab] = useState<LocationTab>('activities')
  const [otherTab, setOtherTab] = useState<ProfileTab>('activities')
  const [profile, setProfile] = useState<Profile>({ name: '' })
  const [activities, setActivities] = useState<Activity[]>([])
  const [places, setPlaces] = useState<PlaceMeta[]>([])
  const [proposals, setProposals] = useState<LocalProposal[]>([])
  const [tick, setTick] = useState(0)
  const [recentTxs, setRecentTxs] = useState<string[]>([])
  const [lastLatencySec, setLastLatencySec] = useState<number | null>(null)
  const [boost, setBoost] = useState<{
    running: boolean
    done: number
    total: number
    avgSec: number | null
    hashes: string[]
  }>({ running: false, done: 0, total: 5, avgSec: null, hashes: [] })
  const txStartedAt = useRef<number | null>(null)

  const refreshLocal = () => {
    ensureDemoProfiles()
    setActivities(loadActivities())
    setPlaces(loadPlaces())
    setProposals(loadProposals())
    setTick((t) => t + 1)
  }

  useEffect(() => {
    if (!address) return
    setProfile(loadProfile(address))
    setView({ name: 'feed' })
    refreshLocal()
  }, [address])

  useEffect(() => {
    if (!txHash) return
    if (!txStartedAt.current) txStartedAt.current = Date.now()
    setRecentTxs((prev) => [txHash, ...prev.filter((h) => h !== txHash)].slice(0, 8))
  }, [txHash])

  useEffect(() => {
    if (!isSuccess) return
    if (txStartedAt.current) {
      setLastLatencySec((Date.now() - txStartedAt.current) / 1000)
      txStartedAt.current = null
    }
    refreshLocal()
    void refetchMember()
    reset()
  }, [isSuccess, reset, refetchMember])

  const runMicroBoost = async (locationId: string) => {
    if (!hasMikasa || !publicClient || !/^\d+$/.test(locationId) || boost.running) return
    const total = 5
    const amount = parseEther('0.001')
    const hashes: string[] = []
    const times: number[] = []
    setBoost({ running: true, done: 0, total, avgSec: null, hashes: [] })
    try {
      for (let i = 0; i < total; i++) {
        const t0 = Date.now()
        const hash = await writeContractAsync({
          address: TREASURY_ADDRESS,
          abi: mikasaTreasuryAbi,
          functionName: 'deposit',
          args: [BigInt(locationId)],
          value: amount,
        })
        await publicClient.waitForTransactionReceipt({ hash })
        times.push((Date.now() - t0) / 1000)
        hashes.push(hash)
        setRecentTxs((prev) => [hash, ...prev.filter((h) => h !== hash)].slice(0, 8))
        setBoost({
          running: true,
          done: i + 1,
          total,
          avgSec: times.reduce((a, b) => a + b, 0) / times.length,
          hashes: [...hashes],
        })
      }
      setLastLatencySec(times.reduce((a, b) => a + b, 0) / times.length)
      void refetchMember()
      refreshLocal()
    } finally {
      setBoost((b) => ({ ...b, running: false }))
    }
  }

  const chainMember = memberData
    ? {
        registered: Boolean(memberData[0]),
        reputation: Number(memberData[1]),
        contributionCount: Number(memberData[2]),
        tier: Number(memberData[4]),
        power: Number(memberData[5]),
      }
    : null

  const myActivities = useMemo(() => {
    if (!address) return []
    return activities.filter((a) => a.actor.toLowerCase() === address.toLowerCase())
  }, [activities, address, tick])

  const myPlaceIds = useMemo(() => {
    const ids = new Set(myActivities.map((a) => a.placeId))
    return [...ids]
  }, [myActivities])

  const summary = useMemo(() => summarizeActivities(myActivities), [myActivities])

  const wrongChain = isConnected && chainId !== 10143
  const showDock =
    view.name === 'feed' ||
    view.name === 'profile' ||
    view.name === 'location' ||
    view.name === 'otherProfile'

  const walletOptions = useMemo(() => {
    // Prefer EIP-6963 wallets (MetaMask, Rabby, …) over generic window.ethereum
    const announced = connectors.filter((c) => c.id !== 'injected')
    if (announced.length > 0) return announced
    return connectors.filter((c) => c.type === 'injected')
  }, [connectors])

  if (!isConnected || !address) {
    return (
      <div className="shell login">
        <div className="login-mark">
          <span className="edition">{t('communityEdition')}</span>
          <img className="login-logo" src="/mikasa-logo.png" alt="Mikasa cat mascot" />
        </div>
        <div className="login-copy">
          <p className="kicker">{t('communityOwned')}</p>
          <h1>Mikasa.</h1>
          <p className="lede">{t('hero')}</p>
          <div className="wallet-list">
            {walletOptions.length === 0 && (
              <p className="hint">{t('noWalletFound')}</p>
            )}
            {walletOptions.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                className="primary login-cta"
                disabled={connecting}
                onClick={() => {
                  resetConnect()
                  connect({ connector, chainId: 10143 })
                }}
              >
                {connector.icon ? (
                  <img className="wallet-icon" src={connector.icon} alt="" />
                ) : null}
                <span>
                  {connecting
                    ? t('connecting')
                    : `${t('enterWallet')} · ${connector.name}`}
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          {connectError && (
            <p className="warn">
              {connectError.shortMessage || connectError.message}
            </p>
          )}
          <p className="hint">{t('walletOnly')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <header className="topbar">
        <button type="button" className="brand-btn" onClick={() => setView({ name: 'feed' })}>
          <img src="/mikasa-logo.png" alt="" className="top-logo" />
          <span>Mikasa.</span>
        </button>
        <div className="top-actions">
          {!wrongChain && (
            <span className="monad-pill" title="Chain ID 10143">
              {t('onMonad')}
            </span>
          )}
          <button
            type="button"
            className="profile-chip"
            onClick={() => setView({ name: 'profile' })}
          >
            <img src={profile.photoDataUrl || '/mikasa-logo.png'} alt="" />
            <span>{profile.name || shortAddr(address)}</span>
          </button>
          <button type="button" className="ghost" onClick={() => disconnect()}>
            {t('out')}
          </button>
        </div>
      </header>

      {wrongChain && (
        <p className="warn">
          {t('switchNetwork')}{' '}
          <button
            type="button"
            className="ghost small"
            disabled={switchingChain}
            onClick={() => switchChain({ chainId: 10143 })}
          >
            {switchingChain ? t('pending') : t('switchToMonad')}
          </button>
        </p>
      )}

      {(isPending || txConfirming || (txHash && isSuccess) || lastLatencySec != null) && (
        <p className="tx-bar" role="status">
          {boost.running
            ? `${t('microBoostProgress')} ${boost.done}/${boost.total}`
            : isPending || txConfirming
              ? t('txPending')
              : t('txConfirmed')}
          {lastLatencySec != null && !boost.running && (
            <> · {t('confirmedIn')} {lastLatencySec.toFixed(2)}s</>
          )}
          {boost.avgSec != null && boost.running && (
            <> · avg {boost.avgSec.toFixed(2)}s</>
          )}
          {txHash && (
            <>
              {' '}
              <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer">
                {t('viewOnMonadVision')} ↗
              </a>
            </>
          )}
        </p>
      )}

      {view.name === 'feed' && (
        <FeedScreen
          activities={activities}
          selfAddress={address}
          chainMember={chainMember}
          onOpenActor={(actor) => {
            setOtherTab('activities')
            openActor(actor, address, setView)
          }}
          onOpenPlace={(placeId) => {
            setLocationTab('activities')
            setView({ name: 'location', placeId })
          }}
        />
      )}

      {view.name === 'profile' && (
        <ProfileScreen
          profile={profile}
          summary={summary}
          chainMember={chainMember}
          mikasaReady={hasMikasa}
          wrongChain={wrongChain}
          registering={isPending}
          recentTxs={recentTxs}
          address={address}
          onRegister={() => {
            if (!hasMikasa) return
            writeContract({
              address: MEMBERSHIP_ADDRESS,
              abi: mikasaMembershipAbi,
              functionName: 'register',
            })
          }}
          tab={profileTab}
          setTab={setProfileTab}
          activities={myActivities}
          places={places.filter((p) => myPlaceIds.includes(p.id) || myPlaceIds.length === 0)}
          allPlaces={places}
          myActivities={myActivities}
          myProposals={proposals.filter(
            (p) => p.creator.toLowerCase() === address.toLowerCase(),
          )}
          onEdit={() => setView({ name: 'editProfile' })}
          onOpenPlace={(placeId) => {
            setLocationTab('activities')
            setView({ name: 'location', placeId })
          }}
          onOpenProposal={(proposalId) => {
            setView({ name: 'proposalDetail', proposalId })
          }}
        />
      )}

      {view.name === 'otherProfile' && (
        <OtherProfileScreen
          address={view.address}
          activities={activities.filter(
            (a) => a.actor.toLowerCase() === view.address.toLowerCase(),
          )}
          places={places}
          proposals={proposals.filter(
            (p) => p.creator.toLowerCase() === view.address.toLowerCase(),
          )}
          tab={otherTab}
          setTab={setOtherTab}
          onBack={() => setView({ name: 'feed' })}
          onOpenPlace={(placeId) => {
            setLocationTab('activities')
            setView({ name: 'location', placeId })
          }}
          onOpenProposal={(proposalId) => {
            setView({ name: 'proposalDetail', proposalId })
          }}
        />
      )}

      {view.name === 'location' && (
        <LocationScreen
          place={places.find((p) => p.id === view.placeId)}
          activities={activities.filter((a) => a.placeId === view.placeId)}
          proposals={proposals.filter((p) => p.placeId === view.placeId)}
          tab={locationTab}
          setTab={setLocationTab}
          mikasaReady={hasMikasa}
          busy={isPending || boost.running}
          boost={boost}
          onMicroBoost={() => {
            const place = places.find((p) => p.id === view.placeId)
            if (place?.onChainLocationId) void runMicroBoost(place.onChainLocationId)
          }}
          onBack={() => setView({ name: 'feed' })}
          onOpenActor={(actor) => {
            setOtherTab('activities')
            openActor(actor, address, setView)
          }}
          onOpenProposal={(proposalId) => {
            setView({ name: 'proposalDetail', proposalId })
          }}
          onAnchorOnChain={async (place) => {
            if (!hasMikasa || !publicClient || place.lat == null || place.lng == null) return
            const { latE6, lngE6 } = latLngToE6(place.lat, place.lng)
            const hash = await writeContractAsync({
              address: LOCATION_ADDRESS,
              abi: mikasaLocationAbi,
              functionName: 'createLocation',
              args: [place.name, place.locationLabel, latE6, lngE6],
            })
            await publicClient.waitForTransactionReceipt({ hash })
            const count = await publicClient.readContract({
              address: LOCATION_ADDRESS,
              abi: mikasaLocationAbi,
              functionName: 'locationCount',
            })
            setPlaces(
              upsertPlace({
                ...place,
                onChainLocationId: String(count),
              }),
            )
            setRecentTxs((prev) => [hash, ...prev.filter((h) => h !== hash)].slice(0, 8))
            void refetchMember()
          }}
        />
      )}

      {view.name === 'proposalDetail' && (
        <ProposalDetailScreen
          proposal={normalizeProposal(
            proposals.find((p) => p.id === view.proposalId) || {
              id: view.proposalId,
              placeId: '',
              title: '',
              description: '',
              goalMon: '0',
              raisedMon: '0',
              status: 'ongoing',
              creator: '',
              votes: [],
            },
          )}
          place={places.find(
            (p) =>
              p.id ===
              proposals.find((x) => x.id === view.proposalId)?.placeId,
          )}
          address={address}
          mikasaReady={hasMikasa}
          busy={isPending}
          onBack={() => {
            const placeId = proposals.find((p) => p.id === view.proposalId)?.placeId
            if (placeId) {
              setLocationTab('proposals')
              setView({ name: 'location', placeId })
              return
            }
            setView({ name: 'feed' })
          }}
          onOpenActor={(actor) => {
            setOtherTab('activities')
            openActor(actor, address, setView)
          }}
          onVote={(proposal) => {
            if (proposal.votes.includes(address.toLowerCase())) return
            const next = {
              ...proposal,
              votes: [...proposal.votes, address.toLowerCase()],
            }
            setProposals(upsertProposal(next))
            if (hasMikasa && proposal.onChainProposalId) {
              writeContract({
                address: PROPOSAL_ADDRESS,
                abi: mikasaProposalAbi,
                functionName: 'vote',
                args: [BigInt(proposal.onChainProposalId), true],
              })
            }
          }}
          onCloseVoting={(proposal) => {
            if (!hasMikasa || !proposal.onChainProposalId) return
            writeContract({
              address: PROPOSAL_ADDRESS,
              abi: mikasaProposalAbi,
              functionName: 'closeVoting',
              args: [BigInt(proposal.onChainProposalId)],
            })
          }}
          onSubmitProof={(proposal, milestoneId) => {
            if (!hasMikasa || !proposal.onChainProposalId) return
            writeContract({
              address: PROPOSAL_ADDRESS,
              abi: mikasaProposalAbi,
              functionName: 'submitProof',
              args: [
                BigInt(proposal.onChainProposalId),
                BigInt(milestoneId),
                stubCidFromPhoto(),
              ],
            })
          }}
          onVerifyMilestone={(proposal, milestoneId) => {
            if (!hasMikasa || !proposal.onChainProposalId) return
            writeContract({
              address: PROPOSAL_ADDRESS,
              abi: mikasaProposalAbi,
              functionName: 'verifyMilestone',
              args: [BigInt(proposal.onChainProposalId), BigInt(milestoneId)],
            })
          }}
        />
      )}

      {view.name === 'editProfile' && (
        <EditProfileScreen
          profile={profile}
          onCancel={() => setView({ name: 'profile' })}
          onSave={(next) => {
            saveProfile(address, next)
            setProfile(next)
            setView({ name: 'profile' })
          }}
        />
      )}

      {view.name === 'checkin' && (
        <CheckInSheet
          places={places}
          profileName={profile.name}
          address={address}
          onUpsertPlace={(place) => setPlaces(upsertPlace(place))}
          onClose={() => setView({ name: 'feed' })}
          onSubmit={(payload) => {
            const place =
              places.find((p) => p.id === payload.placeId) ||
              loadPlaces().find((p) => p.id === payload.placeId) ||
              ({
                id: payload.placeId,
                name: 'Unknown',
                locationLabel: '',
                kind: 'place',
              } satisfies PlaceMeta)
            const activity: Activity = {
              id: uid('act'),
              type: 'checkin',
              placeId: place.id,
              placeName: place.name,
              actor: address,
              actorName: profile.name,
              checkInKind: payload.kind,
              photoDataUrl: payload.photoDataUrl,
              createdAt: Date.now(),
              geoVerified: payload.geoVerified,
              distanceM: payload.distanceM,
              accuracyM: payload.accuracyM,
              geoMode: payload.geoMode,
            }
            setActivities(addActivity(activity))
            if (payload.photoDataUrl && !place.thumbDataUrl) {
              setPlaces(upsertPlace({ ...place, thumbDataUrl: payload.photoDataUrl }))
            }
            if (
              hasMikasa &&
              place.onChainLocationId &&
              place.onChainLocationId !== 'pending' &&
              /^\d+$/.test(place.onChainLocationId)
            ) {
              writeContract({
                address: LOCATION_ADDRESS,
                abi: mikasaLocationAbi,
                functionName: 'checkIn',
                args: [
                  BigInt(place.onChainLocationId),
                  checkInKindToUint(payload.kind),
                ],
              })
            }
            setView({ name: 'feed' })
          }}
        />
      )}

      {view.name === 'donate' && (
        <DonateSheet
          places={places}
          busy={isPending}
          onUpsertPlace={(place) => setPlaces(upsertPlace(place))}
          onClose={() => setView({ name: 'feed' })}
          onSubmit={(payload) => {
            const place =
              places.find((p) => p.id === payload.placeId) ||
              loadPlaces().find((p) => p.id === payload.placeId)
            if (!place) return
            const activity: Activity = {
              id: uid('act'),
              type: 'donation',
              placeId: place.id,
              placeName: place.name,
              actor: address,
              actorName: profile.name,
              amountMon: payload.amountMon,
              createdAt: Date.now(),
            }
            setActivities(addActivity(activity))

            const linked = proposals.find(
              (p) =>
                p.placeId === place.id &&
                p.onChainProposalId &&
                (p.status === 'ongoing' || p.status === 'funded'),
            )
            if (hasMikasa && linked?.onChainProposalId) {
              writeContract({
                address: PROPOSAL_ADDRESS,
                abi: mikasaProposalAbi,
                functionName: 'contribute',
                args: [BigInt(linked.onChainProposalId)],
                value: parseEther(payload.amountMon),
              })
            } else if (hasContract && linked?.onChainProposalId) {
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: communityPlaceAbi,
                functionName: 'contribute',
                args: [BigInt(linked.onChainProposalId)],
                value: parseEther(payload.amountMon),
              })
            }

            const pot = proposals.find((p) => p.placeId === place.id && p.status === 'ongoing')
            if (pot) {
              const raised = (Number(pot.raisedMon) + Number(payload.amountMon)).toFixed(4)
              setProposals(
                upsertProposal({
                  ...pot,
                  raisedMon: raised,
                  status: Number(raised) >= Number(pot.goalMon) ? 'funded' : 'ongoing',
                }),
              )
            }

            setView({ name: 'feed' })
          }}
        />
      )}

      {view.name === 'proposal' && (
        <ProposalSheet
          places={places}
          busy={isPending}
          onUpsertPlace={(place) => setPlaces(upsertPlace(place))}
          onClose={() => setView({ name: 'feed' })}
          onSubmit={(payload) => {
            const place =
              places.find((p) => p.id === payload.placeId) ||
              loadPlaces().find((p) => p.id === payload.placeId)
            if (!place) return
            const local: LocalProposal = {
              id: uid('prop'),
              placeId: place.id,
              title: payload.title,
              description: payload.description,
              goalMon: payload.goalMon,
              raisedMon: '0',
              status: 'ongoing',
              creator: address,
              votes: [],
              votingDeadline: payload.votingDeadline,
              milestones: payload.milestones.map((m) => ({ ...m })),
            }
            setProposals(upsertProposal(local))
            setActivities(
              addActivity({
                id: uid('act'),
                type: 'proposal_submit',
                placeId: place.id,
                placeName: place.name,
                actor: address,
                actorName: profile.name,
                proposalTitle: payload.title,
                createdAt: Date.now(),
              }),
            )

            const locId = place.onChainLocationId
            const voteSecs = Math.max(
              60,
              Math.floor((payload.votingDeadline - Date.now()) / 1000),
            )
            const milestoneBps = payload.milestones.map((m) => m.bps) as [
              number,
              number,
              number,
            ]
            if (hasMikasa && locId && /^\d+$/.test(locId)) {
              writeContract({
                address: PROPOSAL_ADDRESS,
                abi: mikasaProposalAbi,
                functionName: 'createProposal',
                args: [
                  BigInt(locId),
                  payload.title,
                  payload.description,
                  parseEther(payload.goalMon),
                  milestoneBps,
                  BigInt(voteSecs),
                ],
              })
            } else if (hasContract && place.onChainPlaceId) {
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: communityPlaceAbi,
                functionName: 'createProposal',
                args: [
                  BigInt(place.onChainPlaceId),
                  payload.title,
                  payload.description,
                  parseEther(payload.goalMon),
                ],
              })
            }

            setView({ name: 'location', placeId: place.id })
            setLocationTab('proposals')
            setProfileTab('proposals')
          }}
        />
      )}

      {showDock && (
        <nav className="dock">
          <button type="button" onClick={() => setView({ name: 'checkin' })}>
            <span className="dock-icon" aria-hidden="true">⌖</span>
            <span>{t('checkin')}</span>
          </button>
          <button type="button" onClick={() => setView({ name: 'donate' })}>
            <span className="dock-icon" aria-hidden="true">＋</span>
            <span>{t('donate')}</span>
          </button>
          <button type="button" onClick={() => setView({ name: 'proposal' })}>
            <span className="dock-icon" aria-hidden="true">↗</span>
            <span>{t('proposal')}</span>
          </button>
        </nav>
      )}

      {writeError && <p className="warn footer-warn">{writeError.message}</p>}
      {txHash && (
        <p className="hint footer-warn">
          Tx{' '}
          <a
            href={`https://testnet.monadvision.com/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {txHash.slice(0, 10)}…
          </a>
        </p>
      )}
    </div>
  )
}

function FeedScreen({
  activities,
  selfAddress,
  chainMember,
  onOpenActor,
  onOpenPlace,
}: {
  activities: Activity[]
  selfAddress: string
  chainMember: {
    registered: boolean
    reputation: number
    tier: number
    power: number
  } | null
  onOpenActor: (address: string) => void
  onOpenPlace: (placeId: string) => void
}) {
  const { t } = useI18n()

  return (
    <main className="page">
      <section className="feed-head">
        <p className="kicker">{t('feedKicker')}</p>
        <h2>{t('feed')}</h2>
        {chainMember?.registered && (
          <p className="monad-strip compact">
            {t('onChainMember')} · {TIER_LABEL[chainMember.tier]} · {chainMember.reputation}{' '}
            {t('reputation')}
          </p>
        )}
      </section>

      <ul className="list path">
        {activities.length === 0 && (
          <li className="empty">{t('feedEmpty')}</li>
        )}
        {activities.map((a) => {
          const actorProfile = loadProfile(a.actor)
          const isSelf = a.actor.toLowerCase() === selfAddress.toLowerCase()
          return (
            <li
              key={a.id}
              className={`list-item feed-item${a.photoDataUrl ? ' has-photo' : ''}`}
            >
              <button
                type="button"
                className="actor-btn"
                onClick={() => onOpenActor(a.actor)}
              >
                <img
                  className="thumb round"
                  src={actorProfile.photoDataUrl || '/mikasa-logo.png'}
                  alt=""
                />
              </button>
              <div className="list-body">
                <button
                  type="button"
                  className="actor-name"
                  onClick={() => onOpenActor(a.actor)}
                >
                  {a.actorName || actorProfile.name || shortAddr(a.actor)}
                  {isSelf ? ' · you' : ''}
                </button>
                <strong>{labelActivity(a, t)}</strong>
                <RepBadge points={pointsForActivity(a)} />
                <GeoBadge activity={a} />
                <button
                  type="button"
                  className="space-link"
                  onClick={() => onOpenPlace(a.placeId)}
                >
                  {a.placeName}
                </button>
                <time>{new Date(a.createdAt).toLocaleString()}</time>
              </div>
              {a.photoDataUrl ? (
                <img className="feed-photo" src={a.photoDataUrl} alt="" />
              ) : null}
            </li>
          )
        })}
      </ul>
    </main>
  )
}

function OtherProfileScreen({
  address,
  activities,
  places,
  proposals,
  tab,
  setTab,
  onBack,
  onOpenPlace,
  onOpenProposal,
}: {
  address: string
  activities: Activity[]
  places: PlaceMeta[]
  proposals: LocalProposal[]
  tab: ProfileTab
  setTab: (t: ProfileTab) => void
  onBack: () => void
  onOpenPlace: (id: string) => void
  onOpenProposal: (proposalId: string) => void
}) {
  const { t } = useI18n()
  const profile = loadProfile(address)
  const summary = summarizeActivities(activities)
  const placeIds = [...new Set(activities.map((a) => a.placeId))]
  const theirPlaces = places.filter((p) => placeIds.includes(p.id))

  return (
    <main className="page">
      <button type="button" className="link" onClick={onBack}>
        {t('backFeed')}
      </button>
      <section className="profile-card">
        <img
          className="avatar"
          src={profile.photoDataUrl || '/mikasa-logo.png'}
          alt=""
        />
        <div className="profile-copy">
          <p className="kicker">{t('theirRecord')}</p>
          <h2>{profile.name || shortAddr(address)}</h2>
          <p className="meta">{shortAddr(address)}</p>
        </div>
      </section>

      <div className="profile-stats" aria-label="Public contribution summary">
        <div><strong>{summary.donatedMon.toFixed(3)}</strong><span>{t('donated')}</span></div>
        <div><strong>{summary.checkins}</strong><span>{t('checkins')}</span></div>
        <div><strong>{summary.submits}</strong><span>{t('proposals')}</span></div>
        <div><strong>{summary.executes}</strong><span>{t('executed')}</span></div>
      </div>

      <div className="tabs profile-tabs">
        <button
          type="button"
          className={tab === 'activities' ? 'active' : ''}
          onClick={() => setTab('activities')}
        >
          {t('theirActivities')}
        </button>
        <button
          type="button"
          className={tab === 'locations' ? 'active' : ''}
          onClick={() => setTab('locations')}
        >
          {t('theirSpaces')}
        </button>
        <button
          type="button"
          className={tab === 'proposals' ? 'active' : ''}
          onClick={() => setTab('proposals')}
        >
          {t('theirProposals')}
        </button>
      </div>

      {tab === 'activities' && (
        <ul className="list path">
          {activities.length === 0 && (
            <li className="empty">{t('noActivity')}</li>
          )}
          {activities.map((a) => (
            <li
              key={a.id}
              className={`list-item activity-item${a.photoDataUrl ? ' has-photo' : ''}`}
            >
              {a.photoDataUrl && (
                <img className="activity-photo" src={a.photoDataUrl} alt="" />
              )}
              <div className="list-body">
                <strong>{labelActivity(a, t)}</strong>
                <RepBadge points={pointsForActivity(a)} />
                <GeoBadge activity={a} />
                <button
                  type="button"
                  className="space-link"
                  onClick={() => onOpenPlace(a.placeId)}
                >
                  {a.placeName}
                </button>
                <time>{new Date(a.createdAt).toLocaleString()}</time>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'locations' && (
        <ul className="list">
          {theirPlaces.length === 0 && (
            <li className="empty">{t('noActivity')}</li>
          )}
          {theirPlaces.map((place) => {
            const mine = activities.filter((a) => a.placeId === place.id)
            const stats = {
              checkins: mine.filter((a) => a.type === 'checkin').length,
              donations: mine.filter((a) => a.type === 'donation').length,
              submits: mine.filter((a) => a.type === 'proposal_submit').length,
              completed: mine.filter((a) => a.type === 'proposal_execute').length,
            }
            return (
              <li key={place.id}>
                <button
                  type="button"
                  className="list-item row-btn"
                  onClick={() => onOpenPlace(place.id)}
                >
                  <img
                    className="thumb"
                    src={place.thumbDataUrl || '/mikasa-logo.png'}
                    alt=""
                  />
                  <div className="list-body">
                    <span className={`space-kind kind-${place.kind}`}>
                      {t(place.kind)}
                    </span>
                    <strong>{place.name}</strong>
                    <p className="meta">
                      {stats.checkins} {t('checkin')} · {stats.donations}{' '}
                      {t('donation')} · {stats.submits} {t('proposal')} ·{' '}
                      {stats.completed} {t('completed')}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {tab === 'proposals' && (
        <ul className="list">
          {proposals.length === 0 && (
            <li className="empty">{t('noMyProposal')}</li>
          )}
          {proposals.map((proposal) => {
            const space = places.find((p) => p.id === proposal.placeId)
            return (
              <li key={proposal.id}>
                <button
                  type="button"
                  className="list-item row-btn"
                  onClick={() => onOpenProposal(proposal.id)}
                >
                  <div className="list-body">
                    <span className={`space-kind kind-${space?.kind || 'project'}`}>
                      {proposal.status}
                    </span>
                    <strong>{proposal.title}</strong>
                    <p>{space?.name || proposal.placeId}</p>
                    <p className="meta">
                      {proposal.raisedMon} / {proposal.goalMon} MON ·{' '}
                      {proposal.votes.length} {t('votes')}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

function ProfileScreen({
  profile,
  summary,
  chainMember,
  mikasaReady,
  wrongChain,
  registering,
  recentTxs,
  address,
  onRegister,
  tab,
  setTab,
  activities,
  places,
  allPlaces,
  myActivities,
  myProposals,
  onEdit,
  onOpenPlace,
  onOpenProposal,
}: {
  profile: Profile
  summary: {
    donationCount: number
    donatedMon: number
    checkins: number
    submits: number
    executes: number
  }
  chainMember: {
    registered: boolean
    reputation: number
    contributionCount: number
    tier: number
    power: number
  } | null
  mikasaReady: boolean
  wrongChain: boolean
  registering: boolean
  recentTxs: string[]
  address: string
  onRegister: () => void
  tab: ProfileTab
  setTab: (t: ProfileTab) => void
  activities: Activity[]
  places: PlaceMeta[]
  allPlaces: PlaceMeta[]
  myActivities: Activity[]
  myProposals: LocalProposal[]
  onEdit: () => void
  onOpenPlace: (id: string) => void
  onOpenProposal: (proposalId: string) => void
}) {
  const { t } = useI18n()
  const listPlaces =
    places.length > 0
      ? places
      : allPlaces /* show seed spaces so user can still open / contribute */

  return (
    <main className="page">
      <section className="profile-card">
        <img
          className="avatar"
          src={profile.photoDataUrl || '/mikasa-logo.png'}
          alt=""
        />
        <div className="profile-copy">
          <p className="kicker">{t('yourRecord')}</p>
          <h2>{profile.name || t('name')}</h2>
          {chainMember?.registered ? (
            <p className="meta">
              {TIER_LABEL[chainMember.tier] || 'Visitor'} · {chainMember.reputation}{' '}
              {t('reputation')} · {t('votingPower')} {chainMember.power}
            </p>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={registering || wrongChain || !mikasaReady}
              onClick={onRegister}
            >
              {wrongChain
                ? t('switchNetwork')
                : !mikasaReady
                  ? t('contractsMissing')
                  : registering
                    ? t('pending')
                    : t('registerMember')}
            </button>
          )}
          {address && (
            <a
              className="link"
              href={explorerAddressUrl(address)}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddr(address)} · MonadVision ↗
            </a>
          )}
          <button type="button" className="link" onClick={onEdit}>
            {t('editProfile')}
          </button>
        </div>
      </section>

      <ReputationGuide
        reputation={
          chainMember?.registered
            ? chainMember.reputation
            : estimateReputationFromActivities(myActivities, address)
        }
        onChain={Boolean(chainMember?.registered)}
      />

      {recentTxs.length > 0 && (
        <section className="tx-list" aria-label={t('recentOnMonad')}>
          <p className="kicker">{t('recentOnMonad')}</p>
          <ul>
            {recentTxs.map((hash) => (
              <li key={hash}>
                <a href={explorerTxUrl(hash)} target="_blank" rel="noreferrer">
                  {hash.slice(0, 10)}…{hash.slice(-6)} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="profile-stats" aria-label="Your contribution summary">
        <div><strong>{summary.donatedMon.toFixed(3)}</strong><span>{t('donated')}</span></div>
        <div><strong>{summary.checkins}</strong><span>{t('checkins')}</span></div>
        <div><strong>{summary.submits}</strong><span>{t('proposals')}</span></div>
        <div><strong>{summary.executes}</strong><span>{t('executed')}</span></div>
      </div>

      <div className="tabs profile-tabs">
        <button
          type="button"
          className={tab === 'activities' ? 'active' : ''}
          onClick={() => setTab('activities')}
        >
          {t('myActivities')}
        </button>
        <button
          type="button"
          className={tab === 'locations' ? 'active' : ''}
          onClick={() => setTab('locations')}
        >
          {t('mySpaces')}
        </button>
        <button
          type="button"
          className={tab === 'proposals' ? 'active' : ''}
          onClick={() => setTab('proposals')}
        >
          {t('myProposals')}
        </button>
      </div>

      {tab === 'activities' && (
        <ul className="list path">
          {activities.length === 0 && (
            <li className="empty">{t('noActivity')}</li>
          )}
          {activities.map((a) => (
            <li
              key={a.id}
              className={`list-item activity-item${a.photoDataUrl ? ' has-photo' : ''}`}
            >
              {a.photoDataUrl && (
                <img className="activity-photo" src={a.photoDataUrl} alt="" />
              )}
              <div className="list-body">
                <strong>{labelActivity(a, t)}</strong>
                <RepBadge points={pointsForActivity(a)} />
                <GeoBadge activity={a} />
                <p>{a.placeName}</p>
                <time>{new Date(a.createdAt).toLocaleString()}</time>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'locations' && (
        <ul className="list">
          {listPlaces.map((place) => {
            const mine = myActivities.filter((a) => a.placeId === place.id)
            const stats = {
              checkins: mine.filter((a) => a.type === 'checkin').length,
              donations: mine.filter((a) => a.type === 'donation').length,
              submits: mine.filter((a) => a.type === 'proposal_submit').length,
              completed: mine.filter((a) => a.type === 'proposal_execute').length,
            }
            return (
              <li key={place.id}>
                <button
                  type="button"
                  className="list-item row-btn"
                  onClick={() => onOpenPlace(place.id)}
                >
                  <img
                    className="thumb"
                    src={place.thumbDataUrl || '/mikasa-logo.png'}
                    alt=""
                  />
                  <div className="list-body">
                    <span className={`space-kind kind-${place.kind}`}>
                      {t(place.kind)}
                    </span>
                    <strong>{place.name}</strong>
                    <p>{place.locationLabel}</p>
                    <p className="meta">
                      {stats.checkins} {t('checkin')} · {stats.donations}{' '}
                      {t('donation')} · {stats.submits} {t('proposal')} ·{' '}
                      {stats.completed} {t('completed')}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {tab === 'proposals' && (
        <ul className="list">
          {myProposals.length === 0 && (
            <li className="empty">{t('noMyProposal')}</li>
          )}
          {myProposals.map((proposal) => {
            const space =
              allPlaces.find((p) => p.id === proposal.placeId) ||
              places.find((p) => p.id === proposal.placeId)
            return (
              <li key={proposal.id}>
                <button
                  type="button"
                  className="list-item row-btn"
                  onClick={() => onOpenProposal(proposal.id)}
                >
                  <div className="list-body">
                    <span className={`space-kind kind-${space?.kind || 'project'}`}>
                      {proposal.status}
                    </span>
                    <strong>{proposal.title}</strong>
                    <p>{space?.name || proposal.placeId}</p>
                    <p className="meta">
                      {proposal.raisedMon} / {proposal.goalMon} MON ·{' '}
                      {proposal.votes.length} {t('votes')}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

function LocationScreen({
  place,
  activities,
  proposals,
  tab,
  setTab,
  mikasaReady,
  busy,
  boost,
  onMicroBoost,
  onBack,
  onOpenProposal,
  onAnchorOnChain,
  onOpenActor,
}: {
  place?: PlaceMeta
  activities: Activity[]
  proposals: LocalProposal[]
  tab: LocationTab
  setTab: (t: LocationTab) => void
  mikasaReady: boolean
  busy: boolean
  boost: {
    running: boolean
    done: number
    total: number
    avgSec: number | null
    hashes: string[]
  }
  onMicroBoost: () => void
  onBack: () => void
  onOpenProposal: (proposalId: string) => void
  onAnchorOnChain: (p: PlaceMeta) => void
  onOpenActor: (actor: string) => void
}) {
  const { t } = useI18n()
  if (!place) {
    return (
      <main className="page">
        <button type="button" className="link" onClick={onBack}>
          {t('backFeed')}
        </button>
        <p>{t('notFound')}</p>
      </main>
    )
  }

  const funds = activities
    .filter((a) => a.type === 'donation')
    .reduce((s, a) => s + Number(a.amountMon || 0), 0)
  const checkins = activities.filter((a) => a.type === 'checkin').length
  const submitted = activities.filter((a) => a.type === 'proposal_submit').length
  const completed =
    activities.filter((a) => a.type === 'proposal_execute').length +
    proposals.filter((p) => p.status === 'completed').length

  const canAnchor =
    mikasaReady &&
    place.lat != null &&
    place.lng != null &&
    (!place.onChainLocationId || place.onChainLocationId === 'pending')

  const canBoost =
    mikasaReady &&
    Boolean(place.onChainLocationId && /^\d+$/.test(place.onChainLocationId))

  return (
    <main className="page">
      <button type="button" className="link" onClick={onBack}>
        {t('backFeed')}
      </button>
      <div className="place-hero">
        <img src={place.thumbDataUrl || '/mikasa-logo.png'} alt="" />
        <div>
          <p className="kicker">
            {t(place.kind)} · {t('communitySpace')}
          </p>
          <h2>{place.name}</h2>
          <p>{place.locationLabel}</p>
          {place.onChainLocationId && place.onChainLocationId !== 'pending' && (
            <p className="meta">
              {t('onChainLocation')} #{place.onChainLocationId}
            </p>
          )}
          {canAnchor && (
            <button
              type="button"
              className="primary small"
              disabled={busy}
              onClick={() => onAnchorOnChain(place)}
            >
              {busy ? t('pending') : t('anchorOnChain')}
            </button>
          )}
        </div>
      </div>

      {canBoost && (
        <section className="micro-boost">
          <p className="kicker">{t('microBoost')}</p>
          <p className="meta">{t('microBoostHint')}</p>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={onMicroBoost}
          >
            {boost.running
              ? `${t('microBoostProgress')} ${boost.done}/${boost.total}`
              : t('microBoostCta')}
          </button>
          {boost.avgSec != null && (
            <p className="meta">
              {t('avgConfirm')} · {boost.avgSec.toFixed(2)}s
              {boost.hashes[boost.hashes.length - 1] && (
                <>
                  {' · '}
                  <a
                    href={explorerTxUrl(boost.hashes[boost.hashes.length - 1])}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('viewOnMonadVision')} ↗
                  </a>
                </>
              )}
            </p>
          )}
        </section>
      )}

      <div className="stats-grid">
        <div>
          <strong>{funds.toFixed(3)} MON</strong>
          <span>{t('raised')}</span>
        </div>
        <div>
          <strong>{checkins}</strong>
          <span>{t('checkins')}</span>
        </div>
        <div>
          <strong>{submitted}</strong>
          <span>{t('proposals')}</span>
        </div>
        <div>
          <strong>{completed}</strong>
          <span>{t('completed')}</span>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={tab === 'activities' ? 'active' : ''}
          onClick={() => setTab('activities')}
        >
          {t('activities')}
        </button>
        <button
          type="button"
          className={tab === 'proposals' ? 'active' : ''}
          onClick={() => setTab('proposals')}
        >
          {t('communityProposals')}
        </button>
      </div>

      {tab === 'activities' && (
        <ul className="list path">
          {activities.length === 0 && (
            <li className="empty">{t('noSpaceActivity')}</li>
          )}
          {activities.map((a) => (
            <li
              key={a.id}
              className={`list-item activity-item${a.photoDataUrl ? ' has-photo' : ''}`}
            >
              {a.photoDataUrl && (
                <img className="activity-photo" src={a.photoDataUrl} alt="" />
              )}
              <div className="list-body">
                <button
                  type="button"
                  className="actor-name"
                  onClick={() => onOpenActor(a.actor)}
                >
                  {a.actorName || shortAddr(a.actor)}
                </button>
                <strong>{labelActivity(a, t)}</strong>
                <RepBadge points={pointsForActivity(a)} />
                <GeoBadge activity={a} />
                <time>{new Date(a.createdAt).toLocaleString()}</time>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'proposals' && (
        <section className="community-proposals">
          <div className="section-head">
            <h3>{t('communityProposals')}</h3>
            <p className="meta">{t('communityProposalsHint')}</p>
          </div>
          <ul className="list">
            {proposals.filter((p) => p.status === 'ongoing' || p.status === 'funded')
              .length === 0 && <li className="empty">{t('noProposal')}</li>}
            {proposals
              .filter((p) => p.status === 'ongoing' || p.status === 'funded')
              .map((p) => {
                const full = normalizeProposal(p)
                const deadline = full.votingDeadline
                  ? new Date(full.votingDeadline).toLocaleString()
                  : '—'
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="list-item row-btn proposal-list-item"
                      onClick={() => onOpenProposal(p.id)}
                    >
                      <div className="list-body">
                        <span className="space-kind kind-place">{full.status}</span>
                        <strong>{full.title}</strong>
                        <p>{full.description}</p>
                        <p className="meta">
                          {full.raisedMon} / {full.goalMon} MON · {full.votes.length}{' '}
                          {t('votes')} · {t('votingDeadline')}: {deadline}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
          </ul>
        </section>
      )}
    </main>
  )
}

function ProposalDetailScreen({
  proposal,
  place,
  address,
  mikasaReady,
  busy,
  onBack,
  onOpenActor,
  onVote,
  onCloseVoting,
  onSubmitProof,
  onVerifyMilestone,
}: {
  proposal: LocalProposal
  place?: PlaceMeta
  address: string
  mikasaReady: boolean
  busy: boolean
  onBack: () => void
  onOpenActor: (actor: string) => void
  onVote: (p: LocalProposal) => void
  onCloseVoting: (p: LocalProposal) => void
  onSubmitProof: (p: LocalProposal, milestoneId: number) => void
  onVerifyMilestone: (p: LocalProposal, milestoneId: number) => void
}) {
  const { t } = useI18n()
  const full = normalizeProposal(proposal)
  const milestones = full.milestones || DEFAULT_PROPOSAL_MILESTONES
  const deadline = full.votingDeadline
    ? new Date(full.votingDeadline).toLocaleString()
    : '—'
  const missing = !full.title

  if (missing) {
    return (
      <main className="page">
        <button type="button" className="link" onClick={onBack}>
          {t('backSpace')}
        </button>
        <p>{t('notFound')}</p>
      </main>
    )
  }

  return (
    <main className="page proposal-detail">
      <button type="button" className="link" onClick={onBack}>
        {t('backSpace')}
      </button>

      <section className="proposal-hero">
        <p className="kicker">{t('communityProposals')}</p>
        <h2>{full.title}</h2>
        <p>{full.description}</p>
      </section>

      <dl className="proposal-meta-grid">
        <div>
          <dt>{t('proposalId')}</dt>
          <dd>{full.onChainProposalId ? `#${full.onChainProposalId}` : full.id}</dd>
        </div>
        <div>
          <dt>{t('proposalLocation')}</dt>
          <dd>{place?.name || full.placeId || '—'}</dd>
        </div>
        <div>
          <dt>{t('proposalCreator')}</dt>
          <dd>
            <button
              type="button"
              className="actor-name"
              onClick={() => onOpenActor(full.creator)}
            >
              {loadProfile(full.creator).name || shortAddr(full.creator)}
            </button>
          </dd>
        </div>
        <div>
          <dt>{t('fundingTarget')}</dt>
          <dd>
            {full.raisedMon} / {full.goalMon} MON
          </dd>
        </div>
        <div>
          <dt>{t('votingDeadline')}</dt>
          <dd>{deadline}</dd>
        </div>
        <div>
          <dt>{t('proposalStatus')}</dt>
          <dd>{full.status}</dd>
        </div>
      </dl>

      <div className="row">
        <button
          type="button"
          className="primary"
          disabled={busy || full.votes.includes(address.toLowerCase())}
          onClick={() => onVote(full)}
        >
          {full.votes.includes(address.toLowerCase()) ? t('voted') : t('vote')}
        </button>
        {mikasaReady && full.onChainProposalId && (
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={() => onCloseVoting(full)}
          >
            {t('closeVoting')}
          </button>
        )}
      </div>
      <p className="meta">
        {full.votes.length} {t('votes')}
      </p>

      <section className="milestone-section">
        <h3>{t('milestones')}</h3>
        <ul className="list">
          {milestones.map((m) => (
            <li key={m.id} className="milestone-card">
              <strong>
                {t('milestone')} {m.id + 1}: {m.title}
              </strong>
              <p className="meta">
                {(m.bps / 100).toFixed(0)}% · {m.status}
              </p>
              {mikasaReady && full.onChainProposalId && (
                <div className="row">
                  <button
                    type="button"
                    className="ghost small"
                    disabled={busy}
                    onClick={() => onSubmitProof(full, m.id)}
                  >
                    {t('submitProof')}
                  </button>
                  <button
                    type="button"
                    className="primary small"
                    disabled={busy}
                    onClick={() => onVerifyMilestone(full, m.id)}
                  >
                    {t('verifyMilestone')}{' '}
                    <span className="rep-inline">
                      {formatRepDelta(REP.verifyProject)}
                    </span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

function EditProfileScreen({
  profile,
  onCancel,
  onSave,
}: {
  profile: Profile
  onCancel: () => void
  onSave: (p: Profile) => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState(profile.name)
  const [photoDataUrl, setPhotoDataUrl] = useState(profile.photoDataUrl)

  return (
    <main className="page sheet">
      <button type="button" className="sheet-back" onClick={onCancel}>
        {t('backProfile')}
      </button>
      <h2>{t('editTitle')}</h2>
      <label>
        {t('name')}
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t('photo')}
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setPhotoDataUrl(await fileToDataUrl(file))
          }}
        />
      </label>
      {photoDataUrl && <img className="preview" src={photoDataUrl} alt="" />}
      <div className="row">
        <button type="button" className="ghost" onClick={onCancel}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => onSave({ name: name.trim() || profile.name, photoDataUrl })}
        >
          {t('save')}
        </button>
      </div>
    </main>
  )
}

function SpaceTypeahead({
  places,
  placeId,
  onSelect,
}: {
  places: PlaceMeta[]
  placeId: string
  onSelect: (place: PlaceMeta | null) => void
}) {
  const { t } = useI18n()
  const selected = places.find((p) => p.id === placeId)
  const [query, setQuery] = useState(selected?.name || '')
  const [open, setOpen] = useState(false)
  const [mapHits, setMapHits] = useState<MapPlaceHit[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const name = places.find((p) => p.id === placeId)?.name || ''
    if (name) setQuery(name)
  }, [placeId, places])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setMapHits([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(async () => {
      try {
        const hits = await searchMapPlaces(q)
        if (!cancelled) setMapHits(hits)
      } catch {
        if (!cancelled) setMapHits([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  const q = query.trim().toLowerCase()
  const localMatches = places.filter((p) => {
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.locationLabel.toLowerCase().includes(q) ||
      p.kind.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-typeahead">
      <input
        value={query}
        placeholder={t('spaceSearch')}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const next = e.target.value
          setQuery(next)
          setOpen(true)
          const exact = places.find(
            (p) => p.name.toLowerCase() === next.trim().toLowerCase(),
          )
          if (exact) onSelect(exact)
          else if (placeId) onSelect(null)
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 140)
        }}
      />
      {open && (
        <ul className="space-suggest" role="listbox">
          {localMatches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={p.id === placeId ? 'active' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(p.name)
                  setOpen(false)
                  onSelect(p)
                }}
              >
                <strong>{p.name}</strong>
                <span>
                  {t('spaceLocal')} · {t(p.kind)} · {p.locationLabel}
                </span>
              </button>
            </li>
          ))}
          {searching && (
            <li className="empty">{t('spaceSearching')}</li>
          )}
          {!searching &&
            mapHits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className={hit.id === placeId ? 'active' : ''}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const place = mapHitToPlace(hit)
                    setQuery(place.name)
                    setOpen(false)
                    onSelect(place)
                  }}
                >
                  <strong>{hit.name}</strong>
                  <span>
                    {t('spaceMaps')} · {hit.locationLabel}
                  </span>
                </button>
              </li>
            ))}
          {!searching &&
            localMatches.length === 0 &&
            mapHits.length === 0 &&
            q.length >= 2 && (
              <li className="empty">{t('spaceNoMatch')}</li>
            )}
        </ul>
      )}
    </div>
  )
}

function CheckInSheet({
  places,
  onUpsertPlace,
  onClose,
  onSubmit,
}: {
  places: PlaceMeta[]
  onUpsertPlace: (place: PlaceMeta) => void
  profileName: string
  address: string
  onClose: () => void
  onSubmit: (p: {
    placeId: string
    kind: CheckInKind
    photoDataUrl: string
    geoVerified: boolean
    distanceM?: number
    accuracyM?: number
    geoMode: 'live' | 'demo' | 'self'
  }) => void
}) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<PlaceMeta | null>(null)
  const eligibleSpaces = useMemo(() => {
    const base = places.filter(
      (space) => space.kind === 'place' || space.kind === 'event',
    )
    if (picked && (picked.kind === 'place' || picked.kind === 'event')) {
      if (!base.some((p) => p.id === picked.id)) return [picked, ...base]
    }
    return base
  }, [places, picked])
  const [placeId, setPlaceId] = useState('')
  const selectedPlace =
    (picked && picked.id === placeId ? picked : null) ||
    eligibleSpaces.find((p) => p.id === placeId)
  const kinds = selectedPlace ? getCheckInKinds(selectedPlace) : []
  const [kind, setKind] = useState<CheckInKind>('visit')
  const [photoDataUrl, setPhotoDataUrl] = useState<string>()
  const [geo, setGeo] = useState<GeoCheckResult | { status: 'checking' } | null>(
    null,
  )
  const [geoTick, setGeoTick] = useState(0)

  useEffect(() => {
    if (!kinds.length) return
    if (!kinds.includes(kind)) setKind(kinds[0])
  }, [placeId, kinds, kind])

  useEffect(() => {
    if (!selectedPlace) {
      setGeo(null)
      return
    }
    if (selectedPlace.presence === 'self') {
      setGeo({ status: 'self' })
      return
    }
    const lat = selectedPlace.lat
    const lng = selectedPlace.lng
    const radiusM = selectedPlace.radiusM ?? 250
    if (lat == null || lng == null) {
      setGeo({ status: 'unavailable' })
      return
    }

    let cancelled = false
    setGeo({ status: 'checking' })

    ;(async () => {
      try {
        if (GEO_DEMO) {
          if (cancelled) return
          setGeo(
            evaluatePresence(
              { lat, lng, accuracyM: 10 },
              { lat, lng, radiusM },
              'demo',
            ),
          )
          return
        }
        const pos = await readDevicePosition()
        if (cancelled) return
        setGeo(evaluatePresence(pos, { lat, lng, radiusM }, 'live'))
      } catch (err) {
        if (cancelled) return
        const code = err instanceof Error ? err.message : 'unavailable'
        setGeo({
          status: code === 'denied' ? 'denied' : 'unavailable',
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedPlace, geoTick])

  const locationOk =
    geo?.status === 'self' ||
    (geo?.status === 'nearby' && (geo.mode === 'live' || geo.mode === 'demo'))

  return (
    <main className="page sheet">
      <button type="button" className="sheet-back" onClick={onClose}>
        {t('backFeed')}
      </button>
      <h2>{t('checkin')}</h2>
      <label>
        {t('selectSpace')}
        <SpaceTypeahead
          places={eligibleSpaces}
          placeId={placeId}
          onSelect={(place) => {
            if (!place) {
              setPlaceId('')
              setPicked(null)
              return
            }
            setPicked(place)
            onUpsertPlace(place)
            setPlaceId(place.id)
            const nextKinds = getCheckInKinds(place)
            if (nextKinds[0]) setKind(nextKinds[0])
          }}
        />
      </label>
      <label>
        {t('activity')}
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CheckInKind)}
          disabled={!kinds.length}
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {t(k)} · {formatRepDelta(pointsForCheckInKind(k))} {t('reputation')}
            </option>
          ))}
        </select>
      </label>
      {kind && (
        <p className="rep-earn hint">
          {engagementLabel(engagementKindForCheckIn(kind))}{' '}
          <RepBadge points={pointsForCheckInKind(kind)} />
        </p>
      )}

      <div className="geo-status" aria-live="polite">
        {geo?.status === 'checking' && <p className="hint">{t('geoChecking')}</p>}
        {geo?.status === 'self' && (
          <p className="geo-pill self">{t('geoSelf')}</p>
        )}
        {geo?.status === 'nearby' && geo.mode === 'live' && (
          <p className="geo-pill nearby">
            {t('geoNearby')} · {geo.distanceM}m (±{geo.accuracyM}m)
          </p>
        )}
        {geo?.status === 'nearby' && geo.mode === 'demo' && (
          <p className="geo-pill demo">{t('geoDemo')}</p>
        )}
        {geo?.status === 'too_far' && (
          <p className="geo-pill far">
            {t('geoTooFar')} · {geo.distanceM}m
          </p>
        )}
        {geo?.status === 'imprecise' && (
          <p className="geo-pill far">
            {t('geoImprecise')} · ±{geo.accuracyM}m
          </p>
        )}
        {geo?.status === 'denied' && (
          <p className="geo-pill far">{t('geoDenied')}</p>
        )}
        {geo?.status === 'unavailable' && (
          <p className="geo-pill far">{t('geoUnavailable')}</p>
        )}
        {selectedPlace?.presence === 'geo' && (
          <p className="hint">{t('geoHint')}</p>
        )}
        <div className="row geo-actions">
          {selectedPlace?.lat != null && selectedPlace.lng != null && (
            <a
              className="link"
              href={mapsUrl(selectedPlace.lat, selectedPlace.lng, selectedPlace.name)}
              target="_blank"
              rel="noreferrer"
            >
              {t('openMaps')}
            </a>
          )}
          {selectedPlace?.presence === 'geo' && !GEO_DEMO && (
            <button
              type="button"
              className="link"
              onClick={() => setGeoTick((n) => n + 1)}
            >
              {t('retryLocation')}
            </button>
          )}
        </div>
      </div>

      <label>
        {t('photo')}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setPhotoDataUrl(await fileToDataUrl(file))
          }}
        />
      </label>
      {photoDataUrl ? (
        <img className="preview" src={photoDataUrl} alt="" />
      ) : (
        <p className="hint">{t('photoRequired')}</p>
      )}
      <div className="row">
        <button type="button" className="ghost" onClick={onClose}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!placeId || !photoDataUrl || !kinds.length || !locationOk}
          onClick={() => {
            if (!photoDataUrl || !geo || !locationOk) return
            if (geo.status === 'self') {
              onSubmit({
                placeId,
                kind,
                photoDataUrl,
                geoVerified: false,
                geoMode: 'self',
              })
              return
            }
            if (geo.status !== 'nearby') return
            onSubmit({
              placeId,
              kind,
              photoDataUrl,
              geoVerified: geo.mode === 'live',
              distanceM: geo.distanceM,
              accuracyM: geo.accuracyM,
              geoMode: geo.mode,
            })
          }}
        >
          {t('checkin')}
        </button>
      </div>
    </main>
  )
}

function DonateSheet({
  places,
  busy,
  onUpsertPlace,
  onClose,
  onSubmit,
}: {
  places: PlaceMeta[]
  busy: boolean
  onUpsertPlace: (place: PlaceMeta) => void
  onClose: () => void
  onSubmit: (p: { placeId: string; amountMon: string }) => void
}) {
  const { t } = useI18n()
  const [placeId, setPlaceId] = useState('')
  const [amountMon, setAmountMon] = useState('0.01')

  return (
    <main className="page sheet">
      <button type="button" className="sheet-back" onClick={onClose}>
        {t('backFeed')}
      </button>
      <h2>{t('donate')}</h2>
      <label>
        {t('selectSpace')}
        <SpaceTypeahead
          places={places}
          placeId={placeId}
          onSelect={(place) => {
            if (!place) {
              setPlaceId('')
              return
            }
            onUpsertPlace(place)
            setPlaceId(place.id)
          }}
        />
      </label>
      <label>
        {t('amount')}
        <input value={amountMon} onChange={(e) => setAmountMon(e.target.value)} />
      </label>
      <p className="rep-earn hint">
        {engagementLabel('fundProposal')} <RepBadge points={REP.fundProposal} />
      </p>
      <div className="row">
        <button type="button" className="ghost" onClick={onClose}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!placeId || busy || Number(amountMon) <= 0}
          onClick={() => onSubmit({ placeId, amountMon })}
        >
          {busy ? t('pending') : t('donate')}
        </button>
      </div>
    </main>
  )
}

function ProposalSheet({
  places,
  busy,
  onUpsertPlace,
  onClose,
  onSubmit,
}: {
  places: PlaceMeta[]
  busy: boolean
  onUpsertPlace: (place: PlaceMeta) => void
  onClose: () => void
  onSubmit: (p: {
    placeId: string
    title: string
    description: string
    goalMon: string
    votingDeadline: number
    milestones: { id: number; title: string; bps: number; status: 'pending' }[]
  }) => void
}) {
  const { t } = useI18n()
  const [placeId, setPlaceId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalMon, setGoalMon] = useState('0.05')
  const defaultDeadline = () => {
    const d = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const [deadlineLocal, setDeadlineLocal] = useState(defaultDeadline)
  const [milestones, setMilestones] = useState(() =>
    DEFAULT_PROPOSAL_MILESTONES.map((m) => ({ ...m, status: 'pending' as const })),
  )

  const examples: { key: CopyKey; description: string }[] = [
    {
      key: 'examplePaths',
      description:
        'Repair uneven sections along the loop and mark safer lanes for morning runners.',
    },
    {
      key: 'exampleLighting',
      description: 'Add warm path lights on darker stretches for evening runs.',
    },
    {
      key: 'exampleBins',
      description: 'Place bins near rest spots so the loop stays clean after peak hours.',
    },
    {
      key: 'exampleWater',
      description: 'A small refill point near gate 2 for morning runners.',
    },
    {
      key: 'exampleRunEvents',
      description: 'Weekly community 5K meetups with volunteer marshals.',
    },
    {
      key: 'exampleCommunity',
      description:
        'Weekend clean-ups, stretching circles, and neighbor meetups around the loop.',
    },
  ]

  const applyExample = (ex: (typeof examples)[number]) => {
    setTitle(t(ex.key))
    setDescription(ex.description)
  }

  return (
    <main className="page sheet">
      <button type="button" className="sheet-back" onClick={onClose}>
        {t('backFeed')}
      </button>
      <h2>{t('submitProposal')}</h2>
      <p className="rep-earn hint">
        {engagementLabel('submitProposal')} <RepBadge points={REP.submitProposal} />
      </p>

      <div className="proposal-examples">
        <p className="meta">{t('proposalExamples')}</p>
        <div className="example-chips">
          {examples.map((ex) => (
            <button
              key={ex.key}
              type="button"
              className="ghost small"
              onClick={() => applyExample(ex)}
            >
              {t(ex.key)}
            </button>
          ))}
        </div>
      </div>

      <label>
        {t('selectSpace')}
        <SpaceTypeahead
          places={places}
          placeId={placeId}
          onSelect={(place) => {
            if (!place) {
              setPlaceId('')
              return
            }
            onUpsertPlace(place)
            setPlaceId(place.id)
          }}
        />
      </label>
      <label>
        {t('title')}
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        {t('description')}
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label>
        {t('fundingTarget')} (MON)
        <input value={goalMon} onChange={(e) => setGoalMon(e.target.value)} />
      </label>
      <label>
        {t('votingDeadline')}
        <input
          type="datetime-local"
          value={deadlineLocal}
          onChange={(e) => setDeadlineLocal(e.target.value)}
        />
      </label>

      <fieldset className="milestone-fields">
        <legend>{t('milestones')}</legend>
        {milestones.map((m, idx) => (
          <label key={m.id}>
            {t('milestoneTitleN')} {idx + 1}
            <span className="meta"> · {(m.bps / 100).toFixed(0)}%</span>
            <input
              value={m.title}
              onChange={(e) => {
                const next = [...milestones]
                next[idx] = { ...m, title: e.target.value }
                setMilestones(next)
              }}
            />
          </label>
        ))}
      </fieldset>

      <div className="row">
        <button type="button" className="ghost" onClick={onClose}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!placeId || !title.trim() || busy}
          onClick={() => {
            const ms = new Date(deadlineLocal).getTime()
            onSubmit({
              placeId,
              title: title.trim(),
              description: description.trim(),
              goalMon,
              votingDeadline: Number.isFinite(ms)
                ? ms
                : Date.now() + 1000 * 60 * 60 * 24 * 3,
              milestones: milestones.map((m) => ({
                ...m,
                title: m.title.trim() || `Milestone ${m.id + 1}`,
                status: 'pending',
              })),
            })
          }}
        >
          {busy ? t('pending') : t('submit')}
        </button>
      </div>
    </main>
  )
}

function GeoBadge({ activity }: { activity: Activity }) {
  const { t } = useI18n()
  if (activity.type !== 'checkin') return null
  if (activity.geoMode === 'demo') {
    return <span className="geo-badge demo">{t('geoDemo')}</span>
  }
  if (activity.geoVerified && activity.geoMode === 'live') {
    return (
      <span className="geo-badge nearby">
        {t('geoNearby')}
        {activity.distanceM != null ? ` · ${activity.distanceM}m` : ''}
      </span>
    )
  }
  if (activity.geoMode === 'self') {
    return <span className="geo-badge self">{t('geoSelf')}</span>
  }
  return null
}

function RepBadge({ points }: { points: number }) {
  if (!points) return null
  return (
    <span className="rep-badge" title="Reputation">
      {formatRepDelta(points)}
    </span>
  )
}

function ReputationGuide({
  reputation,
  onChain,
}: {
  reputation: number
  onChain: boolean
}) {
  const { t } = useI18n()
  const tier = tierFromReputation(reputation)
  const upcoming = nextTier(reputation)
  const progressMax = upcoming ? upcoming.min : Math.max(reputation, 1500)
  const progressMin = tier.min
  const pct = upcoming
    ? Math.min(
        100,
        Math.round(((reputation - progressMin) / (progressMax - progressMin)) * 100),
      )
    : 100

  return (
    <section className="reputation-guide" aria-label={t('reputationGuide')}>
      <p className="kicker">{t('reputationGuide')}</p>
      <p className="rep-formula">{t('reputationFormula')}</p>
      <p className="meta">
        {onChain ? t('reputationOnChain') : t('reputationLocal')} ·{' '}
        <strong>
          {reputation} {t('reputation')}
        </strong>{' '}
        · {tier.name}
        {upcoming && (
          <>
            {' '}
            → {upcoming.name} ({upcoming.min}+)
          </>
        )}
      </p>
      <div className="rep-progress" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>

      <ul className="rep-earn-list">
        <li>
          <span>{engagementLabel('checkin')}</span>
          <RepBadge points={REP.checkin} />
        </li>
        <li>
          <span>{engagementLabel('completeActivity')}</span>
          <RepBadge points={REP.completeActivity} />
        </li>
        <li>
          <span>{engagementLabel('joinEvent')}</span>
          <RepBadge points={REP.joinEvent} />
        </li>
        <li>
          <span>{engagementLabel('submitProposal')}</span>
          <RepBadge points={REP.submitProposal} />
        </li>
        <li>
          <span>{engagementLabel('fundProposal')}</span>
          <RepBadge points={REP.fundProposal} />
        </li>
        <li>
          <span>{engagementLabel('verifyProject')}</span>
          <RepBadge points={REP.verifyProject} />
        </li>
        <li>
          <span>{engagementLabel('executeProject')}</span>
          <RepBadge points={REP.executeProject} />
        </li>
      </ul>

      <div className="tier-table">
        <p className="meta">{t('tierSystem')}</p>
        {TIER_THRESHOLDS.map((row) => (
          <div
            key={row.id}
            className={`tier-row${row.id === tier.id ? ' current' : ''}`}
          >
            <strong>{row.name}</strong>
            <span className="meta">
              {row.max == null ? `${row.min}+` : `${row.min}–${row.max}`}
            </span>
            <span className="meta">{row.can}</span>
          </div>
        ))}
      </div>
      <p className="hint">{t('reputationTrustNote')}</p>
    </section>
  )
}

function labelActivity(a: Activity, t: (key: CopyKey) => string) {
  switch (a.type) {
    case 'donation':
      return `${t('donation')} · ${a.amountMon} MON`
    case 'checkin':
      return `${t('checkin')} · ${a.checkInKind ? t(a.checkInKind) : ''}`
    case 'proposal_submit':
      return `${t('proposal')} · ${a.proposalTitle}`
    case 'proposal_execute':
      return `${t('executed')} · ${a.proposalTitle}`
    default:
      return t('activity')
  }
}


export default App
