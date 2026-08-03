import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const themeEnum = pgEnum("theme_pref", ["light", "dark", "system"]);
export const languageEnum = pgEnum("language_pref", ["ar", "en"]);
export const backupFrequencyEnum = pgEnum("backup_frequency", ["daily", "weekly", "monthly"]);

export const settingsTable = pgTable("settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  theme: themeEnum("theme").notNull().default("system"),
  language: languageEnum("language").notNull().default("ar"),
  currencyCode: text("currency_code").notNull().default("USD"),
  dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
  numberFormat: text("number_format").notNull().default("ar-SA"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  budgetAlerts: boolean("budget_alerts").notNull().default(true),
  weeklyReport: boolean("weekly_report").notNull().default(false),
  backupEnabled: boolean("backup_enabled").notNull().default(false),
  backupFrequency: backupFrequencyEnum("backup_frequency").notNull().default("weekly"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
