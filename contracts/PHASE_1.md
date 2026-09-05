# Kynlo Phase 1: Smart Contract Engine

## Architecture

The Phase 1 engine uses two non-upgradeable contracts compiled with Solidity 0.8.28.

- `KynloAssetRegistry` controls which token contracts are eligible for new deposits and can pause new deposits globally.
- `KynloVault` owns no administrative role. It holds attributable token positions and enforces Legacy Plan lifecycle, recovery, withdrawal, cancellation, and Succession claims.

Registry support and pause checks occur only when a new deposit is made. They are intentionally absent from withdrawal, cancellation, and claim paths so an administrative policy change cannot strand an existing position.

## Production lifecycle

- Minimum inactivity period: 90 days
- Minimum Protection Window: 30 days
- State order: `DRAFT`, `ACTIVE`, `PROTECTION`, `SUCCESSION_READY`, `CANCELLED`, `COMPLETED`
- The inactivity deadline is the first timestamp in `PROTECTION`.
- The end of the Protection Window is the first timestamp in `SUCCESSION_READY`.
- A successful Proof of Life check-in during `PROTECTION` returns the plan to `ACTIVE`.

No accelerated timing exists in this production contract.

## Claim accounting

- All amounts are raw ERC-20 units.
- Each plan records deposited and remaining attributable units per token.
- The vault records a stable per-position distribution base when the first mature claim is attempted successfully.
- Every non-final successor receives `floor(base * shareBps / 10000)`.
- The final successor receives the residual.
- Claim state and attributable accounting are updated before token transfer.
- Any transfer revert rolls the transaction back, including the claimed flag and distribution base.
- Direct token transfers to the vault do not increase a Legacy Plan entitlement.
- Fee-on-transfer deposits are rejected when the received amount differs from the requested raw amount.

## Security boundaries

- No proxy or upgrade path
- No `delegatecall`
- No `tx.origin`
- No arbitrary external execution
- No vault administrator
- No administrative withdrawal or seizure path
- `SafeERC20` for transfers
- `ReentrancyGuard` on every asset-moving entry point
- Checks-effects-interactions on withdrawals, cancellations, and claims
- Custom errors and lifecycle events
- Full-precision `Math.mulDiv` allocation
- Per-token `totalAttributed` accounting

## Test coverage

Foundry tests cover:

- plan validation for successor count, addresses, uniqueness, owner exclusion, positive shares, exact basis-point totals, and production timing minima
- exact-wallet acceptance, stranger rejection, duplicate acceptance, complete acceptance before arming, and nonzero asset requirements
- address and allocation changes invalidating all prior acceptance through `successorVersion`
- exact Active, Protection, and Succession Ready timestamp boundaries
- Protection recovery and frozen mutations
- forbidden mature mutations
- supported, unsupported, paused, fee-on-transfer, withdrawal, cancellation, and multiple-asset paths
- deterministic rounding, residual dust, reversed claim order, duplicate claims, premature claims, transfer-policy failures, and live-balance isolation
- registry disable and deposit pause preserving exits and claims
- registry administrator inability to move vault assets
- fuzzed raw-unit conservation, lifecycle boundaries, and withdrawals
- stateful invariants for position accounting, per-token attribution, and vault balance coverage

## Verification commands

```sh
npm run compile:contracts
cd contracts && forge fmt --check
cd contracts && forge build
cd contracts && forge test
cd contracts && slither .
```

The npm compiler command is available in the current project and compiles contracts plus all test sources with optimizer settings. Foundry and Slither remain the required execution and static-analysis gates before Phase 1 can be marked complete.
