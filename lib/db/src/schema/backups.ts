import { pgTable, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const backupStatusEnum = pgEnum("backup_status", ["pending", "completed", "failed"]);

export const backupsTable = pgTable("backups", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: backupStatusEnum("status").notNull().default("pending"),
  fileSize: integer("file_size"),
  googleDriveId: text("google_drive_id"),
  encrypted: boolean("encrypted").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBackupSchema = createInsertSchema(backupsTable).omit({ id: true, createdAt: true });
export type InsertBackup = z.infer<typeof insertBackupSchema>;
export type Backup = typeof backupsTable.$inferSelect;
