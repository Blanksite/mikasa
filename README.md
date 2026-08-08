Mikasa
Community-owned location platform that turns real-world participation into reputation, governance, and collective ownership.
Mikasa enables communities to collectively improve the places they regularly uses like running tracks, public parks to community spaces by connecting physical participation with on-chain reputation, proposals, crowdfunding, governance, and accountable execution.
Built on Monad for fast, low-cost, high-throughput community interactions.

Problem
People use public and community spaces every day, but they usually have little ownership or influence over how those places develop.
A running community may repeatedly use the same running track, but:
Improvements depend on a small number of organizers or authorities.
Community members have no persistent record of their contribution.
Funding is often informal and difficult to track.
Contributors have little influence over future decisions.
There is no transparent connection between participation, contribution, and trust.
Mikasa changes this model by turning users from visitors into stakeholders.

Concept
Mikasa is built around a simple loop:
Participate → Earn Reputation → Govern → Fund → Execute → Verify → Earn Trust
Example:
A community regularly uses a running area around Kebun Raya Bogor.
Members can:
Check in and participate in activities.
Build reputation through verified participation.
Propose improvements such as lighting, trash bins, water stations, or running events.
Vote on community proposals.
Fund approved projects through the community treasury.
Execute projects using milestone-based funding.
Submit proof of execution.
Let the community verify the result.
Earn additional reputation for successful execution.
The goal is not simply to track where people go.
The goal is to make people feel that their participation gives them a stake in the future of the place.

Features
1. Wallet & Member Identity
Users connect their wallet to create their Mikasa identity.
Each member has an on-chain profile containing:
Wallet address
Reputation score
Tier
Contribution count
Governance activity
Successful project executions
Status: [IMPLEMENTED / TODO]

2. Location Communities
Each Mikasa location represents a community around a physical place.
Example:
Kebun Raya Bogor Running Community

Members:        428
Active Projects: 3
Treasury:       [PLACEHOLDER]
Reputation:     Community-wide
A location can have:
Members
Community proposals
Treasury
Active projects
Completed projects
Community governance
Status: [IMPLEMENTED / TODO]

3. Location Engagement
Users build reputation through meaningful participation.
Possible activities include:
Check-in +5
Complete activity +10
Join community event +15
Submit proposal +10
Fund a proposal +5
Verify project +5
Successfully execute project+50
Note: Exact reputation values are [PLACEHOLDER] and should be finalized during implementation.
Participation data such as GPS, photos, and activity details may remain off-chain while the resulting reputation record is recorded on-chain.

4. Reputation
Mikasa reputation represents trust earned through participation and contribution, rather than token ownership.
Reputation is based on:
Presence
   +
Contribution
   +
Governance
   +
Execution
   =
Reputation
Reputation cannot be directly purchased or manually assigned by users.
Only authorized contracts or verified actions can increase reputation.
Status: [IMPLEMENTED / TODO]

5. Tier System
Reputation determines the user's Mikasa tier.
Visitor 0–99 → Participate
Member 100–299 → Submit small proposals, vote
Contributor 300–699 → Larger proposals, funding
Steward 700–1499 → Manage community projects
 Guardian 1500+ → Higher-value governance and approvals
Exact thresholds and permissions are [PLACEHOLDER].
Tiers are not merely badges. They determine the level of trust and governance responsibility a member can hold.

6. Community Proposals
Members can propose improvements for a location.
Example proposals:
Improve running paths
Install lighting
Add trash bins
Add water stations
Organize running events
Organize community activities
A proposal contains:
Proposal ID
Location
Creator
Title
Description
Funding Target
Voting Deadline
Status
Milestones
Proposal lifecycle:
Draft
  ↓
Voting
  ↓
Approved / Rejected
  ↓
Funding
  ↓
Execution
  ↓
Verification
  ↓
Completed

7. Community Governance
Eligible members can vote on proposals.
Voting is recorded on-chain to provide transparent governance.
Example:
Proposal #12

Add Water Station

YES      127
NO        32

Status: APPROVED
Voting power is based on Mikasa reputation/tier rather than simply token balance.
Governance model: [PLACEHOLDER]
Voting duration: [PLACEHOLDER]
Approval threshold: [PLACEHOLDER]

8. Community Treasury
Each location can have a community treasury controlled by smart contracts.
Treasury funds can come from:
Community contributions
Approved funding allocations
[PLACEHOLDER: other funding sources]
Funds are not directly controlled by the proposal creator.
The smart contract determines when funds can be released.

9. Crowdfunding
Approved proposals can raise funds from community members.
Example:
Running Path Improvement

Target:       $2,000
Raised:       $1,420
Contributors: 87

██████████████░░░░░░ 71%
Contributions are held by the smart contract until the proposal's funding and execution conditions are met.
This enables many small contributions from community members.

10. Milestone-based Funding
Projects do not receive their entire budget immediately.
Example:
Project Budget: $2,000

Milestone 1
Materials purchased
$500
     ↓
Verification
     ↓
Milestone 2
Construction completed
$1,000
     ↓
Verification
     ↓
Milestone 3
Final inspection
$500
Funds are released by the treasury contract after the corresponding milestone is approved.

11. Proof of Execution
Project executors must provide evidence that an approved project was actually completed.
Possible evidence:
Before/after photos
Videos
Project reports
Receipts
Milestone completion evidence
Large media files remain off-chain.
The blockchain stores the corresponding proof reference/hash.
Example:
Proposal #12
Milestone #2

Proof CID:
[PLACEHOLDER]

Submitted by:
0x...

Timestamp:
[BLOCK TIMESTAMP]

Status:
Pending Verification

12. Community Verification
After proof is submitted, eligible community members can verify the milestone.
Project Executor
       ↓
Submit Proof
       ↓
Community Review
       ↓
Verified / Rejected
       ↓
Treasury Action
       ↓
Release Next Milestone
Successful project execution increases the executor's reputation.
Verification participants may also receive reputation for meaningful governance participation.

Monad Integration
Mikasa is built on Monad because its architecture involves a large number of small, frequent community interactions.
Examples include:
Check-ins
Reputation updates
Votes
Micro-contributions
Funding
Verification
Milestone approvals
These interactions benefit from Monad's high-performance EVM infrastructure.
Why Monad
High Throughput
A community-owned location can generate many simultaneous interactions.
For example:
User A → Check-in
User B → Vote
User C → Fund
User D → Verify
User E → Check-in
User F → Fund
...
Mikasa's architecture is designed for this type of high-frequency community activity.
Low Transaction Costs
Community participation should not require users to pay significant transaction fees for small actions.
This makes smaller contributions and frequent reputation/governance interactions more practical.
Fast User Experience
Governance and contribution actions should feel closer to a normal application experience rather than waiting through long transaction cycles.
EVM Compatibility
Mikasa can use standard EVM smart-contract tooling and infrastructure while benefiting from Monad's performance characteristics.

Why Web3?
Web3 is used where decentralization and verifiability provide actual value.
Member identity → Wallet-based ownership
Reputation → Portable on-chain trust
 Governance → Transparent voting
Treasury → Programmable community funds
Crowdfunding → Transparent contributions
Milestones → Automated fund release
Verification → Public accountability
Execution history → Immutable record
Location data, GPS, photos, and videos do not need to be stored directly on-chain.
This keeps the system practical while using blockchain where it provides the most value.

Core Architecture
                        MONAD
                           │
              ┌────────────┴────────────┐
              │                         │
       MikasaMember               MikasaLocation
              │                         │
              └────────────┬────────────┘
                           │
                    MikasaProposal
                           │
                ┌──────────┴──────────┐
                │                     │
             Voting              Crowdfunding
                │                     │
                └──────────┬──────────┘
                           │
                    MikasaTreasury
                           │
                       Milestones
                           │
                     Proof Submitted
                           │
                      Verification
                           │
                    Funds Released
                           │
                    Reputation ↑
                           │
                       Tier ↑
                           │
                    Governance ↑

Smart Contracts
The MVP is expected to contain the following contracts:
MikasaMember.sol
Responsible for:
Member registration
Reputation
Tier calculation
Contribution statistics
Governance eligibility

MikasaLocation.sol
Responsible for:
Location registration
Community association
Location-level configuration
Community membership

MikasaProposal.sol
Responsible for:
Proposal creation
Proposal status
Voting
Approval/rejection
Milestone configuration

MikasaTreasury.sol
Responsible for:
Receiving funds
Crowdfunding
Proposal funding
Milestone-based releases

MikasaVerification.sol
Responsible for:
Proof submission
Milestone verification
Verification status
Execution reputation updates
Final contract architecture: [PLACEHOLDER — may be consolidated depending on implementation]

Tech Stack
Layer → Technology
Blockchain → Monad
Smart Contracts → Solidity
Contract Framework -->[PLACEHOLDER: Foundry / Hardhat]
Frontend -->[PLACEHOLDER]
Wallet → [PLACEHOLDER: MetaMask / RainbowKit / Privy / etc.]
Web3 Library -->[PLACEHOLDER: viem / ethers]
Storage → [PLACEHOLDER: IPFS / Pinata / other]
Database -->[PLACEHOLDER: Supabase / Firebase / none]
Testing -->[PLACEHOLDER]
Deployment -->[PLACEHOLDER]

Installation
Prerequisites
Node.js [VERSION]
npm / pnpm / yarn [CHOOSE ONE]
Git
A Monad-compatible wallet
Monad testnet RPC access
[PLACEHOLDER: Foundry, if used]
Installation
git clone [REPOSITORY_URL]
cd mikasa

npm install
Environment Variables
Create .env:
VITE_MONAD_RPC_URL=[PLACEHOLDER]
VITE_CHAIN_ID=[PLACEHOLDER]

VITE_MEMBER_CONTRACT=[PLACEHOLDER]
VITE_LOCATION_CONTRACT=[PLACEHOLDER]
VITE_PROPOSAL_CONTRACT=[PLACEHOLDER]
VITE_TREASURY_CONTRACT=[PLACEHOLDER]
VITE_VERIFICATION_CONTRACT=[PLACEHOLDER]

VITE_IPFS_GATEWAY=[PLACEHOLDER]

Local Development
npm run dev
Open the URL shown in the terminal.
Smart Contract Development
[PLACEHOLDER]
Run Tests
[PLACEHOLDER]
Build
npm run build

Demo Flow
The recommended hackathon demo follows one complete community lifecycle.
1. Join a Location
Connect wallet and join:
Kebun Raya Bogor Running Community

2. Participate
User completes a running activity and receives reputation.
+10 Reputation

3. Create Proposal
User proposes:
Install a water station near the running route
Funding target:
[PLACEHOLDER]

4. Community Votes
Members vote on the proposal.
YES  → Approved
NO   → Rejected

5. Community Funds the Project
Multiple members contribute.
Member A → $2
Member B → $5
Member C → $10
...
The funds remain in the treasury smart contract.

6. Project Execution
The Steward executes the approved project.

7. Submit Proof
The Steward uploads before/after evidence.
The proof reference is recorded on-chain.

8. Community Verification
Eligible members verify the milestone.

9. Treasury Releases Funds
Once verified:
Milestone approved
       ↓
Smart contract releases funds
       ↓
Next milestone unlocked

10. Reputation Increases
Successful execution increases the Steward's reputation.
684 REP
   ↓
734 REP
   ↓
New Tier
The user now has more trust and governance responsibility.

User Stories
US-1 — Join a location
As a community member,
I want to connect my wallet and join a location,
so that I can participate in its community.
Success case
Wallet connects successfully.
User becomes a Mikasa member.
Location membership is recorded.
Member profile displays reputation and tier.
Edge cases
Wallet connection rejected.
User already belongs to the location.
Wrong network.
Transaction rejected.

US-2 — Earn reputation through participation
As a location participant,
I want to receive reputation for verified activity,
so that my contribution to the community is recognized.
Success case
Activity is verified.
Reputation is updated.
New reputation appears on the user's profile.
Edge cases
Duplicate activity.
Invalid proof.
Activity outside the location.
Unauthorized reputation update.

US-3 — Create a proposal
As a Member,
I want to propose an improvement,
so that the community can decide whether to support it.
Success case
Proposal is created.
Proposal is associated with a location.
Voting becomes available.
Edge cases
User lacks proposal permission.
Invalid funding target.
Missing proposal information.
Transaction rejected.

US-4 — Vote on a proposal
As a community member,
I want to vote on proposals,
so that I can influence the development of my location.
Success case
Eligible member votes.
Vote is recorded on-chain.
Proposal voting state updates.
Edge cases
User is not eligible.
User already voted.
Voting period expired.
Wrong network.

US-5 — Fund a project
As a community member,
I want to contribute funds to an approved proposal,
so that the community can make the project happen.
Success case
Contribution is transferred to the treasury.
Funding progress updates.
Contribution is associated with the proposal.
Edge cases
Proposal not approved.
Funding period expired.
Invalid amount.
Transaction rejected.

US-6 — Execute a milestone
As a Steward,
I want to submit proof that a milestone is complete,
so that the community can verify the work and unlock funding.

US-7 — Verify execution
As an eligible community member,
I want to verify project execution,
so that community funds are only released when work is actually completed.

US-8 — Build trust
As a contributor,
I want successful contributions and executions to increase my reputation,
so that my governance responsibility grows with my proven contribution.

Business Rules
Reputation
Reputation can only be increased by authorized actions.
Users cannot directly assign reputation to themselves.
Successful project execution provides higher reputation than simple presence.
Exact reputation values are [PLACEHOLDER].
Governance
Only eligible members can vote.
A member can vote only once per proposal [PLACEHOLDER — unless quadratic/weighted voting is implemented].
Voting ends at the proposal deadline.
Approval threshold is [PLACEHOLDER].
Treasury
Funds are controlled by the treasury smart contract.
Proposal creators cannot directly withdraw community funds.
Funds are released according to approved milestones.
Verification is required before milestone release.
Proof
Proof metadata is stored off-chain.
A proof reference/hash is recorded on-chain.
Proof must be associated with a specific proposal and milestone.
Verification determines whether the milestone can proceed.

Testing
Tests should cover:
Smart Contracts
Member registration
Reputation updates
Tier calculation
Location membership
Proposal creation
Voting
Voting eligibility
Double voting prevention
Treasury deposits
Crowdfunding
Milestone release
Unauthorized withdrawal prevention
Proof submission
Verification
Reputation rewards
Frontend
Wallet connection
Wrong-network handling
Proposal creation
Voting state
Funding state
Transaction pending/success/error states
Reputation display
Tier display
Run:
[PLACEHOLDER]

Project Structure
Expected structure:
/
├── contracts/
│   ├── MikasaMember.sol
│   ├── MikasaLocation.sol
│   ├── MikasaProposal.sol
│   ├── MikasaTreasury.sol
│   └── MikasaVerification.sol
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── contracts/
│   └── public/
│
├── test/
│   ├── MikasaMember.t.sol
│   ├── MikasaProposal.t.sol
│   ├── MikasaTreasury.t.sol
│   └── MikasaVerification.t.sol
│
├── script/
│   └── Deploy.s.sol
│
├── README.md
└── [PLACEHOLDER]
The final structure may change based on the selected frontend and smart-contract tooling.

Deployment
Network
Monad Testnet
Network configuration:
Chain ID:       [PLACEHOLDER]
RPC:            [PLACEHOLDER]
Explorer:       [PLACEHOLDER]
Faucet:         [PLACEHOLDER]
Smart Contracts
ContractAddressMikasaMember[PLACEHOLDER]MikasaLocation[PLACEHOLDER]MikasaProposal[PLACEHOLDER]MikasaTreasury[PLACEHOLDER]MikasaVerification[PLACEHOLDER]
Frontend
Live URL: [PLACEHOLDER]

Demo
Location
Kebun Raya Bogor Running Community
Example Project
Water Station Improvement
Demo Accounts
RoleWalletMember[PLACEHOLDER]Contributor[PLACEHOLDER]Steward[PLACEHOLDER]Guardian[PLACEHOLDER]
Demo Transaction
Proposal: [PLACEHOLDER]
Voting transaction: [PLACEHOLDER]
Funding transaction: [PLACEHOLDER]
Verification transaction: [PLACEHOLDER]
Milestone release: [PLACEHOLDER]

Known Limitations
MVP focuses on a limited number of locations.
Physical activity verification is not fully trustless.
GPS and activity data may be susceptible to spoofing.
Photos/videos are stored off-chain.
Reputation parameters are currently [PLACEHOLDER].
Governance parameters may be simplified for the hackathon.
Community treasury uses testnet assets during the hackathon.
Real-world project execution depends on off-chain community actions.
[PLACEHOLDER: additional limitations discovered during implementation]

Future Improvements
Reputation & Anti-Sybil
Proof-of-presence improvements
Anti-GPS-spoofing mechanisms
Device/activity attestation
Sybil resistance
Reputation decay
Location-specific reputation
Governance
Quadratic voting
Delegated governance
Proposal categories
Guardian-based dispute resolution
Emergency treasury controls
Community Economy
Recurring community funding
Sponsorships
Local business partnerships
Grants
Community rewards
Locations
Multiple communities per location
Cross-location reputation
City-wide governance
Inter-community funding
Physical Verification
Community validator networks
Multi-party verification
Computer-vision-assisted proof verification
IoT / sensor integrations

Why Mikasa
Most location platforms answer:
"Where should I go?"
Mikasa asks:
"What can we build together where we already go?"
Mikasa turns physical participation into a persistent layer of trust, governance, and ownership.
Come for the place.
Contribute to the community.
Earn trust.
Help shape what comes next.

