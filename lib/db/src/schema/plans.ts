import { pgTable, text, boolean, timestamp, doublePrecision, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const planIntervalEnum = pgEnum("plan_interval", ["monthly", "yearly", "lifetime"]);

export const plansTable = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  interval: planIntervalEnum("interval").notNull(),
  transactionLimit: integer("transaction_limit"),
  features: text("features").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isFree: boolean("is_free").notNull().default(false),
  trialDays: integer("trial_days"),
  googlePlayProductId: text("google_play_product_id"),
  appleProductId: text("apple_product_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;
