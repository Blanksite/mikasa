# Community-Owned Location Platform — Design (Mikasa modular)

**Date:** 2026-08-08 (updated modular)  
**Status:** Modular contracts implemented; deploy addresses into `web/.env`

## Vision

People who use a place can co-own its future: presence → reputation → tier → propose → vote → fund → milestone proof → verify → release → reputation up.

## Modular contracts (Monad Testnet)

| Module | Role |
|--------|------|
| `MikasaMembership` | Register; reputation (module-only `addReputation`); tier; voting power |
| `MikasaLocation` | Location pin; join; check-in |
| `MikasaTreasury` | Escrow + `releaseMilestone` |
| `MikasaProposal` | Vote → crowdfund → proof CID → verify → release |

Legacy single-contract: `CommunityPlace.sol`.

See [`contracts/README.md`](../../contracts/README.md) for deploy.

## Tier (on-chain permissions)

- 0–99 Visitor · 100–299 Member · 300–699 Contributor · 700–1499 Steward · 1500+ Guardian
- Voting power: 0 / 1 / 2 / 3 / 5
- Propose / vote / fund: Member+
- Manage / submit proof (non-creator): Steward+

Join/found location awards +100 rep (Blitz bootstrap to Member).

## Location engagement → reputation — Status: IMPLEMENTED

| Action | Rep |
|--------|-----|
| Check-in | +5 |
| Complete activity | +10 |
| Join community event | +15 |
| Submit proposal | +10 |
| Fund a proposal | +5 |
| Verify project | +5 |
| Successfully execute project | +50 |

GPS / photos / activity details may stay off-chain; reputation is recorded on-chain via authorized modules only.

## On-chain vs off-chain

| On-chain | Off-chain |
|----------|-----------|
| Membership, location, proposals, escrow, milestone CID, verify, release, reputation | Maps search, GPS Nearby, photos, feed UX |

## Demo path

Register → Anchor location → Check-in → Propose (3 milestones) → Vote → Close voting → Contribute → Proof → Verify → MON release → tier/power on Profile.
