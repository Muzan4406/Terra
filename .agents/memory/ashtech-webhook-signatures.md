---
name: AshTech webhook signatures
description: Safe handling of AshTech Direct API callbacks when an account does or does not send signatures.
---

When signature headers are absent, do not block Direct API readiness solely because a webhook signing secret is missing. Treat the callback only as a trigger: query the provider's transaction endpoint and match the persisted reference, transaction ID, and amount before crediting or rejecting a deposit. If signature headers are present, verify them with the account's signing secret; reject partial or invalid signatures. Never substitute the API key as the HMAC key.

**Why:** AshTech's Direct API documentation makes signature verification account-optional and says to verify it when supplied; the merchant confirmed their account does not require a separate webhook secret.

**How to apply:** Preserve server-side transaction verification as the source of truth in readiness checks, webhook handling, and deployment guidance. Validate signed and unsigned paths in a provider test environment before enabling real collections.