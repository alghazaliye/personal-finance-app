import { pgTable, text, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense", "both"]);

export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  type: categoryTypeEnum("type").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  parentId: text("parent_id"),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
