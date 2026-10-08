import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "node:crypto";
import { storage, type SupportAttachmentUpload } from "./storage";
import { pool } from "./db";
import session from "express-session";
import bcrypt from "bcryptjs";
import { 
  registerSchema, loginSchema, depositSchema, withdrawalSchema, walletSchema,
  changePasswordSchema, bonusCodeSchema, exchangeCodeSchema,
  REFERRAL_TASKS, PRODUCT_TASK,
  businessSettingsFieldsSchema, platformBusinessSettingsSchema,
  ELIGIBLE_COUNTRIES, productCategorySchema, createProductTermsSnapshot,
  type Deposit, type Product, type ProductCategory,
} from "@shared/schema";
import { getWithdrawalHoursForCountry, isWithdrawalWindowOpen } from "@shared/withdrawal-time";
import { getNextProductImage } from "@shared/product-images";
import {
  getProductPurchaseBlockReason,
  hasActiveFixedPlan,
} from "@shared/product-purchase-policy";
import {
  getDepositMinimumError,
  resolvePlatformBusinessSettings,
} from "./platform-settings";
import {
  AshtechConfigurationError,
  AshtechVerificationError,
  ashtechErrorCode,
  ashtechUserFacingError,
  createAshtechCollection,
  findEligibleCountry,
  getAshtechCountries,
  getAshtechReadiness,
  getAshtechTransaction,
  getOptionalAshtechWebhookSecret,
  getAshtechWebhookUrl,
  canAcceptAshtechWebhook,
  normalizeAshtechTransactionStatus,
  normalizeAshtechPhone,
  parseEnabledAshtechCountries,
  verifyAshtechTransaction,
} from "./ashtechpay";
import { z } from "zod";
import connectPgSimple from "connect-pg-simple";
import multer from "multer";

const SessionStore = connectPgSimple(session);
const ELIGIBLE_COUNTRY_CODES = new Set<string>(
  ELIGIBLE_COUNTRIES.map((country) => country.code),
);
const adminSettingsPatchSchema = z.object({
  customerService: z.string().url("URL invalide").or(z.literal("")).optional(),
  officialChannel: z.string().url("URL invalide").or(z.literal("")).optional(),
  discussionGroup: z.string().url("URL invalide").or(z.literal("")).optional(),
  telegramGroup: z.string().url("URL invalide").or(z.literal("")).optional(),
  ...businessSettingsFieldsSchema.partial().shape,
});
const ASHTECH_COUNTRIES_SETTING = "ashtechEnabledCountries";

function isEligibleCountryCode(countryCode: string): boolean {
  return ELIGIBLE_COUNTRY_CODES.has(countryCode.trim().toUpperCase());
}

function rejectSession(req: Request, res: Response) {
  req.session.destroy(() => undefined);
  return res.status(401).json({ message: "Non authentifié" });
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asAshtechRecord(
  body: Record<string, unknown> | unknown[],
): Record<string, unknown> {
  return Array.isArray(body) ? {} : body;
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function reconcileAshtechDeposit(
  deposit: Pick<
    Deposit,
    | "id"
    | "amount"
    | "ashtechTransactionId"
    | "ashtechReference"
    | "country"
    | "paymentMethod"
    | "status"
  >,
  transactionId: string,
): Promise<Deposit> {
  if (
    deposit.ashtechTransactionId &&
    deposit.ashtechTransactionId !== transactionId
  ) {
    throw new AshtechVerificationError("transaction_id_mismatch");
  }

  let response;
  try {
    response = await getAshtechTransaction(transactionId);
  } catch (error) {
    throw new AshtechVerificationError(
      error instanceof AshtechConfigurationError
        ? "provider_configuration"
        : "provider_unavailable",
    );
  }
  if (response.status < 200 || response.status >= 300) {
    throw new AshtechVerificationError(
      "provider_http_error",
      response.status,
    );
  }

  const transaction = asAshtechRecord(response.body);
  let country;
  try {
    country = (await getAshtechCountries()).find(
      (item) => item.code === deposit.country,
    );
  } catch (error) {
    throw new AshtechVerificationError(
      error instanceof AshtechConfigurationError
        ? "provider_configuration"
        : "catalog_unavailable",
    );
  }
  if (!country) {
    throw new AshtechVerificationError("catalog_unavailable");
  }

  const transactionStatus = verifyAshtechTransaction(transaction, {
    transactionId,
    acceptedReferences: [deposit.ashtechReference, deposit.id].filter(
      (reference): reference is string => Boolean(reference),
    ),
    amount: deposit.amount,
    currency: country.currency,
    country: deposit.country,
    operator: deposit.paymentMethod,
  });
  const transactionReference = asNonEmptyString(transaction.reference);

  await storage.updateDeposit(deposit.id, {
    ashtechTransactionId: transactionId,
    ...(transactionReference ? { ashtechReference: transactionReference } : {}),
  });

  if (transactionStatus === "completed") {
    await storage.completeDepositOnce(deposit.id);
  } else if (transactionStatus === "failed") {
    await storage.rejectDepositOnce(deposit.id);
  }

  const updated = await storage.getDeposit(deposit.id);
  if (!updated) throw new Error("Dépôt introuvable après vérification.");
  return updated;
}

function logAshtechVerificationFailure(source: string, error: unknown) {
  if (error instanceof AshtechVerificationError) {
    console.warn("AshTech transaction verification failed.", {
      source,
      reason: error.code,
      ...(error.providerHttpStatus
        ? { providerHttpStatus: error.providerHttpStatus }
        : {}),
    });
    return;
  }

  console.warn("AshTech transaction verification failed.", {
    source,
    reason: "internal_error",
  });
}

function ashtechVerificationErrorMessage(error: unknown): string {
  if (!(error instanceof AshtechVerificationError)) {
    return "La vérification AshTech a échoué. Le dépôt reste en attente.";
  }

  switch (error.code) {
    case "provider_configuration":
      return "La configuration AshTech est incomplète. Le dépôt reste en attente.";
    case "provider_unavailable":
      return "AshTech est temporairement inaccessible. Le dépôt reste en attente.";
    case "provider_http_error":
      return `AshTech n'a pas pu vérifier le dépôt${error.providerHttpStatus ? ` (HTTP ${error.providerHttpStatus})` : ""}. Le dépôt reste en attente.`;
    case "catalog_unavailable":
      return "Le catalogue AshTech est indisponible. Le dépôt reste en attente.";
    case "transaction_id_mismatch":
    case "reference_mismatch":
    case "amount_mismatch":
    case "currency_mismatch":
    case "country_mismatch":
    case "operator_mismatch":
      return "Les détails renvoyés par AshTech ne correspondent pas au dépôt. Aucun crédit n'a été appliqué.";
    case "unknown_status":
      return "AshTech a renvoyé un statut non reconnu. Le dépôt reste en attente.";
  }
}

const ASHTECH_RECONCILIATION_INTERVAL_MS = 60_000;
const ASHTECH_RECONCILIATION_BATCH_SIZE = 25;
const ASHTECH_RECONCILIATION_CONCURRENCY = 5;
let ashtechReconciliationWorkerStarted = false;
let ashtechReconciliationInProgress = false;
const ashtechReconciliationLastAttempt = new Map<string, number>();

async function reconcilePendingAshtechDeposits() {
  const readiness = getAshtechReadiness();
  if (
    ashtechReconciliationInProgress ||
    !readiness.apiKeyConfigured ||
    !readiness.userIdConfigured
  ) {
    return;
  }

  ashtechReconciliationInProgress = true;
  try {
    const pending = await storage.getPendingAshtechDeposits();
    const pendingIds = new Set(pending.map((deposit) => deposit.id));
    for (const id of Array.from(ashtechReconciliationLastAttempt.keys())) {
      if (!pendingIds.has(id)) ashtechReconciliationLastAttempt.delete(id);
    }

    const batch = pending
      .filter((deposit) => Boolean(deposit.ashtechTransactionId))
      .sort((left, right) => {
        const leftAttempt = ashtechReconciliationLastAttempt.get(left.id) ?? 0;
        const rightAttempt = ashtechReconciliationLastAttempt.get(right.id) ?? 0;
        return leftAttempt - rightAttempt ||
          left.createdAt.getTime() - right.createdAt.getTime();
      })
      .slice(0, ASHTECH_RECONCILIATION_BATCH_SIZE);

    for (const deposit of batch) {
      ashtechReconciliationLastAttempt.set(deposit.id, Date.now());
    }

    for (
      let index = 0;
      index < batch.length;
      index += ASHTECH_RECONCILIATION_CONCURRENCY
    ) {
      const group = batch.slice(
        index,
        index + ASHTECH_RECONCILIATION_CONCURRENCY,
      );
      await Promise.all(group.map(async (deposit) => {
        if (!deposit.ashtechTransactionId) return;
        try {
          await reconcileAshtechDeposit(deposit, deposit.ashtechTransactionId);
        } catch (error) {
          logAshtechVerificationFailure("background_reconciliation", error);
        }
      }));
    }
  } catch (error) {
    logAshtechVerificationFailure("background_reconciliation", error);
  } finally {
    ashtechReconciliationInProgress = false;
  }
}

function startAshtechReconciliationWorker(httpServer: Server) {
  if (
    ashtechReconciliationWorkerStarted ||
    process.env.NODE_ENV !== "production" ||
    !getAshtechReadiness().apiKeyConfigured ||
    !getAshtechReadiness().userIdConfigured
  ) {
    return;
  }

  ashtechReconciliationWorkerStarted = true;
  const timer = setInterval(
    () => void reconcilePendingAshtechDeposits(),
    ASHTECH_RECONCILIATION_INTERVAL_MS,
  );
  timer.unref();

  if (httpServer.listening) {
    void reconcilePendingAshtechDeposits();
  } else {
    httpServer.once("listening", () => {
      void reconcilePendingAshtechDeposits();
    });
  }
}

function getSafeDatabaseErrorCode(error: unknown): string | undefined {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code.toUpperCase()
      : "";

  return /^[A-Z0-9_]{2,32}$/.test(code) ? code : undefined;
}

function getSessionStoreErrorCategory(error: unknown): string {
  const code = getSafeDatabaseErrorCode(error) ?? "";

  switch (code) {
    case "42501":
      return "permission_denied";
    case "42P01":
      return "missing_table";
    case "42703":
      return "schema_mismatch";
    case "42P10":
      return "missing_unique_key";
    case "42P07":
      return "session_table_creation_conflict";
    case "22023":
      return "database_parameter_invalid";
    case "57014":
    case "QUERY_TIMEOUT":
      return "query_timed_out";
    case "28P01":
    case "28000":
      return "database_auth_failed";
    case "08000":
    case "08001":
    case "08003":
    case "08004":
    case "08006":
    case "08007":
    case "ECONNREFUSED":
    case "ECONNRESET":
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return "database_connection_failed";
    case "ETIMEDOUT":
    case "EAI_AGAIN":
      return "database_connection_timed_out";
    case "ENOTFOUND":
      return "database_host_not_found";
    default:
      return "database_write_failed";
  }
}

function getDefaultDataErrorCategory(error: unknown): string {
  const code = getSafeDatabaseErrorCode(error) ?? "";

  switch (code) {
    case "42501":
      return "permission_denied";
    case "42P01":
      return "missing_table";
    case "42703":
      return "schema_mismatch";
    case "42P10":
      return "missing_unique_key";
    case "57014":
      return "query_timed_out";
    case "3D000":
      return "database_not_found";
    case "22023":
      return "database_parameter_invalid";
    case "28P01":
    case "28000":
      return "database_auth_failed";
    default:
      return "database_operation_failed";
  }
}

function asyncRoute(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
}

const supportMessageSchema = z.object({
  message: z.string().trim().max(2000, "Le message ne peut pas dépasser 2 000 caractères").default(""),
});
const supportImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 4, fileSize: 5 * 1024 * 1024 },
});
const withdrawalProofImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 2, fileSize: 5 * 1024 * 1024 },
});

function parseWithdrawalProofUploads(req: Request, res: Response, next: NextFunction) {
  withdrawalProofImageUpload.fields([
    { name: "websiteProof", maxCount: 1 },
    { name: "smsProof", maxCount: 1 },
  ])(req, res, (error) => {
    if (error) {
      const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Chaque capture doit faire 5 Mo maximum"
        : "Ajoutez une capture du site et une capture du SMS.";
      return res.status(400).json({ message });
    }
    next();
  });
}

function getVerifiedProofImage(
  file: Express.Multer.File | undefined,
): { data: Buffer; mimeType: string } | null {
  if (!file) return null;
  const buffer = file.buffer;
  const isPng = buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = buffer.length >= 3 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp = buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
  const mimeType = isPng ? "image/png" : isJpeg ? "image/jpeg" : isWebp ? "image/webp" : null;
  if (!mimeType || file.mimetype !== mimeType) return null;
  return { data: buffer, mimeType };
}

function parseSupportUploads(req: Request, res: Response, next: NextFunction) {
  supportImageUpload.array("attachments", 4)(req, res, (error) => {
    if (error) {
      const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Chaque image doit faire 5 Mo maximum"
        : error instanceof multer.MulterError && ["LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"].includes(error.code)
          ? "Vous pouvez joindre jusqu’à 4 images"
          : "Images invalides. Utilisez des fichiers JPG, PNG ou WebP.";
      return res.status(400).json({ message });
    }
    next();
  });
}

function getSupportUploads(req: Request, res: Response): SupportAttachmentUpload[] | null {
  const files = (req.files || []) as Express.Multer.File[];
  const uploads: SupportAttachmentUpload[] = [];

  for (const file of files) {
    const buffer = file.buffer;
    const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    const verifiedMimeType = isPng ? "image/png" : isJpeg ? "image/jpeg" : isWebp ? "image/webp" : null;

    if (!verifiedMimeType || file.mimetype !== verifiedMimeType) {
      res.status(400).json({ message: "Une image jointe n’est pas valide." });
      return null;
    }

    uploads.push({
      fileName: file.originalname.replace(/[\\/\0]/g, "_").slice(0, 180) || "capture",
      mimeType: verifiedMimeType,
      size: file.size,
      data: buffer,
    });
  }

  return uploads;
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    country?: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  if (req.session.country) {
    if (!isEligibleCountryCode(req.session.country)) {
      return rejectSession(req, res);
    }
    return next();
  }

  void storage.getUser(userId).then((user) => {
    if (!user || !isEligibleCountryCode(user.country)) {
      return rejectSession(req, res);
    }
    req.session.country = user.country.trim().toUpperCase();
    next();
  }).catch(next);
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || !isEligibleCountryCode(user.country)) {
    return rejectSession(req, res);
  }
  req.session.country = user.country.trim().toUpperCase();
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Accès refusé" });
  }
  next();
}

async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || !isEligibleCountryCode(user.country)) {
    return rejectSession(req, res);
  }
  req.session.country = user.country.trim().toUpperCase();
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Seul l'administrateur principal peut modifier ces paramètres" });
  }
  next();
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  onDefaultDataProgress?: (step: string) => void
): Promise<Server> {
  // Trust the Plesk/Replit reverse proxy so HTTPS session cookies are recognized.
  app.set("trust proxy", 1);

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET doit être configuré.");
  }

  const sessionStore = new SessionStore({
    pool,
    tableName: "session",
    createTableIfMissing: false,
  });
  app.locals.sessionStoreStatus = "checking";

  app.use(session({
      secret: sessionSecret,
      proxy: true,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    }));

  const sessionProbeId = `terra-health-${randomUUID()}`;
  const sessionProbe = {
    cookie: { expires: new Date(Date.now() + 60_000) },
  } as Parameters<typeof sessionStore.set>[1];
  app.locals.sessionStoreCleanup = "checking";
  app.locals.sessionStorePhase = "table_setup";
  try {
    // connect-pg-simple's bundled table.sql uses WITH (OIDS=FALSE), which
    // PostgreSQL 12+ no longer supports. Create the compatible equivalent here.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);
    await pool.query(
      'CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")',
    );

    app.locals.sessionStorePhase = "write_probe";
    await new Promise<void>((resolve, reject) => {
      sessionStore.set(sessionProbeId, sessionProbe, (writeError) => {
        if (writeError) {
          reject(writeError);
        } else {
          resolve();
        }
      });
    });
    app.locals.sessionStoreStatus = "ready";
    app.locals.sessionStoreError = undefined;
    app.locals.sessionStoreErrorCode = undefined;
  } catch (sessionError) {
    app.locals.sessionStoreStatus = "write_failed";
    app.locals.sessionStoreError =
      getSessionStoreErrorCategory(sessionError);
    app.locals.sessionStoreErrorCode =
      getSafeDatabaseErrorCode(sessionError);
    app.locals.sessionStoreCleanup = "not_attempted";
    console.error(
      `Terra session store failed at ${app.locals.sessionStorePhase} (${app.locals.sessionStoreError}${app.locals.sessionStoreErrorCode ? `, ${app.locals.sessionStoreErrorCode}` : ""}).`,
    );
  }

  if (app.locals.sessionStoreStatus === "ready") {
    try {
      await new Promise<void>((resolve, reject) => {
        sessionStore.destroy(sessionProbeId, (deleteError) => {
          if (deleteError) {
            reject(deleteError);
          } else {
            resolve();
          }
        });
      });
      app.locals.sessionStoreCleanup = "ready";
      app.locals.sessionStoreCleanupError = undefined;
      app.locals.sessionStoreCleanupErrorCode = undefined;
    } catch (cleanupError) {
      app.locals.sessionStoreCleanup = "failed";
      app.locals.sessionStoreCleanupError =
        getSessionStoreErrorCategory(cleanupError);
      app.locals.sessionStoreCleanupErrorCode =
        getSafeDatabaseErrorCode(cleanupError);
    }
  }

  app.locals.defaultDataStatus = "initializing";
  app.locals.defaultDataStep = "defaults.starting";
  app.locals.defaultDataStartedAt = Date.now();
  void storage
    .initializeDefaults((step) => {
      app.locals.defaultDataStep = step;
      onDefaultDataProgress?.(step);
    })
    .then(() => {
      app.locals.defaultDataStatus = "ready";
    })
    .catch((error) => {
      app.locals.defaultDataStatus = "failed";
      app.locals.defaultDataError = getDefaultDataErrorCategory(error);
      app.locals.defaultDataErrorCode = getSafeDatabaseErrorCode(error);
      console.error(
        `Terra default data initialization failed at ${app.locals.defaultDataStep} (${app.locals.defaultDataError}${app.locals.defaultDataErrorCode ? `, ${app.locals.defaultDataErrorCode}` : ""}).`,
      );
    });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const countryCode = data.country.trim().toUpperCase();
      if (!isEligibleCountryCode(countryCode)) {
        return res.status(400).json({ message: "Ce pays n'est pas pris en charge." });
      }
      
      const existingUser = await storage.getUserByPhone(data.phone, countryCode);
      if (existingUser) {
        return res.status(400).json({ message: "Ce numéro de téléphone est déjà utilisé" });
      }

      let referrerId: string | undefined;
      if (data.invitationCode) {
        const referrer = await storage.getUserByReferralCode(data.invitationCode);
        if (!referrer) {
          return res.status(400).json({ message: "Code d'invitation invalide" });
        }
        referrerId = referrer.id;
      }

      const user = await storage.createUser({
        fullName: data.fullName,
        phone: data.phone,
        country: countryCode,
        password: data.password,
        referrerId,
      });

      req.session.userId = user.id;
      req.session.country = user.country;
      await saveSession(req);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Register error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    let loginStage = "VALIDATE";
    try {
      const data = loginSchema.parse(req.body);
      const countryCode = data.country.trim().toUpperCase();
      if (!isEligibleCountryCode(countryCode)) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }

      loginStage = "LOOKUP_USER";
      const user = await storage.getUserByPhone(data.phone, countryCode);
      if (!user) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }

      loginStage = "VERIFY_PASSWORD";
      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }

      if (user.isBanned) {
        return res.status(403).json({ message: "Compte suspendu" });
      }

      loginStage = "SAVE_SESSION";
      req.session.userId = user.id;
      req.session.country = user.country;
      await saveSession(req);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(`Login error at ${loginStage}:`, error);
      res.status(500).json({
        message: "Erreur serveur",
        diagnosticCode: `LOGIN_${loginStage}_FAILED`,
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", asyncRoute(async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !isEligibleCountryCode(user.country)) {
      return rejectSession(req, res);
    }
    req.session.country = user.country.trim().toUpperCase();
    res.json({ user: { ...user, password: undefined } });
  }));

  app.get("/api/products", requireAuth, asyncRoute(async (req, res) => {
    const products = await storage.getProducts();
    const userProducts = await storage.getUserProducts(req.session.userId!);
    const activityLaunchVersion = await storage.getActivityLaunchVersion();
    const purchaseHistory = userProducts.map((up) => ({
      category: up.product.category as ProductCategory,
      duration: up.product.duration,
      cyclesCompleted: up.cyclesCompleted,
      isActive: up.isActive,
      activityLaunchVersion: up.activityLaunchVersion,
    }));
    const userHasActiveFixedPlan = hasActiveFixedPlan(purchaseHistory);
    
    const productCountMap = new Map<string, number>();
    userProducts.forEach(up => {
      const count = productCountMap.get(up.productId) || 0;
      productCountMap.set(up.productId, count + 1);
    });
    
    const productsWithOwnership = products
      .filter((product) =>
        product.category === "fixed" || userHasActiveFixedPlan
      )
      .map(p => ({
      ...p,
      owned: productCountMap.has(p.id),
      ownedCount: productCountMap.get(p.id) || 0,
      userProduct: userProducts.find(up => up.productId === p.id),
      purchaseBlockReason: getProductPurchaseBlockReason(
        {
          category: p.category as ProductCategory,
          activityAvailableAt: p.activityAvailableAt,
        },
        purchaseHistory,
        activityLaunchVersion,
      ),
    }));
    
    res.json({
      products: productsWithOwnership,
      hasActiveFixedPlan: userHasActiveFixedPlan,
    });
  }));

  app.get("/api/products/all", asyncRoute(requireAdmin), asyncRoute(async (_req, res) => {
    const products = await storage.getAllProducts();
    res.json(products);
  }));

  app.get("/api/user/products", requireAuth, asyncRoute(async (req, res) => {
    const userProducts = await storage.getUserProducts(req.session.userId!);
    res.json(userProducts);
  }));

  app.post(
    "/api/user/products/:id/collect",
    requireAuth,
    asyncRoute(async (req, res) => {
      const result = await storage.collectMaturedProduct(
        req.session.userId!,
        req.params.id,
      );

      if (!result.success) {
        const messages = {
          user_not_found: "Compte utilisateur introuvable.",
          product_not_found: "Investissement introuvable.",
          not_matured: "La collecte sera disponible à la fin du cycle.",
          already_collected: "Les gains de cet investissement ont déjà été collectés.",
          invalid_payout: "Le montant des gains ne peut pas être crédité.",
        } as const;
        const status =
          result.reason === "user_not_found" ||
          result.reason === "product_not_found"
            ? 404
            : 409;

        return res.status(status).json({
          code: result.reason,
          message: messages[result.reason],
        });
      }

      res.json(result);
    }),
  );

  app.get("/api/withdrawal-proofs", requireAuth, asyncRoute(async (req, res) => {
    const userId = req.session.userId!;
    const [approvedWithdrawals, proofs] = await Promise.all([
      storage.getApprovedWithdrawalCount(userId),
      storage.getUserWithdrawalProofs(userId),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    res.json({
      eligible: approvedWithdrawals > 0,
      approvedWithdrawals,
      submittedToday: proofs.some((proof) => proof.submittedDay === today),
      proofs,
    });
  }));

  app.get("/api/withdrawal-proofs/public", requireAuth, asyncRoute(async (_req, res) => {
    const approvedProofs = await storage.getWithdrawalProofs("approved");
    res.json(approvedProofs.map((proof) => ({
      id: proof.id,
      fullName: proof.user.fullName,
      submittedDay: proof.submittedDay,
      commission: proof.commission,
      createdAt: proof.createdAt,
    })));
  }));

  app.post(
    "/api/withdrawal-proofs",
    requireAuth,
    parseWithdrawalProofUploads,
    asyncRoute(async (req, res) => {
      const userId = req.session.userId!;
      const approvedWithdrawals = await storage.getApprovedWithdrawalCount(userId);
      if (approvedWithdrawals < 1) {
        return res.status(403).json({
          message: "Une première demande de retrait doit avoir été approuvée avant de soumettre une preuve.",
        });
      }

      const today = new Date().toISOString().slice(0, 10);
      const existingProofs = await storage.getUserWithdrawalProofs(userId);
      if (existingProofs.some((proof) => proof.submittedDay === today)) {
        return res.status(409).json({ message: "Une preuve a déjà été envoyée aujourd’hui." });
      }

      const uploadedFiles = req.files as Record<string, Express.Multer.File[]> | undefined;
      const websiteProof = getVerifiedProofImage(uploadedFiles?.websiteProof?.[0]);
      const smsProof = getVerifiedProofImage(uploadedFiles?.smsProof?.[0]);
      if (!websiteProof || !smsProof) {
        return res.status(400).json({
          message: "Envoyez une capture valide du site et une capture valide du SMS (JPG, PNG ou WebP).",
        });
      }

      try {
        const proof = await storage.createWithdrawalProof({
          userId,
          submittedDay: today,
          websiteImageData: websiteProof.data,
          websiteImageMimeType: websiteProof.mimeType,
          smsImageData: smsProof.data,
          smsImageMimeType: smsProof.mimeType,
        });
        return res.status(201).json(proof);
      } catch (error) {
        if (getSafeDatabaseErrorCode(error) === "23505") {
          return res.status(409).json({ message: "Une preuve a déjà été envoyée aujourd’hui." });
        }
        throw error;
      }
    }),
  );

  app.get(
    "/api/withdrawal-proofs/:id/image/:kind",
    requireAuth,
    asyncRoute(async (req, res) => {
      const proof = await storage.getWithdrawalProof(req.params.id);
      if (!proof) return res.status(404).json({ message: "Preuve introuvable" });

      const viewer = await storage.getUser(req.session.userId!);
      if (proof.status !== "approved" && proof.userId !== req.session.userId && !viewer?.isAdmin) {
        return res.status(403).json({ message: "Accès refusé" });
      }
      if (req.params.kind !== "website" && req.params.kind !== "sms") {
        return res.status(400).json({ message: "Type d’image invalide" });
      }

      const image = await storage.getWithdrawalProofImage(
        proof.id,
        req.params.kind,
      );
      if (!image) return res.status(404).json({ message: "Image introuvable" });
      res.set({
        "Cache-Control": "private, no-store",
        "Content-Type": image.mimeType,
        "X-Content-Type-Options": "nosniff",
      });
      return res.send(image.data);
    }),
  );

  app.post("/api/products/purchase", requireAuth, async (req, res) => {
    try {
      const { productId } = req.body;
      if (typeof productId !== "string" || !productId) {
        return res.status(400).json({ message: "Produit invalide" });
      }

      const businessSettings = resolvePlatformBusinessSettings(
        await storage.getAllSettings(),
      );
      const result = await storage.createProductPurchase(
        req.session.userId!,
        productId,
        [
          businessSettings.referralLevel1Percentage,
          businessSettings.referralLevel2Percentage,
          businessSettings.referralLevel3Percentage,
        ],
      );

      if (!result.success) {
        if (result.reason === "insufficient_balance") {
          return res.status(400).json({
            message: "Solde insuffisant. Le solde dépôt est utilisé en premier, puis le solde retrait.",
          });
        }
        if (result.reason === "product_not_found") {
          return res.status(404).json({ message: "Produit non trouvé" });
        }
        if (result.reason === "user_not_found") {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        const ruleMessages = {
          fixed_plan_required: "Vous devez avoir au moins un produit fixe actif pour accéder aux produits Bien-être et Activités.",
          activity_schedule_required: "La date d’ouverture de ce produit n’est pas encore définie.",
          activity_not_open_yet: "Ce produit n’est pas encore disponible à l’achat.",
          wellness_in_progress: "Terminez votre produit Bien-être en cours avant d’en acheter un autre.",
          activity_already_purchased: "Vous avez déjà acheté un produit Activité lors de ce lancement.",
        } as const;
        if (result.reason in ruleMessages) {
          return res.status(400).json({
            message: ruleMessages[result.reason as keyof typeof ruleMessages],
          });
        }
        return res.status(400).json({ message: "Cet achat n’est pas autorisé." });
      }

      res.json({
        success: true,
        userProduct: result.userProduct,
        depositBalance: result.depositBalance,
        withdrawalBalance: result.withdrawalBalance,
      });
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/wallets", requireAuth, async (req, res) => {
    const wallets = await storage.getWallets(req.session.userId!);
    res.json(wallets);
  });

  app.post("/api/wallets", requireAuth, async (req, res) => {
    try {
      const data = walletSchema.parse(req.body);
      const countryCode = data.country.trim().toUpperCase();
      if (!isEligibleCountryCode(countryCode)) {
        return res.status(400).json({ message: "Ce pays n'est pas pris en charge." });
      }
      const wallet = await storage.createWallet({
        userId: req.session.userId!,
        ...data,
        country: countryCode,
        isDefault: true,
      });
      res.json(wallet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.delete("/api/wallets/:id", requireAuth, async (req, res) => {
    const wallet = await storage.getWallet(req.params.id);
    if (!wallet || wallet.userId !== req.session.userId) {
      return res.status(404).json({ message: "Portefeuille non trouvé" });
    }
    await storage.deleteWallet(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/payment-channels", async (req, res) => {
    const channels = await storage.getPaymentChannels(true);
    res.json(channels);
  });

  app.get("/api/admin/ashtech/config", requireAdmin, asyncRoute(async (_req, res) => {
    const readiness = getAshtechReadiness();
    let countries: Awaited<ReturnType<typeof getAshtechCountries>> = [];
    let catalogueError: string | undefined;

    if (readiness.apiKeyConfigured) {
      try {
        const catalog = await getAshtechCountries();
        countries = catalog.filter((country) => findEligibleCountry(country.code));
      } catch {
        catalogueError = "Le catalogue AshTech Pay est indisponible. Vérifiez la clé API et l'accès Direct API.";
      }
    }

    res.json({
      readiness,
      countries,
      enabledCountryCodes: parseEnabledAshtechCountries(
        await storage.getSetting(ASHTECH_COUNTRIES_SETTING),
      ),
      catalogueError,
    });
  }));

  app.patch("/api/admin/ashtech/config", requireAdmin, asyncRoute(async (req, res) => {
    const parsed = z.object({
      enabledCountryCodes: z.array(z.string().length(2)).max(ELIGIBLE_COUNTRIES.length),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || "Pays sélectionnés invalides.",
      });
    }

    const enabledCountryCodes = Array.from(new Set(parsed.data.enabledCountryCodes));
    if (enabledCountryCodes.length !== parsed.data.enabledCountryCodes.length) {
      return res.status(400).json({ message: "Un même pays ne peut pas être sélectionné plusieurs fois." });
    }
    if (enabledCountryCodes.some((code) => !findEligibleCountry(code))) {
      return res.status(400).json({ message: "Un des pays sélectionnés n'est pas pris en charge par la plateforme." });
    }

    if (enabledCountryCodes.length) {
      const readiness = getAshtechReadiness();
      if (
        !readiness.apiKeyConfigured ||
        !readiness.userIdConfigured ||
        !readiness.publicUrlConfigured
      ) {
        return res.status(400).json({
          message: "Configurez ASHTECH_API_KEY, ASHTECH_USER_ID et APP_PUBLIC_URL (HTTPS) avant d'activer un pays.",
        });
      }

      let catalog;
      try {
        catalog = await getAshtechCountries(true);
        getAshtechWebhookUrl();
      } catch {
        return res.status(503).json({
          message: "AshTech Pay n'est pas prêt. Vérifiez les identifiants, le catalogue et l'URL HTTPS publique.",
        });
      }
      const availableCodes = new Set(
        catalog
          .filter((country) => findEligibleCountry(country.code))
          .map((country) => country.code),
      );
      if (enabledCountryCodes.some((code) => !availableCodes.has(code))) {
        return res.status(400).json({
          message: "Le catalogue AshTech Pay ne propose plus un des pays sélectionnés.",
        });
      }
    }

    await storage.setSetting(
      ASHTECH_COUNTRIES_SETTING,
      JSON.stringify(enabledCountryCodes),
      req.session.userId!,
    );
    res.json({ success: true, enabledCountryCodes });
  }));

  app.get("/api/deposit-options", requireAuth, asyncRoute(async (req, res) => {
    const countryCode = typeof req.query.country === "string"
      ? req.query.country.toUpperCase()
      : "";
    if (!findEligibleCountry(countryCode)) {
      return res.status(400).json({ message: "Pays non pris en charge." });
    }

    const enabledCountryCodes = parseEnabledAshtechCountries(
      await storage.getSetting(ASHTECH_COUNTRIES_SETTING),
    );
    if (!enabledCountryCodes.includes(countryCode)) {
      return res.json({
        mode: "manual",
        channels: await storage.getPaymentChannels(true),
      });
    }

    const readiness = getAshtechReadiness();
    if (
      !readiness.apiKeyConfigured ||
      !readiness.userIdConfigured ||
      !readiness.publicUrlConfigured
    ) {
      return res.status(503).json({
        message: "Le paiement automatique est momentanément indisponible pour ce pays.",
      });
    }

    const country = (await getAshtechCountries()).find((entry) => entry.code === countryCode);
    if (!country) {
      return res.status(503).json({
        message: "AshTech Pay ne propose plus de moyen de paiement actif pour ce pays.",
      });
    }

    res.json({
      mode: "ashtech",
      countryCode: country.code,
      countryName: country.name,
      currency: country.currency,
      operators: country.operators,
    });
  }));

  app.post("/api/deposits", requireAuth, asyncRoute(async (req, res) => {
    const data = depositSchema.parse(req.body);
    const countryCode = data.country.trim().toUpperCase();
    if (!isEligibleCountryCode(countryCode)) {
      return res.status(400).json({ message: "Ce pays n'est pas pris en charge." });
    }
    const { depositMinimum } = resolvePlatformBusinessSettings(
      await storage.getAllSettings(),
    );
    const minimumError = getDepositMinimumError(data.amount, depositMinimum);
    if (minimumError) {
      return res.status(400).json({ message: minimumError });
    }
    const userId = req.session.userId!;
    const enabledCountryCodes = parseEnabledAshtechCountries(
      await storage.getSetting(ASHTECH_COUNTRIES_SETTING),
    );
    const automatic = enabledCountryCodes.includes(countryCode);

    if (!automatic) {
      const channelId = data.channelId?.trim();
      const channel = channelId ? await storage.getPaymentChannel(channelId) : undefined;
      if (!channel || !channel.isActive || !channel.redirectUrl) {
        return res.status(400).json({
          message: "Choisissez un canal de paiement actif.",
        });
      }

      const deposit = await storage.createDeposit({
        userId,
        amount: data.amount,
        channelId: channel.id,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        country: countryCode,
        paymentMethod: data.paymentMethod,
        adminNotes: null,
        processedBy: null,
      });

      return res.json({ deposit, redirectUrl: channel.redirectUrl });
    }

    const readiness = getAshtechReadiness();
    if (
      !readiness.apiKeyConfigured ||
      !readiness.userIdConfigured ||
      !readiness.publicUrlConfigured
    ) {
      return res.status(503).json({
        message: "Le paiement automatique est momentanément indisponible pour ce pays.",
      });
    }

    const webhookUrl = getAshtechWebhookUrl();
    const country = (await getAshtechCountries()).find((entry) => entry.code === countryCode);
    if (!country || !country.operators.includes(data.paymentMethod)) {
      return res.status(400).json({
        message: "Ce moyen de paiement n'est plus actif dans le catalogue AshTech Pay.",
      });
    }

    let phone: string;
    try {
      phone = normalizeAshtechPhone(data.accountNumber, countryCode);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Numéro de téléphone invalide.",
      });
    }

    const pendingDeposits = await storage.getUserDeposits(userId);
    const openAutomaticDeposit = pendingDeposits.find(
      (deposit) => deposit.status === "pending" && deposit.ashtechReference,
    );
    if (openAutomaticDeposit) {
      return res.status(409).json({
        message: "Un dépôt automatique est déjà en attente. Vérifiez son statut avant d'en lancer un autre.",
        depositId: openAutomaticDeposit.id,
      });
    }

    const reference = randomUUID();
    const deposit = await storage.createDeposit({
      id: reference,
      userId,
      amount: data.amount,
      channelId: null,
      ashtechTransactionId: null,
      ashtechReference: reference,
      accountName: data.accountName,
      accountNumber: phone,
      country: countryCode,
      paymentMethod: data.paymentMethod,
      adminNotes: null,
      processedBy: null,
    });

    let providerResponse;
    try {
      providerResponse = await createAshtechCollection({
        amount: data.amount,
        currency: country.currency,
        country_code: country.code,
        operator: data.paymentMethod,
        phone,
        reference,
        notify_url: webhookUrl,
      });
    } catch {
      console.warn("AshTech collection request failed; deposit remains pending.");
      return res.status(202).json({
        depositId: deposit.id,
        status: "pending",
        verificationPending: true,
        message: "Le résultat de la demande n'a pas pu être confirmé. Ne relancez pas le paiement; contactez le support pour vérifier ce dépôt.",
      });
    }

    const body = asAshtechRecord(providerResponse.body);
    const providerReference = asNonEmptyString(body.reference);
    const transactionId = asNonEmptyString(body.transaction_id);
    const otpRequired = providerResponse.status === 400 &&
      ashtechErrorCode(body) === "otp_required";

    if (providerReference) {
      await storage.updateDeposit(deposit.id, {
        ashtechReference: providerReference,
      });
    }

    if (otpRequired) {
      const message = asNonEmptyString(body.message);
      const ussdCode = asNonEmptyString(body.ussd_code);
      return res.json({
        depositId: deposit.id,
        status: "pending",
        otpRequired: true,
        message: message?.slice(0, 320) || "Suivez les instructions de l'opérateur, puis saisissez votre code OTP.",
        ussdCode: ussdCode || null,
      });
    }

    if (providerResponse.status < 200 || providerResponse.status >= 300) {
      if (providerResponse.status >= 500 || providerResponse.status === 408 || providerResponse.status === 429) {
        return res.status(202).json({
          depositId: deposit.id,
          status: "pending",
          verificationPending: true,
          message: "Le résultat de la demande n'est pas encore confirmé. Ne relancez pas le paiement; contactez le support pour vérifier ce dépôt.",
        });
      }

      const providerErrorCode = ashtechErrorCode(body);
      const safeErrorCode =
        providerErrorCode && /^[A-Za-z0-9_.-]{1,80}$/.test(providerErrorCode)
          ? providerErrorCode
          : "unclassified";
      console.warn("AshTech collection rejected.", {
        httpStatus: providerResponse.status,
        errorCode: safeErrorCode,
      });
      await storage.rejectDepositOnce(deposit.id);
      const status = ashtechErrorCode(body) === "api_not_enabled" ? 503 : 400;
      return res.status(status).json({ message: ashtechUserFacingError(body) });
    }

    if (!transactionId) {
      return res.status(202).json({
        depositId: deposit.id,
        status: "pending",
        verificationPending: true,
        message: "La demande est en attente de vérification. Ne relancez pas le paiement; contactez le support si cet état persiste.",
      });
    }

    await storage.updateDeposit(deposit.id, {
      ashtechTransactionId: transactionId,
      ...(providerReference ? { ashtechReference: providerReference } : {}),
    });

    let status = "pending";
    const providerStatus = normalizeAshtechTransactionStatus(body.status);
    if (providerStatus === "completed") {
      try {
        const latestDeposit = await storage.getDeposit(deposit.id);
        const verified = await reconcileAshtechDeposit(latestDeposit || deposit, transactionId);
        status = verified.status;
      } catch (error) {
        logAshtechVerificationFailure("initial_collection", error);
        // Keep the deposit pending until a later webhook or status check verifies it.
      }
    } else if (providerStatus === "failed") {
      try {
        const latestDeposit = await storage.getDeposit(deposit.id);
        const verified = await reconcileAshtechDeposit(latestDeposit || deposit, transactionId);
        status = verified.status;
      } catch (error) {
        logAshtechVerificationFailure("initial_collection", error);
        // Do not reject a deposit based only on the initial collect response.
      }
    }

    res.json({
      depositId: deposit.id,
      status,
      waveUrl: safeHttpsUrl(body.wave_url) || null,
      verificationPending: !["approved", "rejected"].includes(status),
      message: "Validez la demande sur votre téléphone. Le solde sera crédité après confirmation par AshTech Pay.",
    });
  }));

  app.post("/api/deposits/:id/ashtech-otp", requireAuth, asyncRoute(async (req, res) => {
    const parsed = z.object({
      otp: z.string().trim().min(1).max(12),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Code OTP invalide." });
    }

    const deposit = await storage.getDeposit(req.params.id);
    if (!deposit || deposit.userId !== req.session.userId) {
      return res.status(404).json({ message: "Dépôt non trouvé." });
    }
    if (deposit.status !== "pending" || !deposit.ashtechReference) {
      return res.status(409).json({ message: "Ce dépôt ne peut plus recevoir de code OTP." });
    }
    if (deposit.ashtechTransactionId) {
      return res.status(409).json({ message: "La transaction est déjà en cours de vérification." });
    }

    const readiness = getAshtechReadiness();
    if (
      !readiness.apiKeyConfigured ||
      !readiness.userIdConfigured ||
      !readiness.publicUrlConfigured
    ) {
      return res.status(503).json({
        message: "Le paiement automatique est momentanément indisponible.",
      });
    }

    const country = (await getAshtechCountries()).find((entry) => entry.code === deposit.country);
    if (!country || !country.operators.includes(deposit.paymentMethod)) {
      return res.status(400).json({
        message: "Ce moyen de paiement n'est plus actif dans le catalogue AshTech Pay.",
      });
    }

    let providerResponse;
    try {
      providerResponse = await createAshtechCollection({
        amount: deposit.amount,
        currency: country.currency,
        country_code: country.code,
        operator: deposit.paymentMethod,
        phone: deposit.accountNumber,
        reference: deposit.ashtechReference,
        otp: parsed.data.otp,
        notify_url: getAshtechWebhookUrl(),
      });
    } catch {
      return res.status(202).json({
        depositId: deposit.id,
        status: "pending",
        verificationPending: true,
        message: "Le résultat du code OTP n'a pas pu être confirmé. Ne renvoyez pas le paiement; vérifiez le statut du dépôt ou contactez le support.",
      });
    }

    const body = asAshtechRecord(providerResponse.body);
    const providerReference = asNonEmptyString(body.reference);
    const transactionId = asNonEmptyString(body.transaction_id);
    const otpRequired = providerResponse.status === 400 &&
      ashtechErrorCode(body) === "otp_required";

    if (otpRequired) {
      if (providerReference) {
        await storage.updateDeposit(deposit.id, { ashtechReference: providerReference });
      }
      return res.json({
        depositId: deposit.id,
        status: "pending",
        otpRequired: true,
        message: asNonEmptyString(body.message)?.slice(0, 320) ||
          "Le code n'a pas été confirmé. Suivez les instructions de l'opérateur et réessayez.",
        ussdCode: asNonEmptyString(body.ussd_code) || null,
      });
    }

    if (providerResponse.status < 200 || providerResponse.status >= 300) {
      if (
        providerResponse.status >= 500 ||
        providerResponse.status === 408 ||
        providerResponse.status === 429
      ) {
        return res.status(202).json({
          depositId: deposit.id,
          status: "pending",
          verificationPending: true,
          message: "Le résultat du code OTP n'a pas pu être confirmé. Ne réutilisez pas ce code; contactez le support pour vérifier le dépôt.",
        });
      }

      await storage.rejectDepositOnce(deposit.id);
      return res.json({
        depositId: deposit.id,
        status: "rejected",
        otpRequired: false,
        message: ashtechUserFacingError(body),
      });
    }

    if (!transactionId) {
      return res.status(202).json({
        depositId: deposit.id,
        status: "pending",
        verificationPending: true,
        message: "Le résultat du code OTP est en attente de vérification. Ne relancez pas le paiement.",
      });
    }

    await storage.updateDeposit(deposit.id, {
      ashtechTransactionId: transactionId,
      ...(providerReference ? { ashtechReference: providerReference } : {}),
    });

    res.json({
      depositId: deposit.id,
      status: "pending",
      waveUrl: safeHttpsUrl(body.wave_url) || null,
      verificationPending: true,
      message: "Validez la demande sur votre téléphone. Le solde sera crédité après confirmation par AshTech Pay.",
    });
  }));

  app.get("/api/deposits/:id/status", requireAuth, asyncRoute(async (req, res) => {
    const deposit = await storage.getDeposit(req.params.id);
    if (!deposit || deposit.userId !== req.session.userId) {
      return res.status(404).json({ message: "Dépôt non trouvé." });
    }

    let current = deposit;
    if (deposit.status === "pending" && deposit.ashtechTransactionId) {
      try {
        current = await reconcileAshtechDeposit(deposit, deposit.ashtechTransactionId);
      } catch (error) {
        logAshtechVerificationFailure("status_poll", error);
        return res.status(503).json({
          message: ashtechVerificationErrorMessage(error),
        });
      }
    }

    res.json({
      depositId: current.id,
      status: current.status,
      verificationPending: current.status === "pending" && !current.ashtechTransactionId,
    });
  }));

  app.post("/api/webhooks/ashtechpay", asyncRoute(async (req, res) => {
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : undefined;
    const timestamp = req.get("X-Ashtech-Timestamp") || "";
    const signature = req.get("X-Ashtech-Signature") || "";
    const webhookSecret = getOptionalAshtechWebhookSecret();
    if (
      !rawBody ||
      !canAcceptAshtechWebhook(rawBody, timestamp, signature, webhookSecret)
    ) {
      return res.status(401).json({ message: "Signature webhook invalide ou incomplète." });
    }

    let event: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawBody.toString("utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid webhook payload");
      }
      event = parsed as Record<string, unknown>;
    } catch {
      return res.status(400).json({ message: "Payload webhook invalide." });
    }

    const reference = asNonEmptyString(event.reference);
    const transactionId = asNonEmptyString(event.transaction_id);
    const eventStatus = normalizeAshtechTransactionStatus(event.status);
    if (
      !reference ||
      !transactionId ||
      !eventStatus
    ) {
      return res.status(400).json({ message: "Événement AshTech Pay incomplet." });
    }

    const deposit = await storage.getDepositByAshtechReference(reference);
    if (!deposit || !deposit.ashtechReference) {
      return res.status(404).json({ message: "Dépôt AshTech Pay introuvable." });
    }
    if (
      deposit.ashtechTransactionId &&
      deposit.ashtechTransactionId !== transactionId
    ) {
      return res.status(409).json({ message: "Transaction AshTech Pay déjà associée à un autre dépôt." });
    }
    if (deposit.status === "approved" && eventStatus === "completed") {
      return res.sendStatus(200);
    }
    if (deposit.status === "rejected" && eventStatus === "failed") {
      return res.sendStatus(200);
    }
    try {
      const updated = await reconcileAshtechDeposit(deposit, transactionId);
      if (
        eventStatus === "completed" && updated.status !== "approved" ||
        eventStatus === "failed" && updated.status !== "rejected"
      ) {
        return res.status(409).json({
          message: "Le statut vérifié ne correspond pas à l'événement reçu.",
        });
      }
    } catch (error) {
      logAshtechVerificationFailure("webhook", error);
      return res.status(503).json({
        message: ashtechVerificationErrorMessage(error),
      });
    }

    res.sendStatus(200);
  }));

  app.post("/api/withdrawals", requireAuth, async (req, res) => {
    try {
      const data = withdrawalSchema.parse(req.body);
      const businessSettings = resolvePlatformBusinessSettings(
        await storage.getAllSettings(),
      );
      if (data.amount < businessSettings.withdrawalMinimum) {
        return res.status(400).json({
          message: `Retrait minimum: ${businessSettings.withdrawalMinimum} FCFA`,
        });
      }

      const user = await storage.getUser(req.session.userId!);
      const wallet = await storage.getWallet(data.walletId);

      if (!user || !wallet) {
        return res.status(404).json({ message: "Ressource non trouvée" });
      }

      if (!user.hasProduct) {
        return res.status(400).json({ message: "Vous devez acheter un produit VIP d'abord" });
      }

      if (user.withdrawalBlocked) {
        return res.status(400).json({ message: "Vos retraits sont bloqués" });
      }

      if (user.requiresInvestorReferral) {
        const level1 = await storage.getUserReferrals(user.id, 1);
        const investingReferrals = level1.filter(r => r.hasProduct);
        if (investingReferrals.length === 0) {
          return res.status(400).json({ message: "Vous devez inviter une personne qui investit avant de pouvoir retirer" });
        }
      }

      const withdrawalHoursGmt = {
        start: businessSettings.withdrawalStartHourGmt,
        end: businessSettings.withdrawalEndHourGmt,
      };
      const hours = getWithdrawalHoursForCountry(user.country, withdrawalHoursGmt);
      if (!isWithdrawalWindowOpen(new Date(), withdrawalHoursGmt)) {
        return res.status(400).json({
          message: `Les retraits sont disponibles de ${hours.start}h à ${hours.end}h, heure locale (${withdrawalHoursGmt.start}h à ${withdrawalHoursGmt.end}h GMT).`,
        });
      }

      const todayWithdrawals = await storage.getUserTodayWithdrawals(user.id);
      if (todayWithdrawals.length >= 3) {
        return res.status(400).json({ message: "Vous avez atteint la limite de 3 retraits par jour" });
      }

      if (user.withdrawalBalance < data.amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      const feeAmount = Math.round(
        data.amount * businessSettings.withdrawalFeePercentage / 100,
      );
      const netAmount = data.amount - feeAmount;

      const result = await storage.createWithdrawalRequest({
        userId: user.id,
        walletId: data.walletId,
        grossAmount: data.amount,
        feeAmount,
        netAmount,
        adminNotes: null,
        processedBy: null,
      });

      if (!result.success) {
        const message = result.reason === "withdrawal_blocked"
          ? "Les retraits sont désactivés pour ce compte"
          : result.reason === "insufficient_balance"
            ? "Solde retrait insuffisant"
            : "Utilisateur non trouvé";
        return res.status(400).json({ message });
      }

      res.json(result.withdrawal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Withdrawal error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/transactions/history", requireAuth, async (req, res) => {
    const deposits = await storage.getUserDeposits(req.session.userId!);
    const withdrawals = await storage.getUserWithdrawals(req.session.userId!);
    const earnings = await storage.getEarnings(req.session.userId!);
    res.json({ deposits, withdrawals, earnings });
  });

  app.get("/api/tasks/status", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    const claimedTasks = await storage.getClaimedTasks(req.session.userId!);
    const level1 = await storage.getUserReferrals(req.session.userId!, 1);
    const investingReferrals = level1.filter(r => r.hasProduct);

    const userProducts = await storage.getUserProducts(req.session.userId!);
    const hasVip5 = userProducts.some(up => up.product.level >= 5);

    const referralTasks = REFERRAL_TASKS.map(task => ({
      taskId: task.id,
      completed: investingReferrals.length >= task.requiredInvestors,
      claimed: claimedTasks.some(ct => ct.taskId === task.id && ct.taskType === "referral"),
      currentCount: investingReferrals.length,
    }));

    const productTask = {
      completed: hasVip5,
      claimed: claimedTasks.some(ct => ct.taskType === "product"),
      hasVip5,
    };

    const totalReferrals = level1.length;
    const claimedRewards = claimedTasks.reduce((sum, ct) => {
      if (ct.taskType === "referral") {
        const task = REFERRAL_TASKS.find(t => t.id === ct.taskId);
        return sum + (task?.reward || 0);
      } else if (ct.taskType === "product") {
        return sum + PRODUCT_TASK.reward;
      }
      return sum;
    }, 0);

    res.json({ referralTasks, productTask, totalReferrals, totalRewards: claimedRewards });
  });

  app.post("/api/tasks/claim", requireAuth, async (req, res) => {
    try {
      const { taskId, taskType } = req.body;
      const user = await storage.getUser(req.session.userId!);
      const claimedTasks = await storage.getClaimedTasks(req.session.userId!);

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      if (taskType === "product") {
        if (claimedTasks.some(ct => ct.taskType === "product")) {
          return res.status(400).json({ message: "Récompense déjà réclamée" });
        }

        const userProducts = await storage.getUserProducts(user.id);
        const hasVip5 = userProducts.some(up => up.product.level >= 5);
        
        if (!hasVip5) {
          return res.status(400).json({ message: "Vous devez acheter un produit VIP5 ou supérieur" });
        }

        await storage.createClaimedTask({
          userId: user.id,
          taskId: 0,
          taskType: "product",
          reward: PRODUCT_TASK.reward,
        });

        await storage.updateUser(user.id, {
          withdrawalBalance: user.withdrawalBalance + PRODUCT_TASK.reward,
        });

        await storage.createEarning({
          userId: user.id,
          amount: PRODUCT_TASK.reward,
          type: "task",
          description: PRODUCT_TASK.description,
          sourceId: null,
        });

        return res.json({ success: true, reward: PRODUCT_TASK.reward });
      }

      if (taskType === "referral") {
        const task = REFERRAL_TASKS.find(t => t.id === taskId);
        if (!task) {
          return res.status(404).json({ message: "Tâche non trouvée" });
        }

        if (claimedTasks.some(ct => ct.taskId === taskId && ct.taskType === "referral")) {
          return res.status(400).json({ message: "Récompense déjà réclamée" });
        }

        const level1 = await storage.getUserReferrals(user.id, 1);
        const investingReferrals = level1.filter(r => r.hasProduct);

        if (investingReferrals.length < task.requiredInvestors) {
          return res.status(400).json({ message: "Conditions non remplies" });
        }

        await storage.createClaimedTask({
          userId: user.id,
          taskId: task.id,
          taskType: "referral",
          reward: task.reward,
        });

        await storage.updateUser(user.id, {
          withdrawalBalance: user.withdrawalBalance + task.reward,
        });

        await storage.createEarning({
          userId: user.id,
          amount: task.reward,
          type: "task",
          description: task.description,
          sourceId: null,
        });

        return res.json({ success: true, reward: task.reward });
      }

      res.status(400).json({ message: "Type de tâche invalide" });
    } catch (error) {
      console.error("Claim task error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/team/stats", requireAuth, asyncRoute(async (req, res) => {
    const userId = req.session.userId!;
    const [level1, level2, level3, user] = await Promise.all([
      storage.getUserReferrals(userId, 1),
      storage.getUserReferrals(userId, 2),
      storage.getUserReferrals(userId, 3),
      storage.getUser(userId),
    ]);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const teamMemberIds = Array.from(new Set(
      [...level1, ...level2, ...level3].map((member) => member.id),
    ));
    const investmentTotals = await storage.getUserInvestmentTotals(teamMemberIds);
    const sumInvestments = (members: typeof level1) =>
      members.reduce((sum, member) => sum + (investmentTotals.get(member.id) || 0), 0);
    const referralEarnings = (await storage.getEarnings(user.id))
      .filter((earning) => earning.type === "referral");
    const commissionForLevel = (level: number) =>
      referralEarnings
        .filter((earning) => earning.description.includes(`Commission niveau ${level}`))
        .reduce((sum, earning) => sum + earning.amount, 0);

    res.json({
      level1Count: level1.length,
      level2Count: level2.length,
      level3Count: level3.length,
      level1Investors: level1.filter((member) => member.hasProduct).length,
      level2Investors: level2.filter((member) => member.hasProduct).length,
      level3Investors: level3.filter((member) => member.hasProduct).length,
      level1Investment: sumInvestments(level1),
      level2Investment: sumInvestments(level2),
      level3Investment: sumInvestments(level3),
      level1Commissions: commissionForLevel(1),
      level2Commissions: commissionForLevel(2),
      level3Commissions: commissionForLevel(3),
      totalCommissions: user.referralEarnings,
    });
  }));

  app.get("/api/team/referrals/:level", requireAuth, asyncRoute(async (req, res) => {
    const level = parseInt(req.params.level);
    if (isNaN(level) || level < 1 || level > 3) {
      return res.status(400).json({ message: "Niveau invalide" });
    }

    const referrals = await storage.getUserReferrals(req.session.userId!, level);
    const investmentTotals = await storage.getUserInvestmentTotals(
      referrals.map((referral) => referral.id),
    );
    const referralDetails = referrals.map((referral) => ({
      id: referral.id,
      phone: referral.phone,
      country: referral.country,
      totalInvestment: investmentTotals.get(referral.id) || 0,
      hasProduct: referral.hasProduct || false,
      createdAt: referral.createdAt,
    }));

    res.json(referralDetails);
  }));

  app.get("/api/support/messages", requireAuth, async (req, res) => {
    try {
      res.json(await storage.getSupportMessages(req.session.userId!, "user"));
    } catch {
      res.status(500).json({ message: "Impossible de charger la conversation." });
    }
  });

  app.get("/api/support/unread-count", requireAuth, async (req, res) => {
    try {
      res.json(await storage.getSupportUnreadCount(req.session.userId!));
    } catch {
      res.status(500).json({ message: "Impossible de charger le nombre de nouveaux messages." });
    }
  });

  app.post("/api/support/messages", requireAuth, parseSupportUploads, async (req, res) => {
    const parsed = supportMessageSchema.safeParse({ message: req.body?.message ?? "" });
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Message invalide." });
    }

    const files = getSupportUploads(req, res);
    if (!files) return;
    if (!parsed.data.message && files.length === 0) {
      return res.status(400).json({ message: "Écrivez un message ou joignez une capture d’écran." });
    }

    try {
      await storage.createSupportUserMessage(req.session.userId!, parsed.data.message, files);
      res.status(201).json({ success: true });
    } catch {
      res.status(500).json({ message: "Votre message n’a pas pu être envoyé." });
    }
  });

  app.get("/api/support/attachments/:id", requireAuth, async (req, res) => {
    try {
      const attachment = await storage.getSupportAttachment(req.params.id);
      if (!attachment) return res.status(404).json({ message: "Image introuvable." });

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Non authentifié." });
      if (!user.isAdmin && attachment.userId !== user.id) {
        return res.status(403).json({ message: "Accès refusé." });
      }

      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Length", attachment.size);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");
      res.send(attachment.data);
    } catch {
      res.status(500).json({ message: "Impossible de charger cette image." });
    }
  });

  app.get("/api/settings/public", asyncRoute(async (_req, res) => {
    const settings = await storage.getAllSettings();
    const businessSettings = resolvePlatformBusinessSettings(settings);
    res.json({
      customerService: settings.customerService || "",
      officialChannel: settings.officialChannel || "",
      discussionGroup: settings.discussionGroup || "",
      telegramGroup: settings.telegramGroup || "",
      ...businessSettings,
    });
  }));

  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/admin/support/conversations", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getSupportConversations());
    } catch {
      res.status(500).json({ message: "Impossible de charger les conversations." });
    }
  });

  app.get("/api/admin/support/conversations/:userId/messages", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
      res.json(await storage.getSupportMessages(user.id, "admin"));
    } catch {
      res.status(500).json({ message: "Impossible de charger cette conversation." });
    }
  });

  app.post("/api/admin/support/conversations/:userId/messages", requireAdmin, parseSupportUploads, async (req, res) => {
    const parsed = supportMessageSchema.safeParse({ message: req.body?.message ?? "" });
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Message invalide." });
    }

    const files = getSupportUploads(req, res);
    if (!files) return;
    if (!parsed.data.message && files.length === 0) {
      return res.status(400).json({ message: "Écrivez un message ou joignez une image." });
    }

    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
      await storage.createAdminSupportMessage(user.id, req.session.userId!, parsed.data.message, files);
      res.status(201).json({ success: true });
    } catch {
      res.status(500).json({ message: "La réponse n’a pas pu être envoyée." });
    }
  });

  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllProducts());
  });

  const productUpdateSchema = z.object({
    name: z.string().trim().min(1, "Le nom du produit est requis").optional(),
    price: z.number().int().positive("Le prix doit être supérieur à zéro").optional(),
    dailyReturn: z.number().int().positive("Le rendement doit être supérieur à zéro").optional(),
    duration: z.number().int().positive("La durée doit être supérieure à zéro").optional(),
    totalReturn: z.number().int().positive("Le rendement total doit être supérieur à zéro").optional(),
    imageUrl: z.union([z.string().url("URL invalide"), z.literal("")]).nullable().optional(),
    category: productCategorySchema.optional(),
    activityAvailableAt: z.string().datetime({ offset: true }).nullable().optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((updates) => Object.keys(updates).length > 0, {
    message: "Aucune modification fournie",
  });

  const productCreateSchema = z.object({
    name: z.string().trim().min(1, "Le nom du produit est requis"),
    price: z.number().int().positive("Le prix doit être supérieur à zéro"),
    dailyReturn: z.number().int().positive("Le rendement doit être supérieur à zéro"),
    duration: z.number().int().positive("La durée doit être supérieure à zéro"),
    totalReturn: z.number().int().positive("Le rendement total doit être supérieur à zéro"),
    category: productCategorySchema,
    activityAvailableAt: z.string().datetime({ offset: true }).nullable().optional(),
    isActive: z.boolean().default(true),
  }).strict().superRefine((data, context) => {
    if (data.category === "activities" && data.isActive && !data.activityAvailableAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date et l’heure GMT d’ouverture sont requises pour un produit Activité.",
        path: ["activityAvailableAt"],
      });
    }
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const input = productCreateSchema.parse(req.body);
      const existingProducts = await storage.getAllProducts();
      const imageUrl = getNextProductImage(existingProducts, input.category);
      if (!imageUrl) {
        return res.status(409).json({
          message: "Toutes les photos fournies pour cette catégorie sont déjà attribuées.",
        });
      }

      const level = existingProducts.reduce((highest, product) => Math.max(highest, product.level), 0) + 1;
      const { activityAvailableAt, ...productInput } = input;
      const createdProduct = await storage.createProduct({
        ...productInput,
        level,
        imageUrl,
        activityAvailableAt:
          input.category === "activities" && activityAvailableAt
            ? new Date(activityAvailableAt)
            : null,
      });
      return res.status(201).json(createdProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Données invalides" });
      }
      console.error("Product creation error:", error);
      return res.status(500).json({ message: "Erreur serveur lors de la création du produit" });
    }
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const updates = productUpdateSchema.parse(req.body);
      const existingProduct = await storage.getProduct(req.params.id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Produit non trouvé" });
      }

      const nextCategory = updates.category ?? existingProduct.category;
      const requestedActivityAvailableAt =
        updates.activityAvailableAt === undefined
          ? existingProduct.activityAvailableAt
          : updates.activityAvailableAt
            ? new Date(updates.activityAvailableAt)
            : null;
      const nextIsActive = updates.isActive ?? existingProduct.isActive;
      if (nextCategory === "activities" && nextIsActive && !requestedActivityAvailableAt) {
        return res.status(400).json({
          message: "La date et l’heure GMT d’ouverture sont requises pour un produit Activité.",
        });
      }

      const normalizedUpdates: Partial<Product> = {
        ...updates,
        ...(updates.imageUrl === "" ? { imageUrl: null } : {}),
        activityAvailableAt:
          nextCategory === "activities" ? requestedActivityAvailableAt : null,
      };
      if (updates.category && updates.category !== existingProduct.category && updates.imageUrl === undefined) {
        const imageUrl = getNextProductImage(
          await storage.getAllProducts(),
          updates.category,
          existingProduct.id,
        );
        if (!imageUrl) {
          return res.status(409).json({
            message: "Toutes les photos fournies pour cette catégorie sont déjà attribuées.",
          });
        }
        normalizedUpdates.imageUrl = imageUrl;
      }

      const product = await storage.updateProduct(req.params.id, normalizedUpdates);
      if (!product) return res.status(404).json({ message: "Produit non trouvé" });
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Données invalides" });
      }
      console.error("Product update error:", error);
      res.status(500).json({ message: "Erreur serveur lors de la mise à jour du produit" });
    }
  });

  app.get("/api/admin/deposits", requireAdmin, async (req, res) => {
    const filter = req.query.filter as string || "pending";
    const deposits = await storage.getDeposits(filter);
    res.json(deposits);
  });

  app.post("/api/admin/deposits/:id/approve", requireAdmin, async (req, res) => {
    const deposit = await storage.getDeposit(req.params.id);
    if (!deposit) {
      return res.status(404).json({ message: "Dépôt non trouvé" });
    }

    if (deposit.ashtechReference) {
      if (!deposit.ashtechTransactionId) {
        return res.status(409).json({
          message: "Ce dépôt AshTech Pay n'a pas encore de transaction vérifiable. Ne le validez pas manuellement.",
        });
      }
      try {
        const verified = await reconcileAshtechDeposit(
          deposit,
          deposit.ashtechTransactionId,
        );
        if (verified.status !== "approved") {
          return res.status(409).json({
            message: "AshTech Pay n'a pas confirmé ce paiement.",
          });
        }
        return res.json({ success: true });
      } catch (error) {
        logAshtechVerificationFailure("admin_approve", error);
        return res.status(503).json({
          message: ashtechVerificationErrorMessage(error),
        });
      }
    }

    const approved = await storage.completeDepositOnce(deposit.id, req.session.userId);
    if (!approved) {
      return res.status(409).json({ message: "Ce dépôt a déjà été traité." });
    }
    res.json({ success: true });
  });

  app.post("/api/admin/deposits/:id/reject", requireAdmin, async (req, res) => {
    const { ban } = req.body;
    const deposit = await storage.getDeposit(req.params.id);
    if (!deposit) {
      return res.status(404).json({ message: "Dépôt non trouvé" });
    }

    if (deposit.ashtechReference) {
      if (!deposit.ashtechTransactionId) {
        return res.status(409).json({
          message: "Vérifiez ce dépôt AshTech Pay dans le tableau de bord du fournisseur avant de le rejeter.",
        });
      }
      try {
        const verified = await reconcileAshtechDeposit(
          deposit,
          deposit.ashtechTransactionId,
        );
        if (verified.status === "approved") {
          return res.status(409).json({
            message: "AshTech Pay a confirmé ce paiement; il ne peut pas être rejeté.",
          });
        }
        if (verified.status !== "rejected") {
          return res.status(409).json({
            message: "AshTech Pay indique que le paiement est toujours en attente.",
          });
        }
      } catch (error) {
        logAshtechVerificationFailure("admin_reject", error);
        return res.status(503).json({
          message: ashtechVerificationErrorMessage(error),
        });
      }
    } else {
      const rejected = await storage.rejectDepositOnce(deposit.id, req.session.userId);
      if (!rejected) {
        return res.status(409).json({ message: "Ce dépôt a déjà été traité." });
      }
    }

    if (ban) {
      await storage.updateUser(deposit.userId, { isBanned: true });
    }

    res.json({ success: true });
  });

  app.get("/api/admin/withdrawal-proofs", requireAdmin, async (req, res) => {
    const requestedStatus = typeof req.query.status === "string"
      ? req.query.status
      : "pending";
    if (!["pending", "approved", "rejected", "all"].includes(requestedStatus)) {
      return res.status(400).json({ message: "Statut de preuve invalide" });
    }
    res.json(await storage.getWithdrawalProofs(requestedStatus));
  });

  app.post("/api/admin/withdrawal-proofs/:id/approve", requireAdmin, async (req, res) => {
    const schema = z.object({
      commission: z.number().int().min(0).max(2_147_483_647),
    });
    try {
      const { commission } = schema.parse(req.body);
      const proof = await storage.approveWithdrawalProofOnce(
        req.params.id,
        commission,
        req.session.userId!,
      );
      if (!proof) return res.status(409).json({ message: "Cette preuve n’est plus en attente." });
      return res.json(proof);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      throw error;
    }
  });

  app.post("/api/admin/withdrawal-proofs/:id/reject", requireAdmin, async (req, res) => {
    const schema = z.object({
      adminNotes: z.string().trim().max(1000).default(""),
    });
    try {
      const { adminNotes } = schema.parse(req.body);
      const proof = await storage.rejectWithdrawalProofOnce(
        req.params.id,
        adminNotes,
        req.session.userId!,
      );
      if (!proof) return res.status(409).json({ message: "Cette preuve n’est plus en attente." });
      return res.json(proof);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      throw error;
    }
  });

  app.get("/api/admin/withdrawals", requireAdmin, async (req, res) => {
    const filter = req.query.filter as string || "pending";
    const withdrawals = await storage.getWithdrawals(filter);
    res.json(withdrawals);
  });

  app.post("/api/admin/withdrawals/:id/approve", requireAdmin, async (req, res) => {
    const withdrawal = await storage.getWithdrawal(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ message: "Retrait non trouvé" });
    }

    await storage.updateWithdrawal(withdrawal.id, {
      status: "approved",
      processedBy: req.session.userId,
      processedAt: new Date(),
    });

    const user = await storage.getUser(withdrawal.userId);
    if (user) {
      await storage.updateUser(user.id, {
        totalWithdrawals: user.totalWithdrawals + withdrawal.netAmount,
      });
    }

    res.json({ success: true });
  });

  app.post("/api/admin/withdrawals/:id/reject", requireAdmin, async (req, res) => {
    const notes = typeof req.body?.adminNotes === "string"
      ? req.body.adminNotes.trim().slice(0, 1000)
      : "";
    const rejected = await storage.rejectWithdrawalOnce(
      req.params.id,
      notes,
      req.session.userId!,
    );
    if (!rejected) {
      return res.status(404).json({ message: "Retrait non trouvé" });
    }
    res.json({ success: true, withdrawal: rejected });
  });

  app.get("/api/admin/users", asyncRoute(requireAdmin), asyncRoute(async (req, res) => {
    const filter = req.query.filter as string;
    const users = await storage.getAllUsers(filter === "all" ? undefined : filter);
    const userIds = users.map((user) => user.id);
    const referrerIds = Array.from(new Set(
      users.flatMap((user) => user.referrerId ? [user.referrerId] : []),
    ));
    const [metrics, referrers] = await Promise.all([
      storage.getAdminUserMetrics(userIds),
      storage.getUsersByIds(referrerIds),
    ]);
    const referrersById = new Map(referrers.map((referrer) => [referrer.id, referrer]));

    const usersWithDetails = users.map((user) => {
      const summary = metrics.get(user.id);
      const referrer = user.referrerId ? referrersById.get(user.referrerId) : undefined;
      return {
        ...user,
        password: undefined,
        referralCount: summary?.referralCount || 0,
        productCount: summary?.productCount || 0,
        totalInvestment: summary?.totalInvestment || 0,
        withdrawalCount: summary?.withdrawalCount || 0,
        activeProducts: summary?.activeProducts || [],
        referrerName: referrer?.fullName || null,
        referrerPhone: referrer?.phone || null,
      };
    });

    res.json(usersWithDetails);
  }));

  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json({ ...user, password: undefined });
  });

  app.get("/api/admin/users/:id/team", asyncRoute(requireAdmin), asyncRoute(async (req, res) => {
    const userId = req.params.id;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const [level1, level2, level3] = await Promise.all([
      storage.getUserReferrals(userId, 1),
      storage.getUserReferrals(userId, 2),
      storage.getUserReferrals(userId, 3),
    ]);
    const allMembers = [...level1, ...level2, ...level3];
    const investmentTotals = await storage.getUserInvestmentTotals(
      Array.from(new Set(allMembers.map((member) => member.id))),
    );
    const mapMember = (member: typeof level1[number]) => ({
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      country: member.country,
      depositBalance: member.depositBalance,
      withdrawalBalance: member.withdrawalBalance,
      hasProduct: member.hasProduct,
      totalInvestment: investmentTotals.get(member.id) || 0,
      createdAt: member.createdAt,
    });
    const l1Members = level1.map(mapMember);
    const l2Members = level2.map(mapMember);
    const l3Members = level3.map(mapMember);

    const totalInvestment = [...l1Members, ...l2Members, ...l3Members]
      .reduce((sum, m) => sum + m.totalInvestment, 0);

    res.json({
      level1: l1Members,
      level2: l2Members,
      level3: l3Members,
      totalTeamSize: l1Members.length + l2Members.length + l3Members.length,
      totalInvestment,
    });
  }));

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const updates = req.body;
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    // Track admin appointment if making someone an admin
    if (updates.isAdmin === true && !targetUser.isAdmin) {
      await storage.createAdminAppointment(req.params.id, req.session.userId!);
    }
    // Track admin revocation
    if (updates.isAdmin === false && targetUser.isAdmin) {
      await storage.revokeAdminAppointment(req.params.id);
    }
    
    const user = await storage.updateUser(req.params.id, updates);
    res.json({ ...user, password: undefined });
  });
  
  app.get("/api/admin/users/:id/appointment", requireAdmin, async (req, res) => {
    const appointment = await storage.getAdminAppointment(req.params.id);
    res.json(appointment || null);
  });

  app.post("/api/admin/users/:id/products", requireAdmin, async (req, res) => {
    const { productId, action } = req.body;
    const user = await storage.getUser(req.params.id);
    const product = await storage.getProduct(productId);

    if (!user || !product) {
      return res.status(404).json({ message: "Ressource non trouvée" });
    }

    if (action === "assign") {
      if (product.category !== "fixed") {
        const userProducts = await storage.getUserProducts(user.id);
        const userHasActiveFixedPlan = hasActiveFixedPlan(
          userProducts.map((userProduct) => ({
            category: userProduct.product.category as ProductCategory,
            duration: userProduct.product.duration,
            cyclesCompleted: userProduct.cyclesCompleted,
            isActive: userProduct.isActive,
            activityLaunchVersion: userProduct.activityLaunchVersion,
          })),
        );
        if (!userHasActiveFixedPlan) {
          return res.status(400).json({
            message: "L’utilisateur doit avoir au moins un produit fixe actif avant de recevoir un produit Bien-être ou Activité.",
          });
        }
      }

      const nextPayoutAt = new Date();
      nextPayoutAt.setHours(nextPayoutAt.getHours() + 24);

      await storage.createUserProduct({
        userId: user.id,
        productId: product.id,
        purchasedAt: new Date(),
        nextPayoutAt,
        cyclesCompleted: 0,
        isActive: true,
        assignedByAdmin: true,
        productSnapshot: createProductTermsSnapshot(product),
        activityLaunchVersion: null,
      });

      await storage.updateUser(user.id, { hasProduct: true });
    } else if (action === "remove") {
      const userProducts = await storage.getUserProducts(user.id);
      const toRemove = userProducts.find(up => up.productId === productId);
      if (toRemove) {
        await storage.deleteUserProduct(toRemove.id);
      }
    }

    res.json({ success: true });
  });

  app.get("/api/admin/users/:id/products", requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const userProducts = await storage.getUserProducts(userId);
    res.json(userProducts);
  });

  app.delete("/api/admin/user-products/:id", requireAdmin, async (req, res) => {
    const userProductId = req.params.id;
    await storage.deleteUserProduct(userProductId);
    res.json({ success: true });
  });

  app.get("/api/admin/payment-channels", requireAdmin, async (req, res) => {
    const channels = await storage.getPaymentChannels(false);
    res.json(channels);
  });

  app.post("/api/admin/payment-channels", requireAdmin, async (req, res) => {
    const channel = await storage.createPaymentChannel(req.body);
    await storage.createPaymentChannelAudit(channel.id, req.session.userId!, "create", null, req.body);
    res.json(channel);
  });

  app.patch("/api/admin/payment-channels/:id", requireAdmin, async (req, res) => {
    const previousChannel = await storage.getPaymentChannel(req.params.id);
    if (!previousChannel) {
      return res.status(404).json({ message: "Canal non trouvé" });
    }
    const channel = await storage.updatePaymentChannel(req.params.id, req.body);
    await storage.createPaymentChannelAudit(req.params.id, req.session.userId!, "update", previousChannel, req.body);
    res.json(channel);
  });

  app.delete("/api/admin/payment-channels/:id", requireAdmin, async (req, res) => {
    const channel = await storage.getPaymentChannel(req.params.id);
    if (channel) {
      await storage.createPaymentChannelAudit(req.params.id, req.session.userId!, "delete", channel, null);
    }
    await storage.deletePaymentChannel(req.params.id);
    res.json({ success: true });
  });
  
  app.get("/api/admin/payment-channels/:id/history", requireAdmin, async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const history = await storage.getPaymentChannelAuditHistory(req.params.id, limit);
    res.json(history);
  });

  app.get("/api/admin/payment-channels-audit/all", requireAdmin, async (req, res) => {
    const history = await storage.getAllPaymentChannelAuditHistory();
    res.json(history);
  });

  app.get("/api/admin/settings", requireSuperAdmin, asyncRoute(async (req, res) => {
    const settings = await storage.getAllSettings();
    const businessSettings = resolvePlatformBusinessSettings(settings);
    res.json({
      customerService: settings.customerService || "",
      officialChannel: settings.officialChannel || "",
      discussionGroup: settings.discussionGroup || "",
      telegramGroup: settings.telegramGroup || "",
      ...businessSettings,
    });
  }));

  app.patch("/api/admin/settings", requireSuperAdmin, asyncRoute(async (req, res) => {
    const parsed = adminSettingsPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || "Paramètres invalides",
      });
    }

    const payload = parsed.data;
    const currentBusinessSettings = resolvePlatformBusinessSettings(
      await storage.getAllSettings(),
    );
    const businessSettings = platformBusinessSettingsSchema.safeParse({
      referralLevel1Percentage:
        payload.referralLevel1Percentage ?? currentBusinessSettings.referralLevel1Percentage,
      referralLevel2Percentage:
        payload.referralLevel2Percentage ?? currentBusinessSettings.referralLevel2Percentage,
      referralLevel3Percentage:
        payload.referralLevel3Percentage ?? currentBusinessSettings.referralLevel3Percentage,
      signupBonus: payload.signupBonus ?? currentBusinessSettings.signupBonus,
      depositMinimum:
        payload.depositMinimum ?? currentBusinessSettings.depositMinimum,
      withdrawalMinimum:
        payload.withdrawalMinimum ?? currentBusinessSettings.withdrawalMinimum,
      withdrawalFeePercentage:
        payload.withdrawalFeePercentage ?? currentBusinessSettings.withdrawalFeePercentage,
      withdrawalStartHourGmt:
        payload.withdrawalStartHourGmt ?? currentBusinessSettings.withdrawalStartHourGmt,
      withdrawalEndHourGmt:
        payload.withdrawalEndHourGmt ?? currentBusinessSettings.withdrawalEndHourGmt,
    });
    if (!businessSettings.success) {
      return res.status(400).json({
        message: businessSettings.error.issues[0]?.message || "Paramètres financiers invalides",
      });
    }

    const userId = req.session.userId!;
    const settingsToSave: Record<string, string> = {};
    for (const key of [
      "customerService",
      "officialChannel",
      "discussionGroup",
      "telegramGroup",
    ] as const) {
      if (payload[key] !== undefined) {
        settingsToSave[key] = payload[key];
      }
    }
    for (const key of [
      "referralLevel1Percentage",
      "referralLevel2Percentage",
      "referralLevel3Percentage",
      "signupBonus",
      "depositMinimum",
      "withdrawalMinimum",
      "withdrawalFeePercentage",
      "withdrawalStartHourGmt",
      "withdrawalEndHourGmt",
    ] as const) {
      if (payload[key] !== undefined) {
        settingsToSave[key] = String(payload[key]);
      }
    }

    await storage.setSettings(settingsToSave, userId);
    res.json({ success: true });
  }));

  app.get("/api/admin/settings/history", requireSuperAdmin, async (req, res) => {
    const history = await storage.getAllSettingsAuditHistory();
    res.json(history);
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const data = changePasswordSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const isValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Mot de passe actuel incorrect" });
      }

      await storage.updateUser(user.id, { password: data.newPassword });
      
      res.json({ success: true, message: "Mot de passe modifié avec succès" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Change password error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/bonus-codes/exchange", requireAuth, async (req, res) => {
    try {
      const data = exchangeCodeSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const bonusCode = await storage.getBonusCodeByCode(data.code.toUpperCase());
      if (!bonusCode) {
        return res.status(404).json({ message: "Code invalide ou inexistant" });
      }

      if (!bonusCode.isActive) {
        return res.status(400).json({ message: "Ce code n'est plus actif" });
      }

      if (new Date(bonusCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Ce code a expiré" });
      }

      if (bonusCode.currentUses >= bonusCode.maxUses) {
        return res.status(400).json({ message: "Ce code a atteint sa limite d'utilisation" });
      }

      const existingUsage = await storage.getBonusCodeUsage(bonusCode.id, user.id);
      if (existingUsage) {
        return res.status(400).json({ message: "Vous avez déjà utilisé ce code" });
      }

      await storage.createBonusCodeUsage({
        bonusCodeId: bonusCode.id,
        userId: user.id,
      });

      await storage.updateBonusCode(bonusCode.id, {
        currentUses: bonusCode.currentUses + 1,
      });

      await storage.updateUser(user.id, {
        withdrawalBalance: user.withdrawalBalance + bonusCode.amount,
      });

      await storage.createEarning({
        userId: user.id,
        amount: bonusCode.amount,
        type: "bonus",
        description: `Code bonus: ${bonusCode.code}`,
        sourceId: bonusCode.id,
      });

      res.json({ 
        success: true, 
        amount: bonusCode.amount,
        message: `Bonus de ${bonusCode.amount} FCFA ajouté à votre solde!` 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Exchange bonus code error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/bonus-codes", requireAdmin, async (req, res) => {
    const codes = await storage.getBonusCodes();
    res.json(codes);
  });

  app.post("/api/admin/bonus-codes", requireAdmin, async (req, res) => {
    try {
      const data = bonusCodeSchema.parse(req.body);
      
      const existing = await storage.getBonusCodeByCode(data.code.toUpperCase());
      if (existing) {
        return res.status(400).json({ message: "Ce code existe déjà" });
      }

      const code = await storage.createBonusCode({
        code: data.code.toUpperCase(),
        amount: data.amount,
        maxUses: data.maxUses,
        expiresAt: new Date(data.expiresAt),
        isActive: true,
        createdBy: req.session.userId!,
      });

      res.json(code);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create bonus code error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/bonus-codes/:id", requireAdmin, async (req, res) => {
    const code = await storage.updateBonusCode(req.params.id, req.body);
    if (!code) {
      return res.status(404).json({ message: "Code non trouvé" });
    }
    res.json(code);
  });

  app.delete("/api/admin/bonus-codes/:id", requireAdmin, async (req, res) => {
    await storage.deleteBonusCode(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/bonus-codes/:id/usages", requireAdmin, async (req, res) => {
    const usages = await storage.getBonusCodeUsages(req.params.id);
    res.json(usages);
  });

  setInterval(async () => {
    try {
      const activeProducts = await storage.getActiveUserProducts();
      const now = new Date();

      for (const up of activeProducts) {
        if (new Date(up.nextPayoutAt) <= now && up.cyclesCompleted < up.product.duration) {
          await storage.processDueProductCycle(up.id);
        }
      }
    } catch (error) {
      console.error("Product maturity processing error:", error);
    }
  }, 60000);

  startAshtechReconciliationWorker(httpServer);

  return httpServer;
}
