# Community-Owned Location Platform — Design (Blitz MVP)

**Date:** 2026-08-08  
**Status:** Approved for implementation (chat lock + repo baru)

## Vision

People who use a place (e.g. running loop outside Kebun Raya Bogor) can co-own its future: participate → reputation → propose → fund → execute → prove → reputation up.

## Blitz MVP (vertical slice only)

One place → join → one proposal → micro-contribute MON → funded → proof → verify → reputation bump.

### In scope

- Solidity contract on **Monad Testnet (10143)**
- Native MON contributions (repeated micro-pledges)
- Contribution + Execution reputation counters
- Minimal web UI (wagmi): connect, place, propose, contribute, proof, verify

### Out of scope (pitch / roadmap)

- Full tier system (Visitor→Guardian)
- GPS distance / anti-cheat
- Multi-milestone escrow
- Social feed, map tiles as product core
- Indexer, AA, oracles, bridges

## Why Monad

Many small contributions should feel fast and cheap; demo shows live funding meter via repeated txs.

## On-chain vs off-chain

| On-chain | Off-chain |
|----------|-----------|
| Place, membership, proposal, contributes, status, proof URI string, verify, reputation | Map UI, photos/videos binaries, GPS |

## Contract API (MVP)

- `createPlace(name, locationLabel)`
- `joinPlace(placeId)`
- `createProposal(placeId, title, description, goalWei)`
- `contribute(proposalId)` payable
- Auto `Funded` when `raised >= goal`
- `submitProof(proposalId, proofUri, report)`
- `verify(proposalId)` — member verifies → `Verified`, bump creator execution rep
- Views for place, proposal, member reputation

## Stack

- `contracts/` — Foundry + Solidity ^0.8.20
- `web/` — Vite + React + wagmi + viem
- Network: Monad Testnet RPC `https://testnet-rpc.monad.xyz`

## Demo path (3 min)

Open place → create/show proposal → 2–3 wallets micro-contribute → funded → submit proof → verify → show reputation + explorer.
