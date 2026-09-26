if (!process.env.DATABASE_URL && process.env.SUPABASE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
  console.warn(
    "DATABASE_URL is unset; using SUPABASE_DATABASE_URL for the production server.",
  );
}

import("./dist/index.cjs").catch(async (error) => {
  const errorMessage = error instanceof Error ? error.message : "";
  const errorCode =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  let reason = "bundle_import_failed";
  if (/DATABASE_URL must be set/i.test(errorMessage)) {
    reason = "database_url_missing";
  } else if (
    errorCode === "ERR_INVALID_URL" ||
    /invalid connection string|no host was specified/i.test(errorMessage)
  ) {
    reason = "database_url_invalid";
  } else if (
    errorCode === "ENOENT" ||
    (errorCode === "ERR_MODULE_NOT_FOUND" &&
      /dist[\\/]index\.cjs/i.test(errorMessage))
  ) {
    reason = "server_bundle_missing";
  } else if (
    errorCode === "ERR_MODULE_NOT_FOUND" ||
    /cannot find (?:module|package)/i.test(errorMessage)
  ) {
    reason = "node_dependency_missing";
  } else if (errorCode === "ERR_REQUIRE_ESM") {
    reason = "node_module_format_incompatible";
  }

  const nextStepByReason = {
    database_url_missing:
      "Ajoute DATABASE_URL ou SUPABASE_DATABASE_URL dans les variables Plesk.",
    database_url_invalid:
      "Vérifie le format de l’URL PostgreSQL dans Plesk sans partager sa valeur.",
    server_bundle_missing:
      "Vérifie que dist/index.cjs existe dans le dossier de l’application Plesk.",
    node_dependency_missing:
      "Lance NPM install dans Plesk, puis redémarre l’application.",
    node_module_format_incompatible:
      "Vérifie la version Node.js et réinstalle les dépendances dans Plesk.",
    bundle_import_failed:
      "Vérifie le build serveur dist/index.cjs et les dépendances Node.js.",
  };
  const nextStep = nextStepByReason[reason];

  console.error(`Production server bundle load failed: ${reason}`);

  const { createServer } = await import("node:http");
  const port = Number.parseInt(process.env.PORT || "5000", 10);
  const server = createServer((req, res) => {
    const path = (req.url || "/").split("?")[0];

    if (path === "/api/health") {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          status: "failed",
          stage: "bundle_load",
          reason,
          nextStep,
        }),
      );
      return;
    }

    if (path.startsWith("/api")) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          status: "failed",
          stage: "bundle_load",
          message: "Le serveur Terra n’a pas pu charger son application.",
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  server.listen(port, "0.0.0.0");
});