import { pgTable, text, timestamp, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { accountsTable } from "./accounts";
import { categoriesTable } from "./categories";

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "transfer"]);

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: doublePrecision("amount").notNull(),
  currencyCode: text("currency_code").notNull(),
  exchangeRate: doublePrecision("exchange_rate"),
  accountId: text("account_id").notNull().references(() => accountsTable.id),
  categoryId: text("category_id").notNull().references(() => categoriesTable.id),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  transferToAccountId: text("transfer_to_account_id"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
