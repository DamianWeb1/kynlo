# Threat model

Highest-impact failures are premature claims, excess allocation, consumed claims after policy failure, stranded positions, owner mutation after maturity, and privileged seizure.

Phase 1 controls include production timer constants, versioned Successor acceptance, deterministic residual allocation to the final Successor, transaction rollback on policy failure, deposit-only pause, and registry disablement limited to new deposits.

Open gates include audit, fuzzing, invariants, static analysis, Base mainnet-fork tests, live B20 verification, monitoring, legal review, and multisig handoff.
