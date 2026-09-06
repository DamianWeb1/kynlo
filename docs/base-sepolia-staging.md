# Base Sepolia staging

Base Sepolia uses chain ID `84532`. The deployed `KynloVault` is the production contract with the
same 90-day inactivity minimum and 30-day Protection Window minimum. No accelerated constants are
compiled into the production deployment.

## Protected GitHub deployment

The manual `Kynlo Base Sepolia Staging` workflow is separate from the permanent contract security
gate. It never runs on a push or pull request. It requires the protected `base-sepolia` GitHub
environment and the exact confirmation text `DEPLOY_BASE_SEPOLIA` before broadcasting.

Configure these environment secrets:

- `BASE_SEPOLIA_RPC_URL`
- `BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY`
- `BASE_SEPOLIA_DEPLOYER_ADDRESS`
- `BASE_SEPOLIA_REGISTRY_ADMIN`
- `BASE_SEPOLIA_REGISTRY_ADMIN_PRIVATE_KEY`
- `BASE_SEPOLIA_MOCK_POLICY_ADMIN`
- `BASE_SEPOLIA_OWNER_PRIVATE_KEY`
- `BASE_SEPOLIA_OWNER_ADDRESS`
- `BASE_SEPOLIA_SUCCESSOR_A_ADDRESS`
- `BASE_SEPOLIA_SUCCESSOR_B_ADDRESS`
- `BASESCAN_API_KEY` (optional, but required for automated source verification)

Configure these environment variables with small raw-unit staging values:

- `BASE_SEPOLIA_MOCK_INITIAL_RAW_AMOUNT`
- `BASE_SEPOLIA_SMOKE_RAW_AMOUNT`
- `BASE_SEPOLIA_FORK_RAW_AMOUNT` (at least `10001` raw units)

Use new disposable staging wallets only. The deployer, Registry admin, owner, and both Successors
need a small Base Sepolia ETH balance because each submits at least one transaction. The workflow
validates chain ID `84532`, derives every signing address from its protected key, checks that the
owner and Successors are distinct, and refuses to broadcast when validation fails.

Deployment evidence is uploaded as a GitHub Actions artifact. It is not committed automatically.
After review, copy the artifact's `deployments/base-sepolia.json` into `main` in a separate commit.

After the live multi-wallet smoke flow, the workflow runs the complete lifecycle against a fork of
the deployed Base Sepolia contracts. The fork advances through the unchanged 90-day inactivity
period and 30-day Protection Window without broadcasting those time-dependent test actions.

## Required configuration

Set these values in a local, untracked environment or a protected CI environment. Never commit
their values.

- `BASE_SEPOLIA_RPC_URL`
- `BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY`
- `BASE_SEPOLIA_DEPLOYER_ADDRESS`
- `BASE_SEPOLIA_REGISTRY_ADMIN`
- `BASE_SEPOLIA_REGISTRY_ADMIN_PRIVATE_KEY`
- `BASE_SEPOLIA_MOCK_POLICY_ADMIN`
- `BASE_SEPOLIA_MOCK_INITIAL_HOLDER`
- `BASE_SEPOLIA_MOCK_INITIAL_RAW_AMOUNT`
- `BASE_SEPOLIA_REGISTRY_ADDRESS`
- `BASE_SEPOLIA_VAULT_ADDRESS`
- `BASE_SEPOLIA_MOCK_ASSET_ADDRESS`

The smoke script also requires separate owner and successor keys and their expected addresses.

## Deployment order

```sh
cd contracts
forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast

forge script script/DeployMockB20Asset.s.sol:DeployMockB20Asset \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast

forge script script/ConfigureBaseSepoliaRegistry.s.sol:ConfigureBaseSepoliaRegistry \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast
```

The mock token is named `Kynlo Mock B20 Stock` and uses the symbol `MOCK-B20`. It is not an official
Coinbase asset.

## Live smoke flow

Fund only the staging wallets and use a small raw mock amount.

```sh
cd contracts
forge script script/SmokeBaseSepolia.s.sol:SmokeBaseSepolia \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast
```

This executes plan creation with two assigned receiving wallets, an exact token approval,
deposit, Seal, and Proof of Life. It verifies the final Active state and attributable accounting.

## Full lifecycle

The public Base Sepolia chain cannot advance 120 days on demand. Run the complete production-timing
lifecycle against a Base Sepolia fork and advance the fork timestamp. This keeps production bytecode
and constants intact. Any public accelerated demo contract must remain separately named, separately
deployed, and clearly marked as staging-only.

## Deployment record

After successful broadcasts, record the contract addresses, transaction hashes, block numbers,
deployer, source commit, mock status, and verification status:

```sh
node scripts/record-base-sepolia-deployment.mjs \
  --production-run contracts/broadcast/DeployBaseSepolia.s.sol/84532/run-latest.json \
  --mock-run contracts/broadcast/DeployMockB20Asset.s.sol/84532/run-latest.json \
  --source-commit "$(git rev-parse HEAD)" \
  --deployer "$BASE_SEPOLIA_DEPLOYER_ADDRESS" \
  --registry-admin "$BASE_SEPOLIA_REGISTRY_ADMIN" \
  --source-verified false
```

Set `source-verified` to `true` only after the explorer confirms both production contracts.
