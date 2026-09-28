import { 
  users, products, userProducts, wallets, paymentChannels, 
  deposits, withdrawals, earnings, claimedTasks, platformSettings, platformImages,
  bonusCodes, bonusCodeUsages, adminAppointments, paymentChannelAudit, platformSettingsAudit,
  supportMessages, supportAttachments,
  type User, type InsertUser, type Product, type UserProduct, type Wallet,
  type PaymentChannel, type Deposit, type Withdrawal, type Earning, type ClaimedTask,
  type PlatformSetting, type PlatformImage, type BonusCode, type BonusCodeUsage,
  type AdminAppointment, type PaymentChannelAudit, type PlatformSettingsAudit,
  type SupportMessage, type SupportAttachment, VIP_PRODUCTS
} from "@shared/schema";
import { db } from "./db";
import { resolvePlatformBusinessSettings } from "./platform-settings";
import { eq, and, asc, desc, inArray, sql, gte, lte, or, count, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string, country: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, "referralCode"> & { referralCode?: string }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(filter?: string): Promise<User[]>;
  getUsersByIds(userIds: string[]): Promise<User[]>;
  getAdminUserMetrics(userIds: string[]): Promise<Map<string, {
    referralCount: number;
    productCount: number;
    totalInvestment: number;
    withdrawalCount: number;
  }>>;
  getUserReferrals(userId: string, level: number): Promise<User[]>;
  getUserInvestmentTotals(userIds: string[]): Promise<Map<string, number>>;
  
  getProducts(): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductByLevel(level: number): Promise<Product | undefined>;
  createProduct(product: Omit<Product, "id">): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deactivateCompletedProductInvestments(productId: string, duration: number): Promise<void>;
  
  getUserProducts(userId: string): Promise<(UserProduct & { product: Product })[]>;
  getUserTotalInvestment(userId: string): Promise<number>;
  createUserProduct(data: Omit<UserProduct, "id">): Promise<UserProduct>;
  updateUserProduct(id: string, updates: Partial<UserProduct>): Promise<UserProduct | undefined>;
  deleteUserProduct(id: string): Promise<void>;
  getActiveUserProducts(): Promise<(UserProduct & { product: Product; user: User })[]>;
  
  getWallets(userId: string): Promise<Wallet[]>;
  getWallet(id: string): Promise<Wallet | undefined>;
  createWallet(data: Omit<Wallet, "id" | "createdAt">): Promise<Wallet>;
  deleteWallet(id: string): Promise<void>;
  
  getPaymentChannels(activeOnly?: boolean): Promise<PaymentChannel[]>;
  getPaymentChannel(id: string): Promise<PaymentChannel | undefined>;
  createPaymentChannel(data: Omit<PaymentChannel, "id" | "createdAt">): Promise<PaymentChannel>;
  updatePaymentChannel(id: string, updates: Partial<PaymentChannel>): Promise<PaymentChannel | undefined>;
  deletePaymentChannel(id: string): Promise<void>;
  
  getDeposits(filter?: string): Promise<(Deposit & { user: User })[]>;
  getDeposit(id: string): Promise<Deposit | undefined>;
  getUserDeposits(userId: string): Promise<Deposit[]>;
  createDeposit(data: Omit<Deposit, "id" | "createdAt" | "status" | "processedAt">): Promise<Deposit>;
  updateDeposit(id: string, updates: Partial<Deposit>): Promise<Deposit | undefined>;
  
  getWithdrawals(filter?: string): Promise<(Withdrawal & { user: User; wallet: Wallet })[]>;
  getWithdrawal(id: string): Promise<Withdrawal | undefined>;
  getUserWithdrawals(userId: string): Promise<Withdrawal[]>;
  getUserTodayWithdrawals(userId: string): Promise<Withdrawal[]>;
  getUserWithdrawalCount(userId: string): Promise<number>;
  createWithdrawal(data: Omit<Withdrawal, "id" | "createdAt" | "status" | "processedAt">): Promise<Withdrawal>;
  updateWithdrawal(id: string, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined>;
  
  getEarnings(userId: string): Promise<Earning[]>;
  createEarning(data: Omit<Earning, "id" | "createdAt">): Promise<Earning>;
  
  getClaimedTasks(userId: string): Promise<ClaimedTask[]>;
  createClaimedTask(data: Omit<ClaimedTask, "id" | "claimedAt">): Promise<ClaimedTask>;
  
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string, changedById?: string): Promise<void>;
  setSettings(settings: Record<string, string>, changedById?: string): Promise<void>;
  getAllSettings(): Promise<Record<string, string>>;
  getSettingsAuditHistory(settingKey: string): Promise<(PlatformSettingsAudit & { changedBy: { fullName: string; phone: string } })[]>;
  getAllSettingsAuditHistory(): Promise<(PlatformSettingsAudit & { changedBy: { fullName: string; phone: string } })[]>;
  
  getImage(location: string): Promise<string | undefined>;
  setImage(location: string, imageUrl: string): Promise<void>;
  
  getDashboardStats(): Promise<{
    totalUsers: number;
    todayRegistrations: number;
    todayDeposits: number;
    todayWithdrawals: number;
    totalDepositsAmount: number;
    totalWithdrawalsAmount: number;
    totalWithdrawalsCount: number;
    todayWithdrawalsAmount: number;
    usersWithProducts: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  }>;
  
  getBonusCodes(): Promise<BonusCode[]>;
  getBonusCode(id: string): Promise<BonusCode | undefined>;
  getBonusCodeByCode(code: string): Promise<BonusCode | undefined>;
  createBonusCode(data: Omit<BonusCode, "id" | "createdAt" | "currentUses">): Promise<BonusCode>;
  updateBonusCode(id: string, updates: Partial<BonusCode>): Promise<BonusCode | undefined>;
  deleteBonusCode(id: string): Promise<void>;
  
  getBonusCodeUsage(bonusCodeId: string, userId: string): Promise<BonusCodeUsage | undefined>;
  createBonusCodeUsage(data: Omit<BonusCodeUsage, "id" | "usedAt">): Promise<BonusCodeUsage>;
  getBonusCodeUsages(bonusCodeId: string): Promise<(BonusCodeUsage & { user: User })[]>;
  
  createAdminAppointment(adminId: string, appointedById: string): Promise<AdminAppointment>;
  getAdminAppointment(adminId: string): Promise<(AdminAppointment & { appointedBy: User }) | undefined>;
  revokeAdminAppointment(adminId: string): Promise<void>;
  
  createPaymentChannelAudit(channelId: string, changedById: string, action: string, previousData?: any, newData?: any): Promise<PaymentChannelAudit>;
  getPaymentChannelAuditHistory(channelId: string, limit?: number): Promise<(PaymentChannelAudit & { changedBy: User })[]>;
  getAllPaymentChannelAuditHistory(): Promise<(PaymentChannelAudit & { changedBy: User; channel?: PaymentChannel })[]>;

  getSupportMessages(userId: string, readerRole: "user" | "admin"): Promise<SupportMessageWithAttachments[]>;
  getSupportConversations(): Promise<SupportConversationSummary[]>;
  getSupportUnreadCount(userId: string): Promise<number>;
  createSupportUserMessage(userId: string, body: string, files: SupportAttachmentUpload[]): Promise<void>;
  createAdminSupportMessage(userId: string, adminId: string, body: string, files: SupportAttachmentUpload[]): Promise<void>;
  getSupportAttachment(id: string): Promise<SupportAttachment | undefined>;
  
  initializeDefaults(onProgress?: (step: string) => void): Promise<void>;
}

export type SupportAttachmentUpload = Pick<SupportAttachment, "fileName" | "mimeType" | "size" | "data">;
export type SupportMessageWithAttachments = Pick<SupportMessage, "id" | "senderType" | "body" | "createdAt"> & {
  readAt: Date | null;
  attachments: Array<Pick<SupportAttachment, "id" | "messageId" | "fileName" | "mimeType" | "size">>;
};
export interface SupportConversationSummary {
  userId: string;
  fullName: string;
  phone: string;
  country: string;
  lastMessage: string;
  lastSenderType: SupportMessage["senderType"];
  lastMessageAt: Date;
  unreadCount: number;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string, country: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.phone, phone), eq(users.country, country))
    );
    return user || undefined;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user || undefined;
  }

  async createUser(userData: Omit<InsertUser, "referralCode"> & { referralCode?: string }): Promise<User> {
    const referralCode = userData.referralCode || generateReferralCode();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const signupBonus = resolvePlatformBusinessSettings(await this.getAllSettings()).signupBonus;
    
    const [user] = await db.insert(users).values({
      ...userData,
      password: hashedPassword,
      referralCode,
      balance: signupBonus,
    }).returning();
    
    await this.createEarning({
      userId: user.id,
      amount: signupBonus,
      type: "bonus",
      description: "Bonus d'inscription",
      sourceId: null,
    });
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(filter?: string): Promise<User[]> {
    if (filter === "banned") {
      return db.select().from(users).where(eq(users.isBanned, true));
    }
    if (filter === "blocked") {
      return db.select().from(users).where(eq(users.withdrawalBlocked, true));
    }
    if (filter === "promoter") {
      return db.select().from(users).where(eq(users.isPromoter, true));
    }
    if (filter === "admin") {
      return db.select().from(users).where(eq(users.isAdmin, true));
    }
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];
    return db.select().from(users).where(inArray(users.id, userIds));
  }

  async getAdminUserMetrics(userIds: string[]): Promise<Map<string, {
    referralCount: number;
    productCount: number;
    totalInvestment: number;
    withdrawalCount: number;
  }>> {
    const metrics = new Map(userIds.map((id) => [
      id,
      { referralCount: 0, productCount: 0, totalInvestment: 0, withdrawalCount: 0 },
    ]));
    if (userIds.length === 0) return metrics;

    const [referralRows, productRows, withdrawalRows] = await Promise.all([
      db.select({
        referrerId: users.referrerId,
        referralCount: count(),
      })
        .from(users)
        .where(inArray(users.referrerId, userIds))
        .groupBy(users.referrerId),
      db.select({
        userId: userProducts.userId,
        productCount: count(userProducts.id),
        totalInvestment: sql<number>`COALESCE(SUM(${products.price}), 0)`,
      })
        .from(userProducts)
        .innerJoin(products, eq(userProducts.productId, products.id))
        .where(inArray(userProducts.userId, userIds))
        .groupBy(userProducts.userId),
      db.select({
        userId: withdrawals.userId,
        withdrawalCount: count(withdrawals.id),
      })
        .from(withdrawals)
        .where(inArray(withdrawals.userId, userIds))
        .groupBy(withdrawals.userId),
    ]);

    for (const row of referralRows) {
      if (row.referrerId) {
        const summary = metrics.get(row.referrerId);
        if (summary) summary.referralCount = Number(row.referralCount);
      }
    }
    for (const row of productRows) {
      const summary = metrics.get(row.userId);
      if (summary) {
        summary.productCount = Number(row.productCount);
        summary.totalInvestment = Number(row.totalInvestment || 0);
      }
    }
    for (const row of withdrawalRows) {
      const summary = metrics.get(row.userId);
      if (summary) summary.withdrawalCount = Number(row.withdrawalCount);
    }

    return metrics;
  }

  async getUserReferrals(userId: string, level: number): Promise<User[]> {
    if (level === 1) {
      return db.select().from(users).where(eq(users.referrerId, userId));
    }
    if (level < 2 || level > 3) return [];

    const parents = await this.getUserReferrals(userId, level - 1);
    if (parents.length === 0) return [];

    return db.select().from(users).where(
      inArray(users.referrerId, parents.map((parent) => parent.id)),
    );
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.level);
  }

  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(products.level);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByLevel(level: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.level, level));
    return product || undefined;
  }

  async createProduct(product: Omit<Product, "id">): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated || undefined;
  }

  async deactivateCompletedProductInvestments(productId: string, duration: number): Promise<void> {
    await db.update(userProducts)
      .set({ isActive: false })
      .where(and(
        eq(userProducts.productId, productId),
        eq(userProducts.isActive, true),
        gte(userProducts.cyclesCompleted, duration),
      ));
  }

  async getUserProducts(userId: string): Promise<(UserProduct & { product: Product })[]> {
    const result = await db.select({
      id: userProducts.id,
      userId: userProducts.userId,
      productId: userProducts.productId,
      purchasedAt: userProducts.purchasedAt,
      nextPayoutAt: userProducts.nextPayoutAt,
      cyclesCompleted: userProducts.cyclesCompleted,
      isActive: userProducts.isActive,
      assignedByAdmin: userProducts.assignedByAdmin,
      product: products,
    })
    .from(userProducts)
    .innerJoin(products, eq(userProducts.productId, products.id))
    .where(eq(userProducts.userId, userId));
    
    return result;
  }

  async getUserTotalInvestment(userId: string): Promise<number> {
    const result = await db.select({
      total: sql<number>`COALESCE(SUM(${products.price}), 0)`,
    })
    .from(userProducts)
    .innerJoin(products, eq(userProducts.productId, products.id))
    .where(eq(userProducts.userId, userId));
    
    return Number(result[0]?.total || 0);
  }

  async getUserInvestmentTotals(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const rows = await db.select({
      userId: userProducts.userId,
      totalInvestment: sql<number>`COALESCE(SUM(${products.price}), 0)`,
    })
      .from(userProducts)
      .innerJoin(products, eq(userProducts.productId, products.id))
      .where(inArray(userProducts.userId, userIds))
      .groupBy(userProducts.userId);

    return new Map(rows.map((row) => [row.userId, Number(row.totalInvestment || 0)]));
  }

  async createUserProduct(data: Omit<UserProduct, "id">): Promise<UserProduct> {
    const [created] = await db.insert(userProducts).values(data).returning();
    return created;
  }

  async updateUserProduct(id: string, updates: Partial<UserProduct>): Promise<UserProduct | undefined> {
    const [updated] = await db.update(userProducts).set(updates).where(eq(userProducts.id, id)).returning();
    return updated || undefined;
  }

  async deleteUserProduct(id: string): Promise<void> {
    await db.delete(userProducts).where(eq(userProducts.id, id));
  }

  async getActiveUserProducts(): Promise<(UserProduct & { product: Product; user: User })[]> {
    const result = await db.select({
      id: userProducts.id,
      userId: userProducts.userId,
      productId: userProducts.productId,
      purchasedAt: userProducts.purchasedAt,
      nextPayoutAt: userProducts.nextPayoutAt,
      cyclesCompleted: userProducts.cyclesCompleted,
      isActive: userProducts.isActive,
      assignedByAdmin: userProducts.assignedByAdmin,
      product: products,
      user: users,
    })
    .from(userProducts)
    .innerJoin(products, eq(userProducts.productId, products.id))
    .innerJoin(users, eq(userProducts.userId, users.id))
    .where(eq(userProducts.isActive, true));
    
    return result;
  }

  async getWallets(userId: string): Promise<Wallet[]> {
    return db.select().from(wallets).where(eq(wallets.userId, userId));
  }

  async getWallet(id: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet || undefined;
  }

  async createWallet(data: Omit<Wallet, "id" | "createdAt">): Promise<Wallet> {
    const [created] = await db.insert(wallets).values(data).returning();
    return created;
  }

  async deleteWallet(id: string): Promise<void> {
    await db.delete(wallets).where(eq(wallets.id, id));
  }

  async getPaymentChannels(activeOnly = false): Promise<PaymentChannel[]> {
    if (activeOnly) {
      return db.select().from(paymentChannels).where(eq(paymentChannels.isActive, true));
    }
    return db.select().from(paymentChannels);
  }

  async getPaymentChannel(id: string): Promise<PaymentChannel | undefined> {
    const [channel] = await db.select().from(paymentChannels).where(eq(paymentChannels.id, id));
    return channel || undefined;
  }

  async createPaymentChannel(data: Omit<PaymentChannel, "id" | "createdAt">): Promise<PaymentChannel> {
    const [created] = await db.insert(paymentChannels).values(data).returning();
    return created;
  }

  async updatePaymentChannel(id: string, updates: Partial<PaymentChannel>): Promise<PaymentChannel | undefined> {
    const [updated] = await db.update(paymentChannels).set(updates).where(eq(paymentChannels.id, id)).returning();
    return updated || undefined;
  }

  async deletePaymentChannel(id: string): Promise<void> {
    await db.delete(paymentChannels).where(eq(paymentChannels.id, id));
  }

  async getDeposits(filter?: string): Promise<(Deposit & { user: User })[]> {
    let whereClause;
    if (filter && filter !== "all") {
      whereClause = eq(deposits.status, filter);
    }
    
    const result = await db.select({
      id: deposits.id,
      userId: deposits.userId,
      amount: deposits.amount,
      channelId: deposits.channelId,
      accountName: deposits.accountName,
      accountNumber: deposits.accountNumber,
      country: deposits.country,
      paymentMethod: deposits.paymentMethod,
      status: deposits.status,
      adminNotes: deposits.adminNotes,
      processedBy: deposits.processedBy,
      createdAt: deposits.createdAt,
      processedAt: deposits.processedAt,
      user: users,
    })
    .from(deposits)
    .innerJoin(users, eq(deposits.userId, users.id))
    .where(whereClause)
    .orderBy(desc(deposits.createdAt));
    
    return result;
  }

  async getDeposit(id: string): Promise<Deposit | undefined> {
    const [deposit] = await db.select().from(deposits).where(eq(deposits.id, id));
    return deposit || undefined;
  }

  async getUserDeposits(userId: string): Promise<Deposit[]> {
    return db.select().from(deposits).where(eq(deposits.userId, userId)).orderBy(desc(deposits.createdAt));
  }

  async createDeposit(data: Omit<Deposit, "id" | "createdAt" | "status" | "processedAt">): Promise<Deposit> {
    const [created] = await db.insert(deposits).values({
      ...data,
      status: "pending",
    }).returning();
    return created;
  }

  async updateDeposit(id: string, updates: Partial<Deposit>): Promise<Deposit | undefined> {
    const [updated] = await db.update(deposits).set(updates).where(eq(deposits.id, id)).returning();
    return updated || undefined;
  }

  async getWithdrawals(filter?: string): Promise<(Withdrawal & { user: User; wallet: Wallet })[]> {
    let whereClause;
    if (filter && filter !== "all") {
      whereClause = eq(withdrawals.status, filter);
    }
    
    const result = await db.select({
      id: withdrawals.id,
      userId: withdrawals.userId,
      walletId: withdrawals.walletId,
      grossAmount: withdrawals.grossAmount,
      feeAmount: withdrawals.feeAmount,
      netAmount: withdrawals.netAmount,
      status: withdrawals.status,
      adminNotes: withdrawals.adminNotes,
      processedBy: withdrawals.processedBy,
      createdAt: withdrawals.createdAt,
      processedAt: withdrawals.processedAt,
      user: users,
      wallet: wallets,
    })
    .from(withdrawals)
    .innerJoin(users, eq(withdrawals.userId, users.id))
    .innerJoin(wallets, eq(withdrawals.walletId, wallets.id))
    .where(whereClause)
    .orderBy(desc(withdrawals.createdAt));
    
    return result;
  }

  async getWithdrawal(id: string): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, id));
    return withdrawal || undefined;
  }

  async getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt));
  }

  async getUserTodayWithdrawals(userId: string): Promise<Withdrawal[]> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return db.select().from(withdrawals).where(
      and(
        eq(withdrawals.userId, userId),
        gte(withdrawals.createdAt, today)
      )
    );
  }

  async getUserWithdrawalCount(userId: string): Promise<number> {
    const result = await db.select({
      count: sql<number>`COUNT(*)`,
    })
    .from(withdrawals)
    .where(eq(withdrawals.userId, userId));
    return Number(result[0]?.count || 0);
  }

  async createWithdrawal(data: Omit<Withdrawal, "id" | "createdAt" | "status" | "processedAt">): Promise<Withdrawal> {
    const [created] = await db.insert(withdrawals).values({
      ...data,
      status: "pending",
    }).returning();
    return created;
  }

  async updateWithdrawal(id: string, updates: Partial<Withdrawal>): Promise<Withdrawal | undefined> {
    const [updated] = await db.update(withdrawals).set(updates).where(eq(withdrawals.id, id)).returning();
    return updated || undefined;
  }

  async getEarnings(userId: string): Promise<Earning[]> {
    return db.select().from(earnings).where(eq(earnings.userId, userId)).orderBy(desc(earnings.createdAt));
  }

  async createEarning(data: Omit<Earning, "id" | "createdAt">): Promise<Earning> {
    const [created] = await db.insert(earnings).values(data).returning();
    return created;
  }

  async getClaimedTasks(userId: string): Promise<ClaimedTask[]> {
    return db.select().from(claimedTasks).where(eq(claimedTasks.userId, userId));
  }

  async createClaimedTask(data: Omit<ClaimedTask, "id" | "claimedAt">): Promise<ClaimedTask> {
    const [created] = await db.insert(claimedTasks).values(data).returning();
    return created;
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string, changedById?: string): Promise<void> {
    await this.setSettings({ [key]: value }, changedById);
  }

  async setSettings(settings: Record<string, string>, changedById?: string): Promise<void> {
    const entries = Object.entries(settings);
    if (entries.length === 0) {
      return;
    }

    await db.transaction(async (tx) => {
      for (const [key, value] of entries) {
        const [existing] = await tx
          .select({ value: platformSettings.value })
          .from(platformSettings)
          .where(eq(platformSettings.key, key));

        if (existing?.value === value) {
          continue;
        }

        if (changedById) {
          await tx.insert(platformSettingsAudit).values({
            settingKey: key,
            previousValue: existing?.value ?? null,
            newValue: value,
            changedById,
          });
        }

        if (existing) {
          await tx
            .update(platformSettings)
            .set({ value, updatedAt: new Date() })
            .where(eq(platformSettings.key, key));
        } else {
          await tx.insert(platformSettings).values({ key, value });
        }
      }
    });
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const allSettings = await db.select().from(platformSettings);
    const result: Record<string, string> = {};
    for (const s of allSettings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async getSettingsAuditHistory(settingKey: string): Promise<(PlatformSettingsAudit & { changedBy: { fullName: string; phone: string } })[]> {
    const audits = await db
      .select({
        id: platformSettingsAudit.id,
        settingKey: platformSettingsAudit.settingKey,
        previousValue: platformSettingsAudit.previousValue,
        newValue: platformSettingsAudit.newValue,
        changedById: platformSettingsAudit.changedById,
        changedAt: platformSettingsAudit.changedAt,
        changedBy: {
          fullName: users.fullName,
          phone: users.phone,
        },
      })
      .from(platformSettingsAudit)
      .innerJoin(users, eq(platformSettingsAudit.changedById, users.id))
      .where(eq(platformSettingsAudit.settingKey, settingKey))
      .orderBy(desc(platformSettingsAudit.changedAt))
      .limit(5);
    return audits;
  }

  async getAllSettingsAuditHistory(): Promise<(PlatformSettingsAudit & { changedBy: { fullName: string; phone: string } })[]> {
    const audits = await db
      .select({
        id: platformSettingsAudit.id,
        settingKey: platformSettingsAudit.settingKey,
        previousValue: platformSettingsAudit.previousValue,
        newValue: platformSettingsAudit.newValue,
        changedById: platformSettingsAudit.changedById,
        changedAt: platformSettingsAudit.changedAt,
        changedBy: {
          fullName: users.fullName,
          phone: users.phone,
        },
      })
      .from(platformSettingsAudit)
      .innerJoin(users, eq(platformSettingsAudit.changedById, users.id))
      .orderBy(desc(platformSettingsAudit.changedAt))
      .limit(10);
    return audits;
  }

  async getImage(location: string): Promise<string | undefined> {
    const [img] = await db.select().from(platformImages).where(eq(platformImages.location, location));
    return img?.imageUrl;
  }

  async setImage(location: string, imageUrl: string): Promise<void> {
    const existing = await this.getImage(location);
    if (existing !== undefined) {
      await db.update(platformImages).set({ imageUrl, updatedAt: new Date() }).where(eq(platformImages.location, location));
    } else {
      await db.insert(platformImages).values({ location, imageUrl });
    }
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    todayRegistrations: number;
    todayDeposits: number;
    todayWithdrawals: number;
    totalDepositsAmount: number;
    totalWithdrawalsAmount: number;
    totalWithdrawalsCount: number;
    todayWithdrawalsAmount: number;
    usersWithProducts: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  }> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const [todayRegsResult] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, today));
    const [todayDepsResult] = await db.select({ count: count() }).from(deposits).where(gte(deposits.createdAt, today));
    const [todayWithsResult] = await db.select({ count: count() }).from(withdrawals).where(gte(withdrawals.createdAt, today));
    
    const approvedDeposits = await db.select().from(deposits).where(eq(deposits.status, "approved"));
    const totalDepositsAmount = approvedDeposits.reduce((sum, d) => sum + d.amount, 0);
    
    const approvedWithdrawals = await db.select().from(withdrawals).where(eq(withdrawals.status, "approved"));
    const totalWithdrawalsAmount = approvedWithdrawals.reduce((sum, w) => sum + w.netAmount, 0);
    const totalWithdrawalsCount = approvedWithdrawals.length;
    
    const todayApprovedWithdrawals = await db.select().from(withdrawals).where(
      and(
        eq(withdrawals.status, "approved"),
        gte(withdrawals.createdAt, today)
      )
    );
    const todayWithdrawalsAmount = todayApprovedWithdrawals.reduce((sum, w) => sum + w.netAmount, 0);
    
    const [usersWithProdsResult] = await db.select({ count: count() }).from(users).where(eq(users.hasProduct, true));
    const [pendingDepsResult] = await db.select({ count: count() }).from(deposits).where(eq(deposits.status, "pending"));
    const [pendingWithsResult] = await db.select({ count: count() }).from(withdrawals).where(eq(withdrawals.status, "pending"));

    return {
      totalUsers: totalUsersResult.count,
      todayRegistrations: todayRegsResult.count,
      todayDeposits: todayDepsResult.count,
      todayWithdrawals: todayWithsResult.count,
      totalDepositsAmount,
      totalWithdrawalsAmount,
      totalWithdrawalsCount,
      todayWithdrawalsAmount,
      usersWithProducts: usersWithProdsResult.count,
      pendingDeposits: pendingDepsResult.count,
      pendingWithdrawals: pendingWithsResult.count,
    };
  }

  async initializeDefaults(onProgress?: (step: string) => void): Promise<void> {
    onProgress?.("defaults.products.read");
    const existingProducts = await db.select().from(products);
    if (existingProducts.length === 0) {
      for (const vip of VIP_PRODUCTS) {
        onProgress?.("defaults.products.write");
        await this.createProduct({
          level: vip.level,
          name: vip.name,
          price: vip.price,
          dailyReturn: vip.dailyReturn,
          duration: vip.duration,
          totalReturn: vip.totalReturn,
          imageUrl: null,
          isActive: true,
        });
      }
    }

    onProgress?.("defaults.payment_channels.read");
    const [existingChannel] = await db
      .select({ id: paymentChannels.id })
      .from(paymentChannels)
      .limit(1);
    if (!existingChannel) {
      onProgress?.("defaults.payment_channels.write");
      await this.createPaymentChannel({
        name: "LeekPay",
        redirectUrl: "https://leekpay.fr/api/v1/checkout",
        isApi: true,
        isActive: true,
      });
    }

    const defaultSettings = {
      customerService: "",
      officialChannel: "",
      discussionGroup: "",
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      onProgress?.(`defaults.settings.${key}`);
      const existing = await this.getSetting(key);
      if (existing === undefined || /t\.me\//i.test(existing)) {
        await this.setSetting(key, value);
      }
    }

    const adminPhone = "99935673";
    const adminCountry = "TG";
    onProgress?.("defaults.admin.read");
    const existingAdmin = await this.getUserByPhone(adminPhone, adminCountry);
    
    if (!existingAdmin) {
      onProgress?.("defaults.admin.write");
      const hashedPassword = await bcrypt.hash("AAbb11##", 10);
      await db.insert(users).values({
        fullName: "Admin",
        phone: adminPhone,
        country: adminCountry,
        password: hashedPassword,
        referralCode: "ADMIN001",
        isAdmin: true,
        isSuperAdmin: true,
        balance: 0,
      });
    } else if (existingAdmin.isAdmin && !existingAdmin.isSuperAdmin) {
      onProgress?.("defaults.admin.update");
      await this.updateUser(existingAdmin.id, { isSuperAdmin: true });
    }
    onProgress?.("defaults.complete");
  }

  async getBonusCodes(): Promise<BonusCode[]> {
    return db.select().from(bonusCodes).orderBy(desc(bonusCodes.createdAt));
  }

  async getBonusCode(id: string): Promise<BonusCode | undefined> {
    const [code] = await db.select().from(bonusCodes).where(eq(bonusCodes.id, id));
    return code || undefined;
  }

  async getBonusCodeByCode(code: string): Promise<BonusCode | undefined> {
    const [bonusCode] = await db.select().from(bonusCodes).where(eq(bonusCodes.code, code));
    return bonusCode || undefined;
  }

  async createBonusCode(data: Omit<BonusCode, "id" | "createdAt" | "currentUses">): Promise<BonusCode> {
    const [created] = await db.insert(bonusCodes).values({
      ...data,
      currentUses: 0,
    }).returning();
    return created;
  }

  async updateBonusCode(id: string, updates: Partial<BonusCode>): Promise<BonusCode | undefined> {
    const [updated] = await db.update(bonusCodes).set(updates).where(eq(bonusCodes.id, id)).returning();
    return updated || undefined;
  }

  async deleteBonusCode(id: string): Promise<void> {
    await db.delete(bonusCodeUsages).where(eq(bonusCodeUsages.bonusCodeId, id));
    await db.delete(bonusCodes).where(eq(bonusCodes.id, id));
  }

  async getBonusCodeUsage(bonusCodeId: string, userId: string): Promise<BonusCodeUsage | undefined> {
    const [usage] = await db.select().from(bonusCodeUsages).where(
      and(eq(bonusCodeUsages.bonusCodeId, bonusCodeId), eq(bonusCodeUsages.userId, userId))
    );
    return usage || undefined;
  }

  async createBonusCodeUsage(data: Omit<BonusCodeUsage, "id" | "usedAt">): Promise<BonusCodeUsage> {
    const [created] = await db.insert(bonusCodeUsages).values(data).returning();
    return created;
  }

  async getBonusCodeUsages(bonusCodeId: string): Promise<(BonusCodeUsage & { user: User })[]> {
    const result = await db.select({
      id: bonusCodeUsages.id,
      bonusCodeId: bonusCodeUsages.bonusCodeId,
      userId: bonusCodeUsages.userId,
      usedAt: bonusCodeUsages.usedAt,
      user: users,
    })
    .from(bonusCodeUsages)
    .innerJoin(users, eq(bonusCodeUsages.userId, users.id))
    .where(eq(bonusCodeUsages.bonusCodeId, bonusCodeId))
    .orderBy(desc(bonusCodeUsages.usedAt));
    
    return result;
  }

  async createAdminAppointment(adminId: string, appointedById: string): Promise<AdminAppointment> {
    const [created] = await db.insert(adminAppointments).values({
      adminId,
      appointedById,
    }).returning();
    return created;
  }

  async getAdminAppointment(adminId: string): Promise<(AdminAppointment & { appointedBy: User }) | undefined> {
    const result = await db.select({
      id: adminAppointments.id,
      adminId: adminAppointments.adminId,
      appointedById: adminAppointments.appointedById,
      appointedAt: adminAppointments.appointedAt,
      revokedAt: adminAppointments.revokedAt,
      appointedBy: users,
    })
    .from(adminAppointments)
    .innerJoin(users, eq(adminAppointments.appointedById, users.id))
    .where(and(eq(adminAppointments.adminId, adminId), sql`${adminAppointments.revokedAt} IS NULL`))
    .orderBy(desc(adminAppointments.appointedAt))
    .limit(1);
    
    return result[0] || undefined;
  }

  async revokeAdminAppointment(adminId: string): Promise<void> {
    await db.update(adminAppointments)
      .set({ revokedAt: new Date() })
      .where(and(eq(adminAppointments.adminId, adminId), sql`${adminAppointments.revokedAt} IS NULL`));
  }

  async createPaymentChannelAudit(channelId: string, changedById: string, action: string, previousData?: any, newData?: any): Promise<PaymentChannelAudit> {
    const [created] = await db.insert(paymentChannelAudit).values({
      channelId,
      changedById,
      action,
      previousData,
      newData,
    }).returning();
    return created;
  }

  async getPaymentChannelAuditHistory(channelId: string, limit?: number): Promise<(PaymentChannelAudit & { changedBy: User })[]> {
    let query = db.select({
      id: paymentChannelAudit.id,
      channelId: paymentChannelAudit.channelId,
      changedById: paymentChannelAudit.changedById,
      action: paymentChannelAudit.action,
      previousData: paymentChannelAudit.previousData,
      newData: paymentChannelAudit.newData,
      changedAt: paymentChannelAudit.changedAt,
      changedBy: users,
    })
    .from(paymentChannelAudit)
    .innerJoin(users, eq(paymentChannelAudit.changedById, users.id))
    .where(eq(paymentChannelAudit.channelId, channelId))
    .orderBy(desc(paymentChannelAudit.changedAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getAllPaymentChannelAuditHistory(): Promise<(PaymentChannelAudit & { changedBy: User; channel?: PaymentChannel })[]> {
    const result = await db.select({
      id: paymentChannelAudit.id,
      channelId: paymentChannelAudit.channelId,
      changedById: paymentChannelAudit.changedById,
      action: paymentChannelAudit.action,
      previousData: paymentChannelAudit.previousData,
      newData: paymentChannelAudit.newData,
      changedAt: paymentChannelAudit.changedAt,
      changedBy: users,
      channel: paymentChannels,
    })
    .from(paymentChannelAudit)
    .innerJoin(users, eq(paymentChannelAudit.changedById, users.id))
    .leftJoin(paymentChannels, eq(paymentChannelAudit.channelId, paymentChannels.id))
    .orderBy(desc(paymentChannelAudit.changedAt));
    
    return result.map(({ channel, ...audit }) => ({
      ...audit,
      ...(channel ? { channel } : {}),
    }));
  }

  async getSupportMessages(
    userId: string,
    readerRole: "user" | "admin",
  ): Promise<SupportMessageWithAttachments[]> {
    const incomingSenderType = readerRole === "user" ? "admin" : "user";
    const messages = await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.userId, userId))
      .orderBy(desc(supportMessages.createdAt))
      .limit(300);

    if (messages.length === 0) return [];

    const orderedMessages = messages.reverse();
    const unreadIncomingIds = orderedMessages
      .filter((message) => message.senderType === incomingSenderType && message.readAt === null)
      .map((message) => message.id);

    if (unreadIncomingIds.length > 0) {
      await db.update(supportMessages)
        .set({ readAt: sql`clock_timestamp()` })
        .where(and(
          inArray(supportMessages.id, unreadIncomingIds),
          eq(supportMessages.senderType, incomingSenderType),
          isNull(supportMessages.readAt),
        ));

      const newlyReadMessages = await db.select({
        id: supportMessages.id,
        readAt: supportMessages.readAt,
      })
        .from(supportMessages)
        .where(inArray(supportMessages.id, unreadIncomingIds));
      const readAtById = new Map(newlyReadMessages.map((message) => [message.id, message.readAt]));
      for (const message of orderedMessages) {
        const readAt = readAtById.get(message.id);
        if (readAt) message.readAt = readAt;
      }
    }

    const attachments = await db.select({
      id: supportAttachments.id,
      messageId: supportAttachments.messageId,
      fileName: supportAttachments.fileName,
      mimeType: supportAttachments.mimeType,
      size: supportAttachments.size,
    })
      .from(supportAttachments)
      .where(inArray(supportAttachments.messageId, orderedMessages.map((message) => message.id)));
    const attachmentsByMessage = new Map<string, typeof attachments>();
    for (const attachment of attachments) {
      const items = attachmentsByMessage.get(attachment.messageId) || [];
      items.push(attachment);
      attachmentsByMessage.set(attachment.messageId, items);
    }

    return orderedMessages.map((message) => ({
      id: message.id,
      senderType: message.senderType,
      body: message.body,
      createdAt: message.createdAt,
      readAt: message.readAt,
      attachments: attachmentsByMessage.get(message.id) || [],
    }));
  }

  async getSupportConversations(): Promise<SupportConversationSummary[]> {
    const [recentMessages, unreadMessages] = await Promise.all([
      db.select({
        userId: supportMessages.userId,
        fullName: users.fullName,
        phone: users.phone,
        country: users.country,
        lastMessage: supportMessages.body,
        lastSenderType: supportMessages.senderType,
        lastMessageAt: supportMessages.createdAt,
      })
        .from(supportMessages)
        .innerJoin(users, eq(supportMessages.userId, users.id))
        .orderBy(desc(supportMessages.createdAt))
        .limit(2000),
      db.select({
        userId: supportMessages.userId,
        unreadCount: count(),
      })
        .from(supportMessages)
        .where(and(
          eq(supportMessages.senderType, "user"),
          isNull(supportMessages.readAt),
        ))
        .groupBy(supportMessages.userId),
    ]);

    const latestByUser = new Map<string, SupportConversationSummary>();
    for (const message of recentMessages) {
      if (!latestByUser.has(message.userId)) {
        latestByUser.set(message.userId, { ...message, unreadCount: 0 });
      }
    }
    for (const unread of unreadMessages) {
      const conversation = latestByUser.get(unread.userId);
      if (conversation) conversation.unreadCount = Number(unread.unreadCount);
    }
    return Array.from(latestByUser.values());
  }

  async getSupportUnreadCount(userId: string): Promise<number> {
    const [result] = await db.select({ unreadCount: count() })
      .from(supportMessages)
      .where(and(
        eq(supportMessages.userId, userId),
        eq(supportMessages.senderType, "admin"),
        isNull(supportMessages.readAt),
      ));

    return Number(result?.unreadCount || 0);
  }

  async createSupportUserMessage(userId: string, body: string, files: SupportAttachmentUpload[]): Promise<void> {
    await db.transaction(async (tx) => {
      const [message] = await tx.insert(supportMessages).values({
        userId,
        senderId: userId,
        senderType: "user",
        body,
        readAt: null,
      }).returning();

      if (files.length > 0) {
        await tx.insert(supportAttachments).values(files.map((file) => ({
          ...file,
          messageId: message.id,
          userId,
        })));
      }

      await tx.insert(supportMessages).values({
        userId,
        senderType: "system",
        body: "Bonjour, votre message a bien été reçu. L’équipe Terra vous répondra dès que possible.",
      });
    });
  }

  async createAdminSupportMessage(userId: string, adminId: string, body: string, files: SupportAttachmentUpload[]): Promise<void> {
    await db.transaction(async (tx) => {
      const [message] = await tx.insert(supportMessages).values({
        userId,
        senderId: adminId,
        senderType: "admin",
        body,
        readAt: null,
      }).returning();

      if (files.length > 0) {
        await tx.insert(supportAttachments).values(files.map((file) => ({
          ...file,
          messageId: message.id,
          userId,
        })));
      }
    });
  }

  async getSupportAttachment(id: string): Promise<SupportAttachment | undefined> {
    const [attachment] = await db.select()
      .from(supportAttachments)
      .where(eq(supportAttachments.id, id));
    return attachment || undefined;
  }
}

export const storage = new DatabaseStorage();
