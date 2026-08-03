import { pgTable, text, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const currenciesTable = pgTable("currencies", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  symbol: text("symbol").notNull(),
  flag: text("flag"),
  rateToUsd: doublePrecision("rate_to_usd"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCurrencySchema = createInsertSchema(currenciesTable).omit({ id: true });
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type Currency = typeof currenciesTable.$inferSelect;
