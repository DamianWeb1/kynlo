# Architecture

Kynlo separates custody, asset admission, presentation, and operations.

1. `KynloAssetRegistry` admits reverified official stock addresses for future deposits.
2. `KynloVault` stores raw token units and all custody-critical Legacy Plan state.
3. The web client derives Active, Protection Window, and Succession Ready from timestamps and contract flags. No keeper is required.
4. B20 scaled display belongs in the client. Solidity accounting stays in raw units.
5. Monitoring and indexing remain observational. They never control allocations or transfers.

The v1 contracts are non-upgradeable and expose no delegatecall, arbitrary call, or admin withdrawal surface.
