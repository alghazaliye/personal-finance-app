import { pgTable, text, timestamp, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { plansTable } from "./plans";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);
export const paymentPlatformEnum = pgEnum("payment_platform", ["web", "android", "ios"]);

export const paymentsTable = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plansTable.id),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  platform: paymentPlatformEnum("platform"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
