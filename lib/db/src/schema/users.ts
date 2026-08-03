import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  phone: text("phone"),
  country: text("country"),
  currencyCode: text("currency_code").notNull().default("USD"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  googleId: text("google_id"),
  fcmToken: text("fcm_token"),
  fcmPlatform: text("fcm_platform"),
  trialEndsAt: timestamp("trial_ends_at"),
  lastLoginAt: timestamp("last_login_at"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpiresAt: timestamp("reset_password_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
