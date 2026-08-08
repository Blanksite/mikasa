# Place OS

Community-Owned Location Platform — Monad Blitz MVP.

**Vision:** people who use a place (e.g. running loop at Kebun Raya Bogor) co-own its future: participate → propose → micro-fund → prove → reputation.

## Repo layout

```
contracts/src/CommunityPlace.sol   # Remix-ready Solidity MVP
web/                               # Vite + React + wagmi
docs/superpowers/specs/            # design lock
```

## Network — Monad Testnet

| | |
|--|--|
| Chain ID | `10143` |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | https://testnet.monadvision.com |
| Faucet | https://faucet.monad.xyz |

## 1. Deploy contract (Remix)

1. Open https://remix.ethereum.org
2. Paste `contracts/src/CommunityPlace.sol`
3. Compile with `0.8.20+`
4. Deploy & Run → Injected Provider → Monad Testnet
5. Deploy → copy address into `web/.env`:

```
VITE_CONTRACT_ADDRESS=0x...
```

## 2. Run UI

```bash
cd web
npm install
npm run dev
```

## 3. Deploy UI to Vercel

App lives in `web/` (Vite + React).

1. Push repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → import the repo
3. **Root Directory:** `web`
4. Framework preset: Vite (auto via `web/vercel.json`)
5. Add Environment Variables (Production):

| Name | Value |
|------|--------|
| `VITE_MEMBERSHIP_ADDRESS` | `0x1D6B5D243a7A898465dd7eCa2ca833ae0aC1F1Ea` |
| `VITE_LOCATION_ADDRESS` | `0xaB782CE2EeD13CC063372dd19BfCb83941207Ff1` |
| `VITE_TREASURY_ADDRESS` | `0xa539BE23bef4a92723F79C18ff00611F1467aA6b` |
| `VITE_PROPOSAL_ADDRESS` | `0x04a8E28872a7d69d26aca59B62e226be5a5645C3` |
| `VITE_CONTRACT_ADDRESS` | optional legacy |

6. Deploy → open the URL → connect wallet on Monad Testnet

CLI alternative:

```bash
cd web
npx vercel
# then set env vars in dashboard or:
npx vercel env add VITE_MEMBERSHIP_ADDRESS
npx vercel --prod
```

Local production check:

```bash
cd web
npm run build
npm run preview
```

## Demo path (3 min)

1. Connect wallet (Rabby/MetaMask on Monad Testnet)
2. Create place: `Lingkar Kebun Raya Bogor`
3. Create proposal: water station / lampu jalur (small goal in MON)
4. Contribute several small amounts (micro-tx story)
5. Submit proof URL → Verify → see reputation bump

## Why Monad

Repeated small contributions should feel fast and cheap — the funding meter updates live on-chain.
