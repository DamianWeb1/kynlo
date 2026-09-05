# Kynlo security

Kynlo is in pre-audit development. Do not deposit real assets into an unreviewed deployment.

## Security contact

Security contact and disclosure encryption details must be set before public testing.

## Privileged roles

The production multisig will manage the supported-stock registry and pause new deposits. It cannot withdraw user assets, change owners, edit Successors or shares, reset Proof of Life, accelerate Succession, redirect claims, or make arbitrary vault calls.

## Assumptions

B20 issuer transfer policy remains external to Kynlo. A blocked transfer must revert without consuming a Successor claim. Frontend simulation is informative and does not override issuer policy at execution time.

Mainnet addresses and the responsible disclosure process will be published only after deployment and audit review.
