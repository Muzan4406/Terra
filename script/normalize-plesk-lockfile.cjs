const fs = require("node:fs");
const path = require("node:path");

const lockPath = path.resolve(
  process.argv[2] || path.join(__dirname, "..", "package-lock.json"),
);
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
let normalizedCount = 0;

for (const entry of Object.values(lock.packages || {})) {
  if (!entry || typeof entry.resolved !== "string") {
    continue;
  }

  let resolvedUrl;
  try {
    resolvedUrl = new URL(entry.resolved);
  } catch {
    continue;
  }

  const isReplitProxy =
    resolvedUrl.hostname === "package-firewall.replit.internal" &&
    resolvedUrl.pathname.startsWith("/npm/");
  const isRewrittenProxyPath =
    resolvedUrl.hostname === "registry.npmjs.org" &&
    resolvedUrl.pathname.startsWith("/npm/") &&
    !resolvedUrl.pathname.startsWith("/npm/-/");

  if (!isReplitProxy && !isRewrittenProxyPath) {
    continue;
  }

  resolvedUrl.protocol = "https:";
  resolvedUrl.hostname = "registry.npmjs.org";
  resolvedUrl.port = "";
  resolvedUrl.pathname = resolvedUrl.pathname.slice("/npm".length);
  entry.resolved = resolvedUrl.toString();
  normalizedCount += 1;
}

fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Normalized ${normalizedCount} package tarball URL(s).`);