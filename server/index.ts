import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);
const isProduction = process.env.NODE_ENV === "production";
const port = parseInt(process.env.PORT || "5000", 10);

type StartupStatus = "starting" | "ready" | "failed";
let startupStatus: StartupStatus = "starting";
let startupFailureStage: "routes" | "static" = "routes";
const startupStartedAt = Date.now();
app.locals.startupStep = "registering_routes";
app.locals.defaultDataStep = "defaults.not_started";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

const healthHandler = async (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  let databaseConnected = false;

  try {
    await pool.query("SELECT 1");
    databaseConnected = true;
  } catch {
    // Do not expose connection details or credentials in health responses.
  }

  const defaultDataStatus = app.locals.defaultDataStatus ?? "not_started";
  const defaultDataStartedAt =
    app.locals.defaultDataStartedAt ?? startupStartedAt;
  const sessionStoreStatus = app.locals.sessionStoreStatus ?? "unknown";
  const dependenciesReady =
    databaseConnected &&
    sessionStoreStatus === "ready" &&
    defaultDataStatus === "ready";

  if (startupStatus === "ready" && dependenciesReady) {
    return res.json({
      status: "ok",
      database: "connected",
      sessionStore: sessionStoreStatus,
      ...(app.locals.sessionStoreCleanup
        ? { sessionStoreCleanup: app.locals.sessionStoreCleanup }
        : {}),
      ...(app.locals.sessionStoreCleanupError
        ? { sessionStoreCleanupError: app.locals.sessionStoreCleanupError }
        : {}),
      ...(app.locals.sessionStoreError
        ? { sessionStoreError: app.locals.sessionStoreError }
        : {}),
      ...(app.locals.sessionStoreErrorCode
        ? { sessionStoreErrorCode: app.locals.sessionStoreErrorCode }
        : {}),
      defaults: defaultDataStatus,
    });
  }

  const dependencyFailed =
    startupStatus === "failed" ||
    sessionStoreStatus === "write_failed" ||
    defaultDataStatus === "failed";
  return res.status(503).json({
    status: dependencyFailed ? "failed" : "starting",
    database: databaseConnected ? "connected" : "unavailable",
    sessionStore: sessionStoreStatus,
    ...(app.locals.sessionStoreCleanup
      ? { sessionStoreCleanup: app.locals.sessionStoreCleanup }
      : {}),
    ...(app.locals.sessionStoreCleanupError
      ? { sessionStoreCleanupError: app.locals.sessionStoreCleanupError }
      : {}),
    ...(app.locals.sessionStoreError
      ? { sessionStoreError: app.locals.sessionStoreError }
      : {}),
    ...(app.locals.sessionStoreErrorCode
      ? { sessionStoreErrorCode: app.locals.sessionStoreErrorCode }
      : {}),
    ...(sessionStoreStatus !== "ready" && app.locals.sessionStorePhase
      ? { sessionStorePhase: app.locals.sessionStorePhase }
      : {}),
    defaults: defaultDataStatus,
    ...(app.locals.defaultDataError
      ? { defaultsError: app.locals.defaultDataError }
      : {}),
    ...(app.locals.defaultDataErrorCode
      ? { defaultsErrorCode: app.locals.defaultDataErrorCode }
      : {}),
    stage: startupFailureStage,
    step:
      defaultDataStatus !== "ready"
        ? app.locals.defaultDataStep ?? app.locals.startupStep
        : sessionStoreStatus !== "ready"
          ? `session_store.${app.locals.sessionStorePhase ?? "probe"}`
          : app.locals.startupStep,
    startupSeconds: Math.floor((Date.now() - startupStartedAt) / 1000),
    ...(defaultDataStatus === "ready"
      ? {}
      : {
          defaultsSeconds: Math.floor(
            (Date.now() - defaultDataStartedAt) / 1000,
          ),
        }),
  });
};

app.get(["/api/health", "/api/healthz"], healthHandler);

app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") &&
    req.path !== "/api/health" &&
    req.path !== "/api/healthz" &&
    (startupStatus !== "ready" ||
      app.locals.sessionStoreStatus !== "ready" ||
      app.locals.defaultDataStatus !== "ready")
  ) {
    const dependencyFailed =
      startupStatus === "failed" ||
      app.locals.sessionStoreStatus === "write_failed" ||
      app.locals.defaultDataStatus === "failed";
    if (!dependencyFailed) {
      res.set("Retry-After", "1");
    }
    return res.status(503).json({
      status: dependencyFailed ? "failed" : "starting",
      message: "Le serveur Terra n’a pas terminé son initialisation.",
    });
  }

  next();
});

(async () => {
  try {
    await registerRoutes(httpServer, app, (step) => {
      app.locals.defaultDataStep = step;
    });

    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        return next(err);
      }

      const status = err.status || err.statusCode || 500;
      const message =
        status >= 500
          ? "Erreur serveur"
          : err.message || "Erreur de requête";
      if (status >= 500) {
        console.error(`Request failed: ${req.method} ${req.path} (${status}).`);
      }
      res.status(status).json({ message });
    });

    // Setup Vite only in development and after registering API routes.
    startupFailureStage = "static";
    app.locals.startupStep = "serving_static";
    if (isProduction) {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    startupStatus = "ready";
    app.locals.startupStep = "ready";

    if (!isProduction) {
      httpServer.listen(
        {
          port,
          host: "0.0.0.0",
          reusePort: true,
        },
        () => {
          log(`serving on port ${port}`);
        },
      );
    }
  } catch {
    startupStatus = "failed";
    console.error(
      `Terra server startup failed during ${startupFailureStage} initialization.`,
    );

    if (!isProduction) {
      throw new Error("Terra server initialization failed.");
    }
  }

  if (isProduction) {
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${port}`);
      },
    );
  }
})();
