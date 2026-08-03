import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, transactionsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId } from "../lib/utils";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const accounts = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.userId, user.id), eq(accountsTable.isActive, true)))
    .orderBy(accountsTable.createdAt);
  res.json({ accounts });
});

router.post("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { name, type, currencyCode, balance, color, icon, bankName, accountNumber } = req.body;
  if (!name || !type || !currencyCode) {
    res.status(400).json({ error: "validation", message: "Name, type, and currency required" });
    return;
  }
  const id = generateId();
  const [account] = await db.insert(accountsTable).values({
    id, userId: user.id, name, type, currencyCode,
    balance: balance ?? 0, color, icon, bankName, accountNumber,
  }).returning();
  res.status(201).json(account);
});

router.get("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [account] = await db
    .select().from(accountsTable)
    .where(and(eq(accountsTable.id, req.params.id!), eq(accountsTable.userId, user.id)))
    .limit(1);
  if (!account) { res.status(404).json({ error: "not_found", message: "Account not found" }); return; }
  res.json(account);
});

router.put("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { name, type, currencyCode, color, icon, bankName, accountNumber, isActive } = req.body;
  const [updated] = await db.update(accountsTable).set({
    ...(name && { name }),
    ...(type && { type }),
    ...(currencyCode && { currencyCode }),
    ...(color !== undefined && { color }),
    ...(icon !== undefined && { icon }),
    ...(bankName !== undefined && { bankName }),
    ...(accountNumber !== undefined && { accountNumber }),
    ...(isActive !== undefined && { isActive }),
    updatedAt: new Date(),
  }).where(and(eq(accountsTable.id, req.params.id!), eq(accountsTable.userId, user.id))).returning();
  if (!updated) { res.status(404).json({ error: "not_found", message: "Account not found" }); return; }
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  await db.update(accountsTable).set({ isActive: false }).where(
    and(eq(accountsTable.id, req.params.id!), eq(accountsTable.userId, user.id))
  );
  res.json({ success: true, message: "Account deleted" });
});

router.get("/:id/summary", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [account] = await db.select().from(accountsTable)
    .where(and(eq(accountsTable.id, req.params.id!), eq(accountsTable.userId, user.id))).limit(1);
  if (!account) { res.status(404).json({ error: "not_found", message: "Account not found" }); return; }

  const transactions = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.accountId, req.params.id!))
    .orderBy(desc(transactionsTable.date))
    .limit(20);

  // Simple balance history (last 30 days)
  const balanceHistory = [];
  let runningBalance = account.balance;
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    balanceHistory.unshift({ date: date.toISOString().split("T")[0], balance: runningBalance });
  }

  res.json({ account, transactions, balanceHistory });
});

export default router;
