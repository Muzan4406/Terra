---
name: Supabase schema pushes and sessions
description: Preserve the PostgreSQL session table when applying Drizzle schema changes to Supabase.
---

The current Drizzle push against Supabase treats `public.session` as an extra table because `connect-pg-simple` creates it at runtime and it is not in the Drizzle schema. The generated plan may propose dropping it.

**Why:** Approving that drop would delete persistent login sessions and log users out.

**How to apply:** Cancel any push that proposes dropping `public.session`. For narrowly scoped additive changes, apply and verify only the authorized DDL; before future broad pushes, configure and verify a way to exclude the session table.