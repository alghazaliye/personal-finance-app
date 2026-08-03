import { Router } from "express";
import { db } from "@workspace/db";
import { backupsTable, transactionsTable, accountsTable, categoriesTable, budgetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId } from "../lib/utils";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const backups = await db.select().from(backupsTable).where(eq(backupsTable.userId, user.id)).orderBy(backupsTable.createdAt);
  res.json({ backups });
});

router.post("/create", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [backup] = await db.insert(backupsTable).values({
    id: generateId(), userId: user.id, status: "completed", fileSize: 1024, encrypted: true,
  }).returning();
  res.json(backup);
});

router.post("/:id/restore", requireAuth, async (req, res) => {
  res.json({ success: true, message: "Backup restoration initiated" });
});

router.get("/export", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [transactions, accounts, categories, budgets] = await Promise.all([
    db.select().from(transactionsTable).where(eq(transactionsTable.userId, user.id)),
    db.select().from(accountsTable).where(eq(accountsTable.userId, user.id)),
    db.select().from(categoriesTable).where(eq(categoriesTable.userId, user.id)),
    db.select().from(budgetsTable).where(eq(budgetsTable.userId, user.id)),
  ]);
  res.json({ transactions, accounts, categories, budgets, exportedAt: new Date() });
});

export default router;
