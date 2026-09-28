import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const ELIGIBLE_COUNTRIES = [
  { code: "CM", name: "Cameroun", flag: "CM", dialCode: "237", gmtOffsetHours: 1 },
  { code: "BF", name: "Burkina Faso", flag: "BF", dialCode: "226", gmtOffsetHours: 0 },
  { code: "TG", name: "Togo", flag: "TG", dialCode: "228", gmtOffsetHours: 0 },
  { code: "BJ", name: "Bénin", flag: "BJ", dialCode: "229", gmtOffsetHours: 1 },
  { code: "CI", name: "Côte d'Ivoire", flag: "CI", dialCode: "225", gmtOffsetHours: 0 },
] as const;

export const PAYMENT_METHODS_BY_COUNTRY: Record<string, string[]> = {
  TG: ["Moov Money", "Mixx by Yas"],
  CI: ["Wave", "MTN", "Orange Money", "Moov Money"],
  BJ: ["Celtis", "Moov Money", "MTN", "Momo"],
  CM: ["Orange Money", "MTN"],
  BF: ["Orange Money", "Moov Money"],
};

export const VIP_PRODUCTS = [
  { level: 1, name: "VIP 1", price: 3000, dailyReturn: 350, duration: 100, totalReturn: 35000 },
  { level: 2, name: "VIP 2", price: 5000, dailyReturn: 600, duration: 100, totalReturn: 60000 },
  { level: 3, name: "VIP 3", price: 10000, dailyReturn: 1200, duration: 100, totalReturn: 120000 },
  { level: 4, name: "VIP 4", price: 20000, dailyReturn: 2500, duration: 100, totalReturn: 250000 },
  { level: 5, name: "VIP 5", price: 50000, dailyReturn: 6000, duration: 100, totalReturn: 600000 },
  { level: 6, name: "VIP 6", price: 100000, dailyReturn: 15000, duration: 100, totalReturn: 1500000 },
] as const;

export const DEFAULT_BUSINESS_SETTINGS = {
  referralLevel1Percentage: 25,
  referralLevel2Percentage: 3,
  referralLevel3Percentage: 2,
  signupBonus: 700,
  withdrawalMinimum: 1500,
  withdrawalFeePercentage: 10,
  withdrawalStartHourGmt: 10,
  withdrawalEndHourGmt: 17,
} as const;

export const businessSettingsFieldsSchema = z.object({
  referralLevel1Percentage: z.number().int().min(0).max(100),
  referralLevel2Percentage: z.number().int().min(0).max(100),
  referralLevel3Percentage: z.number().int().min(0).max(100),
  signupBonus: z.number().int().min(0).max(100_000_000),
  withdrawalMinimum: z.number().int().min(1).max(100_000_000),
  withdrawalFeePercentage: z.number().int().min(0).max(100),
  withdrawalStartHourGmt: z.number().int().min(0).max(23),
  withdrawalEndHourGmt: z.number().int().min(0).max(23),
});

export const platformBusinessSettingsSchema = businessSettingsFieldsSchema.refine(
  (settings) =>
    settings.referralLevel1Percentage +
      settings.referralLevel2Percentage +
      settings.referralLevel3Percentage <=
    100,
  { message: "La somme des commissions de parrainage ne peut pas dépasser 100%." },
).refine(
  (settings) => settings.withdrawalStartHourGmt !== settings.withdrawalEndHourGmt,
  { message: "Les heures d’ouverture et de fermeture des retraits doivent être différentes." },
);

export type PlatformBusinessSettings = z.infer<typeof platformBusinessSettingsSchema>;

export const REFERRAL_LEVELS = [
  { level: 1, percentage: DEFAULT_BUSINESS_SETTINGS.referralLevel1Percentage },
  { level: 2, percentage: DEFAULT_BUSINESS_SETTINGS.referralLevel2Percentage },
  { level: 3, percentage: DEFAULT_BUSINESS_SETTINGS.referralLevel3Percentage },
] as const;

export const REFERRAL_TASKS = [
  { id: 1, requiredInvestors: 2, reward: 150, description: "Inviter 2 membres qui investissent" },
  { id: 2, requiredInvestors: 5, reward: 300, description: "Inviter 5 membres qui investissent" },
  { id: 3, requiredInvestors: 10, reward: 600, description: "Inviter 10 membres qui investissent" },
  { id: 4, requiredInvestors: 20, reward: 1200, description: "Inviter 20 membres qui investissent" },
  { id: 5, requiredInvestors: 50, reward: 3000, description: "Inviter 50 membres qui investissent" },
  { id: 6, requiredInvestors: 100, reward: 6000, description: "Inviter 100 membres qui investissent" },
  { id: 7, requiredInvestors: 200, reward: 9000, description: "Inviter 200 membres qui investissent" },
  { id: 8, requiredInvestors: 300, reward: 11000, description: "Inviter 300 membres qui investissent" },
] as const;

export const PRODUCT_TASK = { requiredProduct: 5, reward: 700, description: "Acheter un produit VIP5 pour recevoir 700F" };

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().unique(),
  country: text("country").notNull(),
  password: text("password").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referrerId: varchar("referrer_id", { length: 36 }),
  balance: integer("balance").notNull().default(0),
  todayEarnings: integer("today_earnings").notNull().default(0),
  totalEarnings: integer("total_earnings").notNull().default(0),
  totalDeposits: integer("total_deposits").notNull().default(0),
  totalWithdrawals: integer("total_withdrawals").notNull().default(0),
  referralEarnings: integer("referral_earnings").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  isPromoter: boolean("is_promoter").notNull().default(false),
  withdrawalBlocked: boolean("withdrawal_blocked").notNull().default(false),
  requiresInvestorReferral: boolean("requires_investor_referral").notNull().default(false),
  hasDeposited: boolean("has_deposited").notNull().default(false),
  hasProduct: boolean("has_product").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastEarningsReset: timestamp("last_earnings_reset").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  products: many(userProducts),
  deposits: many(deposits),
  withdrawals: many(withdrawals),
  wallets: many(wallets),
  referrer: one(users, { fields: [users.referrerId], references: [users.id] }),
  earnings: many(earnings),
  claimedTasks: many(claimedTasks),
}));

export const products = pgTable("products", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  level: integer("level").notNull().unique(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  dailyReturn: integer("daily_return").notNull(),
  duration: integer("duration").notNull().default(100),
  totalReturn: integer("total_return").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const productsRelations = relations(products, ({ many }) => ({
  userProducts: many(userProducts),
}));

export const userProducts = pgTable("user_products", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  productId: varchar("product_id", { length: 36 }).notNull(),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  nextPayoutAt: timestamp("next_payout_at").notNull(),
  cyclesCompleted: integer("cycles_completed").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  assignedByAdmin: boolean("assigned_by_admin").notNull().default(false),
});

export const userProductsRelations = relations(userProducts, ({ one }) => ({
  user: one(users, { fields: [userProducts.userId], references: [users.id] }),
  product: one(products, { fields: [userProducts.productId], references: [products.id] }),
}));

export const wallets = pgTable("wallets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  country: text("country").notNull(),
  paymentMethod: text("payment_method").notNull(),
  isDefault: boolean("is_default").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
}));

export const paymentChannels = pgTable("payment_channels", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  redirectUrl: text("redirect_url"),
  isApi: boolean("is_api").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deposits = pgTable("deposits", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  amount: integer("amount").notNull(),
  channelId: varchar("channel_id", { length: 36 }),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  country: text("country").notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  processedBy: varchar("processed_by", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const depositsRelations = relations(deposits, ({ one }) => ({
  user: one(users, { fields: [deposits.userId], references: [users.id] }),
  channel: one(paymentChannels, { fields: [deposits.channelId], references: [paymentChannels.id] }),
}));

export const withdrawals = pgTable("withdrawals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  walletId: varchar("wallet_id", { length: 36 }).notNull(),
  grossAmount: integer("gross_amount").notNull(),
  feeAmount: integer("fee_amount").notNull(),
  netAmount: integer("net_amount").notNull(),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  processedBy: varchar("processed_by", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, { fields: [withdrawals.userId], references: [users.id] }),
  wallet: one(wallets, { fields: [withdrawals.walletId], references: [wallets.id] }),
}));

export const earnings = pgTable("earnings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  sourceId: varchar("source_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const earningsRelations = relations(earnings, ({ one }) => ({
  user: one(users, { fields: [earnings.userId], references: [users.id] }),
}));

export const claimedTasks = pgTable("claimed_tasks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  taskId: integer("task_id").notNull(),
  taskType: text("task_type").notNull(),
  reward: integer("reward").notNull(),
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
});

export const claimedTasksRelations = relations(claimedTasks, ({ one }) => ({
  user: one(users, { fields: [claimedTasks.userId], references: [users.id] }),
}));

export const platformSettings = pgTable("platform_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const platformSettingsAudit = pgTable("platform_settings_audit", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value").notNull(),
  changedById: varchar("changed_by_id", { length: 36 }).notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const platformSettingsAuditRelations = relations(platformSettingsAudit, ({ one }) => ({
  changedBy: one(users, { fields: [platformSettingsAudit.changedById], references: [users.id] }),
}));

export const platformImages = pgTable("platform_images", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  location: text("location").notNull().unique(),
  imageUrl: text("image_url").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bonusCodes = pgTable("bonus_codes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  amount: integer("amount").notNull(),
  maxUses: integer("max_uses").notNull(),
  currentUses: integer("current_uses").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 36 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bonusCodesRelations = relations(bonusCodes, ({ one, many }) => ({
  creator: one(users, { fields: [bonusCodes.createdBy], references: [users.id] }),
  usages: many(bonusCodeUsages),
}));

export const bonusCodeUsages = pgTable("bonus_code_usages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bonusCodeId: varchar("bonus_code_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

export const bonusCodeUsagesRelations = relations(bonusCodeUsages, ({ one }) => ({
  bonusCode: one(bonusCodes, { fields: [bonusCodeUsages.bonusCodeId], references: [bonusCodes.id] }),
  user: one(users, { fields: [bonusCodeUsages.userId], references: [users.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  balance: true, 
  todayEarnings: true,
  totalEarnings: true,
  totalDeposits: true,
  totalWithdrawals: true,
  referralEarnings: true,
  isAdmin: true,
  isSuperAdmin: true,
  isBanned: true,
  isPromoter: true,
  withdrawalBlocked: true,
  requiresInvestorReferral: true,
  hasDeposited: true,
  hasProduct: true,
  createdAt: true,
  lastEarningsReset: true,
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Nom complet requis"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  country: z.string().min(2, "Pays requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  invitationCode: z.string().optional(),
});

export const loginSchema = z.object({
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  country: z.string().min(2, "Pays requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const depositSchema = z.object({
  amount: z.number().min(3000, "Dépôt minimum: 3000 FCFA"),
  channelId: z.string(),
  accountName: z.string().min(2, "Nom du compte requis"),
  accountNumber: z.string().min(8, "Numéro de compte requis"),
  country: z.string(),
  paymentMethod: z.string(),
});

export const withdrawalSchema = z.object({
  amount: z.number().int().positive("Le montant doit être supérieur à 0"),
  walletId: z.string(),
});

export const walletSchema = z.object({
  accountName: z.string().min(2, "Nom du compte requis"),
  accountNumber: z.string().min(8, "Numéro de compte requis"),
  country: z.string(),
  paymentMethod: z.string(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string().min(1, "Confirmation requise"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const bonusCodeSchema = z.object({
  code: z.string().min(3, "Code doit contenir au moins 3 caractères"),
  amount: z.number().min(1, "Montant doit être supérieur à 0"),
  maxUses: z.number().min(1, "Nombre d'utilisations minimum: 1"),
  expiresAt: z.string(),
});

export const exchangeCodeSchema = z.object({
  code: z.string().min(1, "Code requis"),
});

export const adminAppointments = pgTable("admin_appointments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id", { length: 36 }).notNull(),
  appointedById: varchar("appointed_by_id", { length: 36 }).notNull(),
  appointedAt: timestamp("appointed_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

export const adminAppointmentsRelations = relations(adminAppointments, ({ one }) => ({
  admin: one(users, { fields: [adminAppointments.adminId], references: [users.id] }),
  appointedBy: one(users, { fields: [adminAppointments.appointedById], references: [users.id] }),
}));

export const paymentChannelAudit = pgTable("payment_channel_audit", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id", { length: 36 }).notNull(),
  changedById: varchar("changed_by_id", { length: 36 }).notNull(),
  action: text("action").notNull(),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const paymentChannelAuditRelations = relations(paymentChannelAudit, ({ one }) => ({
  channel: one(paymentChannels, { fields: [paymentChannelAudit.channelId], references: [paymentChannels.id] }),
  changedBy: one(users, { fields: [paymentChannelAudit.changedById], references: [users.id] }),
}));

export const supportMessages = pgTable("support_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  senderType: text("sender_type").$type<"user" | "admin" | "system">().notNull(),
  body: text("body").notNull().default(""),
  createdAt: timestamp("created_at").notNull().default(sql`clock_timestamp()`),
  readAt: timestamp("read_at").defaultNow(),
});

export const supportAttachments = pgTable("support_attachments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id", { length: 36 }).notNull().references(() => supportMessages.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supportMessagesRelations = relations(supportMessages, ({ one, many }) => ({
  user: one(users, { fields: [supportMessages.userId], references: [users.id] }),
  attachments: many(supportAttachments),
}));

export const supportAttachmentsRelations = relations(supportAttachments, ({ one }) => ({
  message: one(supportMessages, { fields: [supportAttachments.messageId], references: [supportMessages.id] }),
  user: one(users, { fields: [supportAttachments.userId], references: [users.id] }),
}));

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type UserProduct = typeof userProducts.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type PaymentChannel = typeof paymentChannels.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type Earning = typeof earnings.$inferSelect;
export type ClaimedTask = typeof claimedTasks.$inferSelect;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type PlatformSettingsAudit = typeof platformSettingsAudit.$inferSelect;
export type PlatformImage = typeof platformImages.$inferSelect;
export type BonusCode = typeof bonusCodes.$inferSelect;
export type BonusCodeUsage = typeof bonusCodeUsages.$inferSelect;
export type AdminAppointment = typeof adminAppointments.$inferSelect;
export type PaymentChannelAudit = typeof paymentChannelAudit.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type SupportAttachment = typeof supportAttachments.$inferSelect;
