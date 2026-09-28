---
name: AshTech transaction status aliases
description: Provider status strings observed in Direct API verification can differ from the statuses listed in the docs.
---

Normalize AshTech `success` and `succeeded` to `completed` only after matching the provider transaction to the stored merchant reference, transaction ID, amount, and operator. Keep unknown statuses unconfirmed.

**Why:** A read-only verification of a paid Direct API transaction returned `success`, while the transaction reference docs list `pending`, `completed`, and `failed`. The provider's public status normalizer also treats `success` and `succeeded` as completed.

**How to apply:** Preserve strict identity and amount checks before using a successful alias to approve a deposit or credit a wallet. Do not treat the initial browser state or an unverified webhook as proof of payment.