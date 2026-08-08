# Mikasa — App UX Spec

**Date:** 2026-08-08  
**Auth:** Wallet only (Rabby / MetaMask · Monad Testnet)

## Product scope

Mikasa is not limited to physical locations. The neutral product object is a
**Space**, which can be:

- **Place** — parks, running routes, community facilities
- **Project** — indie games, creative work, open-source products
- **Cause** — public goods and community initiatives
- **Event** — meetups, competitions, local activities

Donate and proposal actions apply to every Space. Physical check-in applies only
to Place and Event.

## Language

- Product UI is **English-only** for the Blitz MVP.

## Brand

- Name: **Mikasa** (“rumah kami”)
- Logo: circular cat guardian mascot (`web/public/mikasa-logo.png`)

## Entry

1. Landing / login screen with Mikasa branding
2. **Connect wallet** → enter app
3. Default screen: **Feed** (home)

## Feed (home)

Public activity stream across all Spaces — other people’s activity + your own.

Each row:

- Actor avatar + name (tap → **Other Profile**, or own Profile if self)
- Activity type: donation / check-in / proposal submit / execute
- Space name (tap → Space page)
- Optional photo
- Timestamp

Empty state: prompt to check in / donate / submit a proposal.

## Other Profile

Public view of another user’s contribution record.

- Display name + photo (read-only)
- Summary stats (public): donated, check-ins, proposals, executed
- Tabs:
  - **Activities** — their public activity path
  - **Spaces** — spaces they contributed to
  - **Proposals** — proposals they submitted

No edit controls. Own profile remains editable via header/avatar → Profile.

## Own Profile

Reachable from header (avatar / Mikasa mark) or Feed (tap self).

Editable:

- Display **name**
- **Photo** (avatar) — off-chain for Blitz

### Tab: My Activities

Timeline of *my* activity across all spaces (path-style, optional photo).

### Tab: My Spaces

List of Spaces I contributed to (thumb + my stats). Tap → Space page.

### Tab: My Proposals

List of proposals I submitted. Tap → Space page (Ongoing proposals).

## Space page

### Stats (global for that Space)

- Funds raised
- Total check-ins
- Total proposals submitted
- Total projects completed

### Tabs

1. **Activities** — people active in this space  
2. **Ongoing proposals** — vote

## Global actions (dock)

Visible on **Feed**, **Profile**, and **Space** (hidden on forms).

1. **Check-in** — Place/Event only · activities depend on the Space  
   (route: visit/run/walk · desk/home: visit/work/code/study/hangout · event: attend/volunteer/host) · photo required  
   - Type space name → suggestions from **map search** (OpenStreetMap) + existing Mikasa spaces; picking a map hit saves the pin (`lat`/`lng`) for GPS Nearby  
   - **Geo Spaces** (`presence: geo`): browser GPS must be within `radiusM` of the pin, accuracy ≤ 100m → badge **Nearby (device GPS)** (not tamper-proof; emulators can spoof)  
   - **Self Spaces** (`presence: self`, e.g. home desk): no GPS gate  
   - Presenter/emulator demo: `VITE_GEO_DEMO=1` mocks the pin → badge **Demo**, not Nearby  
   - Optional “Open in Maps” link to the pin  
2. **Donate** — pick Space · amount (MON)  
3. **Proposal** — pick Space · title, description, goal (MON)

Forms include explicit **← Profile / ← Feed** back control; dock hidden while form is open.

## On-chain vs off-chain (Blitz)

| Feature | Blitz approach |
|---------|----------------|
| Donate / contribute | On-chain when linked |
| Create proposal | On-chain when linked |
| Vote | Local / on-chain where supported |
| Check-in + photos | Off-chain local store |
| Feed + other profiles | Shared activity store (local / seeded demo peers for Blitz) |
| Profile name + photo | Off-chain localStorage keyed by wallet |

## Navigation map

```
Login (wallet)
  └── Feed (HOME)
        ├── tap actor → Other Profile (or own Profile)
        ├── tap space → Space
        │                 ├── stats
        │                 ├── Activities
        │                 └── Ongoing proposals (+ vote)
        ├── header → own Profile
        │              ├── My Activities
        │              ├── My Spaces
        │              ├── My Proposals
        │              └── Edit profile
        └── dock: Check-in | Donate | Proposal
```

## Status

- Locked decisions: Feed = default home; Other Profile from actor taps; English-only; Spaces not places-only.
- **Not implemented yet** (awaiting build pass).
