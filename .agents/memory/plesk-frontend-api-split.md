---
name: Plesk frontend/API split
description: Distinguish static site delivery from Node API availability in Terra's Plesk deployment.
---

On Terra's Plesk deployment, the web server can serve the landing page and current JavaScript bundle while the Node API is unavailable or waiting on database initialization. A successful page load or matching bundle hash is not proof that backend routes are healthy.

**Why:** During a live incident, the frontend loaded from Plesk while API requests timed out; checking the page alone would have obscured the backend failure.

**How to apply:** Check an API endpoint or `/api/health` independently after any Plesk deployment or incident. A healthy frontend with an API timeout points to the Node process or its database connection, not the browser's loading animation.

Plesk cannot resolve package tarball URLs in a lockfile that point to Replit's internal `package-firewall.replit.internal` host. Replacing only the registry host is insufficient because NPM preserves the proxy's `/npm/` path prefix; normalize the Plesk copy of the lockfile by removing that prefix and using `registry.npmjs.org`.

**Why:** NPM installation on Plesk first failed with `ENOTFOUND` for the Replit-only host, then returned 404 after host replacement because the `/npm/` prefix remained in the public URL. Replit's lockfile should retain its internal URLs so its configured package firewall continues to work.

**How to apply:** Run the Plesk-specific lockfile normalizer in the application root before NPM Install. Keep normalization limited to the Plesk copy; do not rewrite the shared Replit lockfile to public URLs.