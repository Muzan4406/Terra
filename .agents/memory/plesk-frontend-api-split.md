---
name: Plesk frontend/API split
description: Distinguish static site delivery from Node API availability in Terra's Plesk deployment.
---

On Terra's Plesk deployment, the web server can serve the landing page and current JavaScript bundle while the Node API is unavailable or waiting on database initialization. A successful page load or matching bundle hash is not proof that backend routes are healthy.

**Why:** During a live incident, the frontend loaded from Plesk while API requests timed out; checking the page alone would have obscured the backend failure.

**How to apply:** Check an API endpoint or `/api/health` independently after any Plesk deployment or incident. A healthy frontend with an API timeout points to the Node process or its database connection, not the browser's loading animation.

The Replit workspace build and the Plesk Node bundle can be out of sync. A Plesk health response that lacks the latest diagnostic fields or still reports `status: ok` while a required dependency is failed is evidence to verify the Plesk pull/build/restart before treating local code as deployed.

**Why:** During the Terra incident, the live Plesk health JSON retained the old readiness semantics after the workspace had gained more specific session-store diagnostics.

**How to apply:** After syncing a backend fix, restart Plesk and compare `/api/healthz` fields with the new code before diagnosing the production database from the local build.

The bundled `connect-pg-simple` session-table creation SQL uses the removed `WITH (OIDS=FALSE)` option. On modern PostgreSQL, creating a missing session table with that SQL can fail even while `SELECT 1` succeeds; replacing it with equivalent idempotent DDL was followed by Plesk reporting the session store and defaults ready.

**Why:** The deployment uses external PostgreSQL, while the session table is not part of the app schema migration; it must be created separately on first startup.

**How to apply:** If session-store writes fail only on a fresh Plesk database, inspect the session-table creation compatibility before changing database credentials or privileges. Keep the replacement DDL non-destructive and expose only a safe SQLSTATE in health output.

The shared `package-lock.json` must use public canonical npm tarball URLs for Plesk and other external installs; Replit's internal package-firewall hostname and `/npm/` prefix are only valid inside Replit.

**Why:** Plesk cannot resolve Replit's internal package host, and replacing only the hostname leaves an invalid `/npm/` path in the public URL.

**How to apply:** Keep lockfile tarball URLs on `https://registry.npmjs.org/` with package versions and integrity hashes unchanged, so normal installs work both inside and outside Replit.