---
name: Plesk frontend/API split
description: Distinguish static site delivery from Node API availability in Terra's Plesk deployment.
---

On Terra's Plesk deployment, the web server can serve the landing page and current JavaScript bundle while the Node API is unavailable or waiting on database initialization. A successful page load or matching bundle hash is not proof that backend routes are healthy.

**Why:** During a live incident, the frontend loaded from Plesk while API requests timed out; checking the page alone would have obscured the backend failure.

**How to apply:** Check an API endpoint or `/api/health` independently after any Plesk deployment or incident. A healthy frontend with an API timeout points to the Node process or its database connection, not the browser's loading animation.

Plesk cannot resolve package tarball URLs in a lockfile that point to Replit's internal `package-firewall.replit.internal` host. Keep the project `.npmrc` set to `replace-registry-host=always` without pinning `registry`, so each environment uses its own configured registry.

**Why:** NPM installation on Plesk failed with `ENOTFOUND` for the Replit-only host, while Replit's configured registry correctly routes through its package firewall.

**How to apply:** If an external host cannot install dependencies from a Replit-generated lockfile, check for internal resolved hosts and let npm replace them per environment rather than hardcoding a public registry in the shared config.