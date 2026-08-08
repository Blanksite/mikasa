import { useEffect, useMemo, useState } from 'react'
import { formatEther, parseEther } from 'viem'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { communityPlaceAbi } from './abi'
import { CONTRACT_ADDRESS, STATUS_LABEL } from './config'

const hasContract = Boolean(CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith('0x'))

function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending: connecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract, data: txHash, isPending, error: writeError, reset } =
    useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const [placeName, setPlaceName] = useState('Lingkar Kebun Raya Bogor')
  const [placeLoc, setPlaceLoc] = useState('Bogor — jalur lari / pejalan kaki')
  const [placeId, setPlaceId] = useState('1')
  const [proposalId, setProposalId] = useState('1')
  const [title, setTitle] = useState('Water station di jalur lari')
  const [desc, setDesc] = useState('Patungan titik minum untuk pelari lingkar luar')
  const [goalMon, setGoalMon] = useState('0.05')
  const [contributeMon, setContributeMon] = useState('0.01')
  const [proofUri, setProofUri] = useState('https://example.com/before-after.jpg')
  const [report, setReport] = useState('Material + instalasi selesai')

  const pid = useMemo(() => {
    try {
      return BigInt(/^\d+$/.test(placeId) ? placeId : '0')
    } catch {
      return 0n
    }
  }, [placeId])
  const propId = useMemo(() => {
    try {
      return BigInt(/^\d+$/.test(proposalId) ? proposalId : '0')
    } catch {
      return 0n
    }
  }, [proposalId])

  const { data: placeCount, refetch: refetchPlaceCount } = useReadContract({
    address: hasContract ? CONTRACT_ADDRESS : undefined,
    abi: communityPlaceAbi,
    functionName: 'placeCount',
    query: { enabled: hasContract },
  })

  const { data: proposalCount, refetch: refetchProposalCount } = useReadContract({
    address: hasContract ? CONTRACT_ADDRESS : undefined,
    abi: communityPlaceAbi,
    functionName: 'proposalCount',
    query: { enabled: hasContract },
  })

  const { data: place, refetch: refetchPlace } = useReadContract({
    address: hasContract ? CONTRACT_ADDRESS : undefined,
    abi: communityPlaceAbi,
    functionName: 'getPlace',
    args: [pid],
    query: { enabled: hasContract && pid > 0n },
  })

  const { data: proposal, refetch: refetchProposal } = useReadContract({
    address: hasContract ? CONTRACT_ADDRESS : undefined,
    abi: communityPlaceAbi,
    functionName: 'getProposal',
    args: [propId],
    query: { enabled: hasContract && propId > 0n },
  })

  const { data: rep, refetch: refetchRep } = useReadContract({
    address: hasContract ? CONTRACT_ADDRESS : undefined,
    abi: communityPlaceAbi,
    functionName: 'getReputation',
    args: address ? [pid, address] : undefined,
    query: { enabled: hasContract && !!address && pid > 0n },
  })

  const refresh = () => {
    void refetchPlaceCount()
    void refetchProposalCount()
    void refetchPlace()
    void refetchProposal()
    void refetchRep()
  }

  useEffect(() => {
    if (!isSuccess) return
    refresh()
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess])

  const wrongChain = isConnected && chainId !== 10143

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Place OS · Monad Testnet</p>
        <h1>Community-Owned Location</h1>
        <p className="lede">
          Tempat yang kamu pakai tiap hari — ikut proposal, micro-patungan, bukti
          eksekusi, reputasi naik.
        </p>
        <div className="wallet">
          {!isConnected ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => connect({ connector: connectors[0] })}
            >
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          ) : (
            <>
              <span className="addr">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
              <button type="button" className="ghost" onClick={() => disconnect()}>
                Disconnect
              </button>
            </>
          )}
        </div>
        {wrongChain && (
          <p className="warn">Switch network ke Monad Testnet (chain id 10143).</p>
        )}
        {!hasContract && (
          <p className="warn">
            Set <code>VITE_CONTRACT_ADDRESS</code> di <code>web/.env</code> setelah
            deploy Remix.
          </p>
        )}
      </header>

      <main className="grid">
        <section>
          <h2>1. Place</h2>
          <label>
            Name
            <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
          </label>
          <label>
            Location
            <input value={placeLoc} onChange={(e) => setPlaceLoc(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={!hasContract || !isConnected || isPending}
            onClick={() =>
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: communityPlaceAbi,
                functionName: 'createPlace',
                args: [placeName, placeLoc],
              })
            }
          >
            Create place
          </button>
          <label>
            Place ID
            <input value={placeId} onChange={(e) => setPlaceId(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={!hasContract || !isConnected || isPending}
            onClick={() =>
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: communityPlaceAbi,
                functionName: 'joinPlace',
                args: [pid],
              })
            }
          >
            Join place
          </button>
          {place && (
            <div className="card">
              <strong>{place[0]}</strong>
              <p>{place[1]}</p>
              <p>
                Members: {place[3].toString()} · Treasury:{' '}
                {formatEther(place[4])} MON
              </p>
            </div>
          )}
        </section>

        <section>
          <h2>2. Proposal</h2>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Description
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </label>
          <label>
            Goal (MON)
            <input value={goalMon} onChange={(e) => setGoalMon(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={!hasContract || !isConnected || isPending}
            onClick={() =>
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: communityPlaceAbi,
                functionName: 'createProposal',
                args: [pid, title, desc, parseEther(goalMon || '0')],
              })
            }
          >
            Create proposal
          </button>
          <label>
            Proposal ID
            <input
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
            />
          </label>
        </section>

        <section>
          <h2>3. Micro-fund (Monad)</h2>
          <label>
            Contribute (MON)
            <input
              value={contributeMon}
              onChange={(e) => setContributeMon(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!hasContract || !isConnected || isPending}
            onClick={() =>
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: communityPlaceAbi,
                functionName: 'contribute',
                args: [propId],
                value: parseEther(contributeMon || '0'),
              })
            }
          >
            Contribute
          </button>
          {proposal && (
            <div className="card">
              <strong>{proposal[2]}</strong>
              <p>{proposal[3]}</p>
              <p>
                {formatEther(proposal[5])} / {formatEther(proposal[4])} MON ·{' '}
                {STATUS_LABEL[proposal[6]] ?? proposal[6]}
              </p>
              <div className="meter">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      Number((proposal[5] * 10000n) / (proposal[4] || 1n)) / 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </section>

        <section>
          <h2>4. Proof → Verify</h2>
          <label>
            Proof URI
            <input value={proofUri} onChange={(e) => setProofUri(e.target.value)} />
          </label>
          <label>
            Report
            <input value={report} onChange={(e) => setReport(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={!hasContract || !isConnected || isPending}
            onClick={() =>
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: communityPlaceAbi,
                functionName: 'submitProof',
                args: [propId, proofUri, report],
              })
            }
          >
            Submit proof
          </button>
          <button
            type="button"
            disabled={!hasContract || !isConnected || isPending}
            onClick={() =>
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: communityPlaceAbi,
                functionName: 'verify',
                args: [propId],
              })
            }
          >
            Verify (member)
          </button>
          {rep && (
            <div className="card">
              <p>Joined: {rep[2] ? 'yes' : 'no'}</p>
              <p>Contribution rep: {rep[0].toString()}</p>
              <p>Execution rep: {rep[1].toString()}</p>
            </div>
          )}
        </section>
      </main>

      <footer>
        <button type="button" className="ghost" onClick={refresh}>
          Refresh reads
        </button>
        <p>
          Places: {placeCount?.toString() ?? '—'} · Proposals:{' '}
          {proposalCount?.toString() ?? '—'}
        </p>
        {(isPending || confirming) && <p className="status">Tx pending…</p>}
        {txHash && (
          <p className="status">
            Tx:{' '}
            <a
              href={`https://testnet.monadvision.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {txHash.slice(0, 10)}…
            </a>
          </p>
        )}
        {writeError && <p className="warn">{writeError.message}</p>}
      </footer>
    </div>
  )
}

export default App
