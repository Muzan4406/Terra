if (!process.env.DATABASE_URL && process.env.SUPABASE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
  console.warn(
    "DATABASE_URL is unset; using SUPABASE_DATABASE_URL for the production server.",
  );
}

import("./dist/index.cjs").catch(async (error) => {
  console.error(
    "Could not load the production server bundle. Ensure dist/index.cjs was built and deployed.",
  );
  console.error(error instanceof Error ? error.name : "Unknown startup error");

  const { createServer } = await import("node:http");
  const port = Number.parseInt(process.env.PORT || "5000", 10);
  const server = createServer((req, res) => {
    if ((req.url || "/").split("?")[0].startsWith("/api")) {
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