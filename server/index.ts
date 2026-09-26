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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
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

  if (startupStatus === "ready" && databaseConnected) {
    const defaultDataStatus = app.locals.defaultDataStatus ?? "not_started";
    const defaultDataStartedAt =
      app.locals.defaultDataStartedAt ?? startupStartedAt;
    return res.json({
      status: "ok",
      database: "connected",
      defaults: defaultDataStatus,
      ...(defaultDataStatus === "ready"
        ? {}
        : {
            step: app.locals.startupStep,
            defaultsSeconds: Math.floor(
              (Date.now() - defaultDataStartedAt) / 1000,
            ),
          }),
    });
  }

  return res.status(503).json({
    status: startupStatus,
    database: databaseConnected ? "connected" : "unavailable",
    stage: startupFailureStage,
    step: app.locals.startupStep,
    startupSeconds: Math.floor((Date.now() - startupStartedAt) / 1000),
  });
};

app.get(["/api/health", "/api/healthz"], healthHandler);

app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") &&
    req.path !== "/api/health" &&
    req.path !== "/api/healthz" &&
    startupStatus !== "ready"
  ) {
    return res.status(503).json({
      status: startupStatus,
      message: "Le serveur Terra n’a pas terminé son initialisation.",
    });
  }

  next();
});

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

(async () => {
  try {
    await registerRoutes(httpServer, app, (step) => {
      app.locals.startupStep = step;
    });

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        return next(err);
      }

      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
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
})();
