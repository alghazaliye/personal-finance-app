import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const systemSettingsTable = pgTable("system_settings", {
  id: text("id").primaryKey().default("singleton"),
  appName: text("app_name").notNull().default("حسابي"),
  appNameAr: text("app_name_ar").notNull().default("حسابي"),
  supportEmail: text("support_email").notNull().default("support@hisabi.app"),
  trialDays: integer("trial_days").notNull().default(30),
  freeTransactionLimit: integer("free_transaction_limit").notNull().default(500),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  registrationEnabled: boolean("registration_enabled").notNull().default(true),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  defaultLanguage: text("default_language").notNull().default("ar"),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettingsTable);
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettingsTable.$inferSelect;
