# Mikasa

Community-owned location platform on **Monad** — “rumah kami.”

Spaces (Place · Project · Cause · Event) → check-in → propose → fund → prove → reputation & tiers.

**Live:** https://mikasa-snowy.vercel.app  
**Network:** Monad Testnet · Chain ID `10143` · [MonadVision](https://testnet.monadvision.com) · [Faucet](https://faucet.monad.xyz)

## Stack

```
contracts/   # MikasaMembership · Location · Treasury · Proposal (+ legacy CommunityPlace)
web/         # Vite + React + wagmi
docs/        # design specs
```

## Run locally

```bash
cd web
cp .env.example .env   # fill modular contract addresses
npm install
npm run dev
```

## Deploy

Contracts: Remix / Foundry → paste addresses into `web/.env` (see `.env.example`).

UI (Vercel): Root Directory = `web`, then set:

- `VITE_MEMBERSHIP_ADDRESS`
- `VITE_LOCATION_ADDRESS`
- `VITE_TREASURY_ADDRESS`
- `VITE_PROPOSAL_ADDRESS`

## Demo path

1. Connect wallet (Rabby/MetaMask · Monad Testnet)
2. Register as Mikasa member
3. Check in at a Space (GPS Nearby or self)
4. Submit a community proposal + vote / fund
5. Watch reputation & tier move on Profile

## Why Monad

Many small MON actions — check-ins, votes, micro-funding — stay fast and cheap on-chain.
