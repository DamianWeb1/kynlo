# Account and Successor email model

## Kynlo accounts

Kynlo uses Privy for public account entry.

- Email signup verifies a one-time code and creates an embedded wallet.
- Wallet signup verifies a wallet signature and then requires a verified email before the account is complete.
- A verified email is an account and recovery contact. It is not a custody key and cannot sign a transaction.
- The production Site requires `NEXT_PUBLIC_PRIVY_APP_ID` and the published Kynlo domain in Privy's allowed origins.

## Successor contacts

A Legacy Plan may contain one to three Successors.

- Wallet Successor: the owner enters the exact receiving wallet and may add an optional notification email.
- Email Successor: the owner enters an email, then the Successor creates or connects a Kynlo wallet before the onchain plan is created.
- Only the receiving wallet and basis-point allocation are written to the contract.
- Email addresses, invitation state, and notification delivery stay offchain.
- An email address alone never authorizes a claim and must never be used as a fallback asset destination.

## Notification boundary

Invitation and lifecycle emails require a separate server-side notification service. The browser must not contain a mail-provider credential. Delivery failures must be visible as notification failures and must not change the onchain Legacy Plan state.
