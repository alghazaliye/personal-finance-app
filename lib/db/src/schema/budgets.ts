import { pgTable, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const budgetsTable = pgTable("budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categoriesTable.id),
  amount: doublePrecision("amount").notNull(),
  currencyCode: text("currency_code").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  alertThreshold: doublePrecision("alert_threshold"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetsTable.$inferSelect;
