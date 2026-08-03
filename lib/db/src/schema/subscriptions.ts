import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { plansTable } from "./plans";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial", "active", "cancelled", "expired"
]);

export const subscriptionsTable = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => plansTable.id),
  status: subscriptionStatusEnum("status").notNull(),
  startDate: timestamp("start_date").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
