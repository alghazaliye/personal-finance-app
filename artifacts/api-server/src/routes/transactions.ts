import { Router } from "express";
import { db } from "@workspace/db";
import {
  transactionsTable, accountsTable, categoriesTable,
  subscriptionsTable, plansTable
} from "@workspace/db";
import { eq, and, desc, sql, gte, lte, like, inArray } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId, paginate, totalPages } from "../lib/utils";

const router = Router();

async function checkTransactionLimit(userId: string): Promise<boolean> {
  const [sub] = await db.select({ limit: plansTable.transactionLimit })
    .from(subscriptionsTable)
    .leftJoin(plansTable, eq(subscriptionsTable.planId, plansTable.id))
    .where(and(eq(subscriptionsTable.userId, userId), inArray(subscriptionsTable.status, ["trial", "active"])))
    .limit(1);
  if (!sub || sub.limit === null) return true;
  const [count] = await db.select({ count: sql<number>`count(*)` })
    .from(transactionsTable).where(eq(transactionsTable.userId, userId));
  return (count?.count ?? 0) < sub.limit;
}

router.get("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { limit: lim, offset } = paginate(page, limit);

  const conditions = [eq(transactionsTable.userId, user.id)];
  if (req.query.accountId) conditions.push(eq(transactionsTable.accountId, String(req.query.accountId)));
  if (req.query.categoryId) conditions.push(eq(transactionsTable.categoryId, String(req.query.categoryId)));
  if (req.query.type) conditions.push(eq(transactionsTable.type, req.query.type as any));
  if (req.query.startDate) conditions.push(gte(transactionsTable.date, new Date(String(req.query.startDate))));
  if (req.query.endDate) conditions.push(lte(transactionsTable.date, new Date(String(req.query.endDate))));
  if (req.query.search) conditions.push(like(transactionsTable.description, `%${req.query.search}%`));

  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(transactionsTable).where(and(...conditions));
  const total = Number(countResult?.count ?? 0);

  const rows = await db.select().from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.date))
    .limit(lim).offset(offset);

  const transactions = await Promise.all(rows.map(async (t) => {
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, t.accountId)).limit(1);
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, t.categoryId)).limit(1);
    return { ...t, account: account ?? null, category: category ?? null };
  }));

  res.json({ transactions, total, page, limit: lim, totalPages: totalPages(total, lim) });
});

router.post("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const canAdd = await checkTransactionLimit(user.id);
  if (!canAdd) {
    res.status(403).json({ error: "limit_reached", message: "Transaction limit reached. Please upgrade your plan." });
    return;
  }

  const { type, amount, currencyCode, accountId, categoryId, description, date, receiptUrl } = req.body;
  if (!type || !amount || !currencyCode || !accountId || !categoryId || !date) {
    res.status(400).json({ error: "validation", message: "Required fields missing" });
    return;
  }

  const id = generateId();
  const [tx] = await db.insert(transactionsTable).values({
    id, userId: user.id, type, amount, currencyCode, accountId, categoryId,
    description, date: new Date(date), receiptUrl,
  }).returning();

  // Update account balance
  const balanceDelta = type === "income" ? amount : -amount;
  await db.update(accountsTable).set({ balance: sql`balance + ${balanceDelta}` })
    .where(eq(accountsTable.id, accountId));

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId)).limit(1);
  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, categoryId)).limit(1);
  res.status(201).json({ ...tx!, account: account ?? null, category: category ?? null });
});

router.post("/transfer", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { fromAccountId, toAccountId, amount, currencyCode, description, date } = req.body;

  // Use a transfer category
  const [transferCat] = await db.select().from(categoriesTable)
    .where(and(eq(categoriesTable.name, "Transfer"), eq(categoriesTable.isDefault, true))).limit(1);
  const categoryId = transferCat?.id ?? "cat-transfer";

  const fromId = generateId();
  const toId = generateId();
  const txDate = new Date(date);

  const [fromTx] = await db.insert(transactionsTable).values({
    id: fromId, userId: user.id, type: "transfer", amount: -Math.abs(amount),
    currencyCode, accountId: fromAccountId, categoryId,
    description: description ?? "Transfer", date: txDate, transferToAccountId: toAccountId,
  }).returning();

  const [toTx] = await db.insert(transactionsTable).values({
    id: toId, userId: user.id, type: "transfer", amount: Math.abs(amount),
    currencyCode, accountId: toAccountId, categoryId,
    description: description ?? "Transfer", date: txDate, transferToAccountId: fromAccountId,
  }).returning();

  await db.update(accountsTable).set({ balance: sql`balance - ${amount}` }).where(eq(accountsTable.id, fromAccountId));
  await db.update(accountsTable).set({ balance: sql`balance + ${amount}` }).where(eq(accountsTable.id, toAccountId));

  res.status(201).json({ fromTransaction: fromTx, toTransaction: toTx });
});

router.get("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [tx] = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.id, req.params.id!), eq(transactionsTable.userId, user.id))).limit(1);
  if (!tx) { res.status(404).json({ error: "not_found", message: "Transaction not found" }); return; }
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, tx.accountId)).limit(1);
  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, tx.categoryId)).limit(1);
  res.json({ ...tx, account: account ?? null, category: category ?? null });
});

router.put("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [existing] = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.id, req.params.id!), eq(transactionsTable.userId, user.id))).limit(1);
  if (!existing) { res.status(404).json({ error: "not_found", message: "Transaction not found" }); return; }

  const { amount, currencyCode, accountId, categoryId, description, date, receiptUrl } = req.body;

  // Reverse old balance effect
  const oldDelta = existing.type === "income" ? -existing.amount : existing.amount;
  await db.update(accountsTable).set({ balance: sql`balance + ${oldDelta}` }).where(eq(accountsTable.id, existing.accountId));

  const [updated] = await db.update(transactionsTable).set({
    ...(amount && { amount }),
    ...(currencyCode && { currencyCode }),
    ...(accountId && { accountId }),
    ...(categoryId && { categoryId }),
    ...(description !== undefined && { description }),
    ...(date && { date: new Date(date) }),
    ...(receiptUrl !== undefined && { receiptUrl }),
    updatedAt: new Date(),
  }).where(eq(transactionsTable.id, req.params.id!)).returning();

  const newAmount = amount ?? existing.amount;
  const newType = existing.type;
  const newAccountId = accountId ?? existing.accountId;
  const newDelta = newType === "income" ? newAmount : -newAmount;
  await db.update(accountsTable).set({ balance: sql`balance + ${newDelta}` }).where(eq(accountsTable.id, newAccountId));

  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [tx] = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.id, req.params.id!), eq(transactionsTable.userId, user.id))).limit(1);
  if (!tx) { res.status(404).json({ error: "not_found", message: "Transaction not found" }); return; }

  // Reverse balance
  const delta = tx.type === "income" ? -tx.amount : tx.amount;
  await db.update(accountsTable).set({ balance: sql`balance + ${delta}` }).where(eq(accountsTable.id, tx.accountId));
  await db.delete(transactionsTable).where(eq(transactionsTable.id, req.params.id!));

  res.json({ success: true, message: "Transaction deleted" });
});

export default router;
