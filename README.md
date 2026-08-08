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

## Demo path (3 min)

1. Connect wallet (Rabby/MetaMask on Monad Testnet)
2. Create place: `Lingkar Kebun Raya Bogor`
3. Create proposal: water station / lampu jalur (small goal in MON)
4. Contribute several small amounts (micro-tx story)
5. Submit proof URL → Verify → see reputation bump

## Why Monad

Repeated small contributions should feel fast and cheap — the funding meter updates live on-chain.
