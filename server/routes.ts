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
} from "@shared/schema";
import { getWithdrawalHoursForCountry, isWithdrawalWindowOpen } from "@shared/withdrawal-time";
import { resolvePlatformBusinessSettings } from "./platform-settings";
import { z } from "zod";
import connectPgSimple from "connect-pg-simple";
import multer from "multer";

const SessionStore = connectPgSimple(session);
const adminSettingsPatchSchema = z.object({
  customerService: z.string().url("URL invalide").or(z.literal("")).optional(),
  officialChannel: z.string().url("URL invalide").or(z.literal("")).optional(),
  discussionGroup: z.string().url("URL invalide").or(z.literal("")).optional(),
  telegramGroup: z.string().url("URL invalide").or(z.literal("")).optional(),
  ...businessSettingsFieldsSchema.partial().shape,
});

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
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  const user = await storage.getUser(req.session.userId);
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
      
      const existingUser = await storage.getUserByPhone(data.phone, data.country);
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
        country: data.country,
        password: data.password,
        referrerId,
      });

      req.session.userId = user.id;
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

      loginStage = "LOOKUP_USER";
      const user = await storage.getUserByPhone(data.phone, data.country);
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
    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }
    res.json({ user: { ...user, password: undefined } });
  }));

  app.get("/api/products", requireAuth, asyncRoute(async (req, res) => {
    const products = await storage.getProducts();
    const userProducts = await storage.getUserProducts(req.session.userId!);
    
    const productCountMap = new Map<string, number>();
    userProducts.forEach(up => {
      const count = productCountMap.get(up.productId) || 0;
      productCountMap.set(up.productId, count + 1);
    });
    
    const productsWithOwnership = products.map(p => ({
      ...p,
      owned: productCountMap.has(p.id),
      ownedCount: productCountMap.get(p.id) || 0,
      userProduct: userProducts.find(up => up.productId === p.id),
    }));
    
    res.json(productsWithOwnership);
  }));

  app.get("/api/products/all", asyncRoute(requireAdmin), asyncRoute(async (_req, res) => {
    const products = await storage.getAllProducts();
    res.json(products);
  }));

  app.get("/api/user/products", requireAuth, asyncRoute(async (req, res) => {
    const userProducts = await storage.getUserProducts(req.session.userId!);
    res.json(userProducts);
  }));

  app.post("/api/products/purchase", requireAuth, async (req, res) => {
    try {
      const { productId } = req.body;
      const user = await storage.getUser(req.session.userId!);
      const product = await storage.getProduct(productId);
      
      if (!user || !product || !product.isActive) {
        return res.status(404).json({ message: "Produit non trouvé" });
      }

      if (user.balance < product.price) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      const businessSettings = resolvePlatformBusinessSettings(
        await storage.getAllSettings(),
      );

      const nextPayoutAt = new Date();
      nextPayoutAt.setHours(nextPayoutAt.getHours() + 24);

      await storage.createUserProduct({
        userId: user.id,
        productId: product.id,
        purchasedAt: new Date(),
        nextPayoutAt,
        cyclesCompleted: 0,
        isActive: true,
        assignedByAdmin: false,
      });

      const isFirstInvestment = !user.hasProduct;

      await storage.updateUser(user.id, {
        balance: user.balance - product.price,
        hasProduct: true,
      });

      if (user.referrerId && isFirstInvestment) {
        const referrer = await storage.getUser(user.referrerId);
        if (referrer) {
          const commission1 = Math.floor(
            product.price * businessSettings.referralLevel1Percentage / 100,
          );
          await storage.updateUser(referrer.id, {
            balance: referrer.balance + commission1,
            referralEarnings: referrer.referralEarnings + commission1,
            todayEarnings: referrer.todayEarnings + commission1,
            totalEarnings: referrer.totalEarnings + commission1,
          });
          await storage.createEarning({
            userId: referrer.id,
            amount: commission1,
            type: "referral",
            description: `Commission niveau 1 - Premier investissement de ${user.fullName}`,
            sourceId: user.id,
          });

          if (referrer.referrerId) {
            const referrer2 = await storage.getUser(referrer.referrerId);
            if (referrer2) {
              const commission2 = Math.floor(
                product.price * businessSettings.referralLevel2Percentage / 100,
              );
              await storage.updateUser(referrer2.id, {
                balance: referrer2.balance + commission2,
                referralEarnings: referrer2.referralEarnings + commission2,
                todayEarnings: referrer2.todayEarnings + commission2,
                totalEarnings: referrer2.totalEarnings + commission2,
              });
              await storage.createEarning({
                userId: referrer2.id,
                amount: commission2,
                type: "referral",
                description: `Commission niveau 2`,
                sourceId: user.id,
              });

              if (referrer2.referrerId) {
                const referrer3 = await storage.getUser(referrer2.referrerId);
                if (referrer3) {
                  const commission3 = Math.floor(
                    product.price * businessSettings.referralLevel3Percentage / 100,
                  );
                  await storage.updateUser(referrer3.id, {
                    balance: referrer3.balance + commission3,
                    referralEarnings: referrer3.referralEarnings + commission3,
                    todayEarnings: referrer3.todayEarnings + commission3,
                    totalEarnings: referrer3.totalEarnings + commission3,
                  });
                  await storage.createEarning({
                    userId: referrer3.id,
                    amount: commission3,
                    type: "referral",
                    description: `Commission niveau 3`,
                    sourceId: user.id,
                  });
                }
              }
            }
          }
        }
      }

      res.json({ success: true });
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
      const wallet = await storage.createWallet({
        userId: req.session.userId!,
        ...data,
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

  app.post("/api/deposits", requireAuth, async (req, res) => {
    try {
      const data = depositSchema.parse(req.body);
      const channel = await storage.getPaymentChannel(data.channelId);
      
      const deposit = await storage.createDeposit({
        userId: req.session.userId!,
        amount: data.amount,
        channelId: data.channelId,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        country: data.country,
        paymentMethod: data.paymentMethod,
        adminNotes: null,
        processedBy: null,
      });

      res.json({ 
        deposit,
        redirectUrl: channel?.redirectUrl || null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

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

      if (user.balance < data.amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      const feeAmount = Math.round(
        data.amount * businessSettings.withdrawalFeePercentage / 100,
      );
      const netAmount = data.amount - feeAmount;

      const withdrawal = await storage.createWithdrawal({
        userId: user.id,
        walletId: data.walletId,
        grossAmount: data.amount,
        feeAmount,
        netAmount,
        adminNotes: null,
        processedBy: null,
      });

      await storage.updateUser(user.id, {
        balance: user.balance - data.amount,
      });

      res.json(withdrawal);
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
          balance: user.balance + PRODUCT_TASK.reward,
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
          balance: user.balance + task.reward,
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
    isActive: z.boolean().optional(),
  }).strict().refine((updates) => Object.keys(updates).length > 0, {
    message: "Aucune modification fournie",
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const updates = productUpdateSchema.parse(req.body);
      const normalizedUpdates = {
        ...updates,
        ...(updates.imageUrl === "" ? { imageUrl: null } : {}),
      };
      const product = await storage.updateProduct(req.params.id, normalizedUpdates);
      if (!product) {
        return res.status(404).json({ message: "Produit non trouvé" });
      }
      await storage.deactivateCompletedProductInvestments(product.id, product.duration);
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

    await storage.updateDeposit(deposit.id, {
      status: "approved",
      processedBy: req.session.userId,
      processedAt: new Date(),
    });

    const user = await storage.getUser(deposit.userId);
    if (user) {
      await storage.updateUser(user.id, {
        balance: user.balance + deposit.amount,
        totalDeposits: user.totalDeposits + deposit.amount,
        hasDeposited: true,
      });

      await storage.createEarning({
        userId: user.id,
        amount: deposit.amount,
        type: "deposit",
        description: "Dépôt validé",
        sourceId: deposit.id,
      });
    }

    res.json({ success: true });
  });

  app.post("/api/admin/deposits/:id/reject", requireAdmin, async (req, res) => {
    const { ban } = req.body;
    const deposit = await storage.getDeposit(req.params.id);
    if (!deposit) {
      return res.status(404).json({ message: "Dépôt non trouvé" });
    }

    await storage.updateDeposit(deposit.id, {
      status: "rejected",
      processedBy: req.session.userId,
      processedAt: new Date(),
    });

    if (ban) {
      await storage.updateUser(deposit.userId, { isBanned: true });
    }

    res.json({ success: true });
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
    const withdrawal = await storage.getWithdrawal(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ message: "Retrait non trouvé" });
    }

    await storage.updateWithdrawal(withdrawal.id, {
      status: "rejected",
      processedBy: req.session.userId,
      processedAt: new Date(),
    });

    const user = await storage.getUser(withdrawal.userId);
    if (user) {
      await storage.updateUser(user.id, {
        balance: user.balance + withdrawal.grossAmount,
      });
    }

    res.json({ success: true });
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
      balance: member.balance,
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
        balance: user.balance + bonusCode.amount,
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
          const user = await storage.getUser(up.userId);
          if (!user) continue;

          await storage.updateUser(user.id, {
            balance: user.balance + up.product.dailyReturn,
            todayEarnings: user.todayEarnings + up.product.dailyReturn,
            totalEarnings: user.totalEarnings + up.product.dailyReturn,
          });

          await storage.createEarning({
            userId: user.id,
            amount: up.product.dailyReturn,
            type: "daily",
            description: `Gain quotidien ${up.product.name}`,
            sourceId: up.id,
          });

          const nextPayout = new Date(up.nextPayoutAt);
          nextPayout.setHours(nextPayout.getHours() + 24);

          const newCycles = up.cyclesCompleted + 1;
          await storage.updateUserProduct(up.id, {
            nextPayoutAt: nextPayout,
            cyclesCompleted: newCycles,
            isActive: newCycles < up.product.duration,
          });
        }
      }
    } catch (error) {
      console.error("Daily payout error:", error);
    }
  }, 60000);

  return httpServer;
}
