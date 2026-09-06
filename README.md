# Kynlo

Kynlo is a protected inactivity and succession protocol for Coinbase Tokenized Stocks on Base.

Status: product foundation and unaudited contract model. It is not cleared for deposits or Base mainnet deployment. Base mainnet is the production target. Base Sepolia is staging only.

## Architecture

- `apps/web`: Next.js, TypeScript, Tailwind, and the Kynlo visual system.
- `contracts`: non-upgradeable Solidity contracts and Foundry tests.
- `config`: release-verified Base mainnet stock registry data. Empty until Phase 3 verification.
- `deployments`: explicit staging and production deployment records.
- `docs`: architecture, threat model, legal boundary, verification record, and runbooks.

The chain controls custody state. `KynloAssetRegistry` allows verified stock addresses for new deposits. `KynloVault` holds raw token units and enforces Legacy Plan timing, exact Successor claim authority, Proof of Life, the Protection Window, and Succession. Registry administration cannot transfer user assets.

## Local setup

```powershell
npm install
npm run dev
```

```powershell
npm run lint
npm run build
npm run test:web
npm run compile:contracts
```

Foundry checks, once Foundry is installed:

```powershell
cd contracts
forge fmt --check
forge build
forge test -vvv
```

## Contract Verification

The `Kynlo Contract Security` GitHub Actions workflow runs on pull requests, pushes to
`main`, and manual dispatch. It installs Foundry and Slither, checks formatting, builds the
contracts, executes the full unit suite, runs each fuzz property 1,000 times, runs stateful
invariants with 256 runs at depth 64, generates coverage, and analyzes the Foundry project with
Slither. CI keeps the test, coverage, and Slither reports as downloadable workflow artifacts.
Critical or high Slither findings, formatting failures, build failures, and test failures block
Base Sepolia readiness. The workflow does not deploy contracts.

## Mainnet boundaries

- Production timers enforce at least 90 days of inactivity and a 30-day Protection Window.
- One to three Successors must allocate exactly 10,000 basis points.
- The owner assigns exact receiving wallets and can Seal without a Successor transaction.
- Editing Successors increments the configuration version, returns the plan to Draft, and requires a fresh Seal.
- New deposits accept registry-enabled official stock contracts only.
- Registry disablement and the deposit pause never block existing exits.
- Kynlo does not detect death or replace a legal will, probate, or estate law.
- Receiving Coinbase Tokenized Stocks remains subject to issuer eligibility and transfer policies at the time of transfer.

Production addresses, multisig ownership, audit reports, and registry verification stay blank until their release gates are complete.
