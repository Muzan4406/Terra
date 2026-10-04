---
name: Supabase schema pushes and sessions
description: Preserve the PostgreSQL session table when applying Drizzle schema changes to Supabase.
---

Drizzle does not manage `public.session`, which is created by `connect-pg-simple` at runtime. An unfiltered push can treat it as an extra table and propose dropping it, including on the Replit development database.

**Why:** Dropping the table deletes persistent login sessions and logs users out.

**How to apply:** Preview schema changes before applying them. Use an explicit table filter that excludes `session`, and cancel any plan that proposes dropping it. When using Drizzle push options, this CLI rejects combining `--config` with other push flags; pass the dialect, schema, and database URL directly instead.