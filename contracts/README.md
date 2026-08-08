# Mikasa contracts (Foundry)

## Modules

1. `MikasaMembership` — register, reputation (module-only), tier, voting power
2. `MikasaLocation` — create/join location, check-in
3. `MikasaTreasury` — location pot + proposal escrow + milestone release
4. `MikasaProposal` — vote → fund → proof → verify → release

Legacy: `CommunityPlace.sol` (single-contract MVP).

## Install Foundry (once)

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
cd contracts
forge install foundry-rs/forge-std --no-commit
```

## Test

```bash
forge test -vv
```

## Deploy Monad Testnet

```bash
export PRIVATE_KEY=0x...
forge script script/DeployMikasa.s.sol:DeployMikasa --rpc-url https://testnet-rpc.monad.xyz --broadcast
```

Copy printed addresses into `web/.env`.

## Remix path (no Foundry)

1. Compile each file (0.8.20). Deploy **Membership** first.
2. Deploy **Location**(membership).
3. Deploy **Treasury**.
4. Deploy **Proposal**(membership, location, treasury).
5. On Membership: `setModule(location, true)`, `setModule(proposal, true)`.
6. On Treasury: `setProposalModule(proposal)`.
