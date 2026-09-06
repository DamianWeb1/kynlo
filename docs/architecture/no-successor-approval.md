# Successor assignment and claim authority

Kynlo does not require a Successor to approve a Legacy Plan before the owner Seals it.

- The owner assigns one to three exact receiving wallets.
- Shares must total exactly 10,000 basis points.
- The owner funds the Kynlo Vault and Seals the plan without a Successor transaction.
- Only a receiving wallet recorded in the sealed plan may claim after Succession becomes available.
- `successorVersion` records configuration revisions. Changing a receiving wallet or allocation returns the plan to Draft and requires the owner to Seal the revised configuration again.
- Email addresses remain offchain. They support account access, invitations, and notifications but never grant claim authority.
- An email Successor must create or connect a receiving wallet before the owner can create the onchain Legacy Plan.

This separates communication identity from custody authority. Losing access to an email account does not transfer or expose a claim, and an email service cannot redirect assets.
