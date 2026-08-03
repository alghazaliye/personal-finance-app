import { Router } from "express";
import { db } from "@workspace/db";
import { budgetsTable, transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId } from "../lib/utils";

const router = Router();

async function enrichBudget(b: typeof budgetsTable.$inferSelect, userId: string) {
  const now = new Date();
  const month = b.month;
  const year = b.year;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const [spentResult] = await db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
    .from(transactionsTable).where(and(
      eq(transactionsTable.userId, userId),
      eq(transactionsTable.categoryId, b.categoryId),
      eq(transactionsTable.type, "expense"),
      gte(transactionsTable.date, start),
      lte(transactionsTable.date, end),
    ));
  const spent = Number(spentResult?.total ?? 0);
  const remaining = Math.max(0, b.amount - spent);

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, b.categoryId)).limit(1);

  return {
    ...b,
    category: cat ?? null,
    spent,
    remaining,
    percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const budgets = await db.select().from(budgetsTable)
    .where(and(
      eq(budgetsTable.userId, user.id),
      eq(budgetsTable.month, month),
      eq(budgetsTable.year, year),
    ));

  const enriched = await Promise.all(budgets.map(b => enrichBudget(b, user.id)));
  res.json({ budgets: enriched });
});

router.get("/overview", requireAuth, async (req, res) => {
  const user = getUser(req);
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const budgets = await db.select().from(budgetsTable)
    .where(and(eq(budgetsTable.userId, user.id), eq(budgetsTable.month, month), eq(budgetsTable.year, year)));
  const enriched = await Promise.all(budgets.map(b => enrichBudget(b, user.id)));

  const totalBudget = enriched.reduce((s, b) => s + b.amount, 0);
  const totalSpent = enriched.reduce((s, b) => s + b.spent, 0);

  res.json({
    totalBudget,
    totalSpent,
    totalRemaining: Math.max(0, totalBudget - totalSpent),
    currency: user.currencyCode,
    budgets: enriched,
  });
});

router.post("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { categoryId, amount, currencyCode, month, year, alertThreshold } = req.body;
  if (!categoryId || !amount || !currencyCode || !month || !year) {
    res.status(400).json({ error: "validation", message: "Required fields missing" });
    return;
  }
  const [budget] = await db.insert(budgetsTable).values({
    id: generateId(), userId: user.id, categoryId, amount, currencyCode, month, year, alertThreshold,
  }).returning();
  const enriched = await enrichBudget(budget!, user.id);
  res.status(201).json(enriched);
});

router.put("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { amount, alertThreshold } = req.body;
  const [updated] = await db.update(budgetsTable).set({
    ...(amount && { amount }),
    ...(alertThreshold !== undefined && { alertThreshold }),
    updatedAt: new Date(),
  }).where(and(eq(budgetsTable.id, req.params.id!), eq(budgetsTable.userId, user.id))).returning();
  if (!updated) { res.status(404).json({ error: "not_found", message: "Budget not found" }); return; }
  const enriched = await enrichBudget(updated, user.id);
  res.json(enriched);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  await db.delete(budgetsTable).where(and(eq(budgetsTable.id, req.params.id!), eq(budgetsTable.userId, user.id)));
  res.json({ success: true, message: "Budget deleted" });
});

export default router;
