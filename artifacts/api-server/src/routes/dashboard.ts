import { Router } from "express";
import { db } from "@workspace/db";
import {
  transactionsTable, accountsTable, categoriesTable,
  subscriptionsTable, plansTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

function getPeriodDates(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (period) {
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "quarter":
      start.setMonth(now.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
    default: // month
      start.setMonth(now.getMonth() - 1);
      break;
  }
  return { start, end };
}

router.get("/summary", requireAuth, async (req, res) => {
  const user = getUser(req);
  const period = String(req.query.period ?? "month");
  const { start, end } = getPeriodDates(period);

  const periodConds = and(
    eq(transactionsTable.userId, user.id),
    gte(transactionsTable.date, start),
    lte(transactionsTable.date, end),
  );

  const [incomeResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(transactionsTable).where(and(periodConds, eq(transactionsTable.type, "income")));
  const [expenseResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(transactionsTable).where(and(periodConds, eq(transactionsTable.type, "expense")));

  const accounts = await db.select().from(accountsTable)
    .where(and(eq(accountsTable.userId, user.id), eq(accountsTable.isActive, true)));
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const [txCount] = await db.select({ count: sql<number>`count(*)` })
    .from(transactionsTable).where(eq(transactionsTable.userId, user.id));

  const totalIncome = Number(incomeResult?.total ?? 0);
  const totalExpense = Number(expenseResult?.total ?? 0);

  res.json({
    totalBalance,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    currency: user.currencyCode,
    accountCount: accounts.length,
    transactionCount: Number(txCount?.count ?? 0),
    incomeChange: 0,
    expenseChange: 0,
  });
});

router.get("/chart", requireAuth, async (req, res) => {
  const user = getUser(req);
  const period = String(req.query.period ?? "month");

  // Generate last 6 months of data
  const labels: string[] = [];
  const income: number[] = [];
  const expenses: number[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    labels.push(date.toLocaleString("ar-SA", { month: "short" }));

    const [inc] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactionsTable).where(and(
        eq(transactionsTable.userId, user.id),
        eq(transactionsTable.type, "income"),
        gte(transactionsTable.date, start),
        lte(transactionsTable.date, end),
      ));
    const [exp] = await db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
      .from(transactionsTable).where(and(
        eq(transactionsTable.userId, user.id),
        eq(transactionsTable.type, "expense"),
        gte(transactionsTable.date, start),
        lte(transactionsTable.date, end),
      ));

    income.push(Number(inc?.total ?? 0));
    expenses.push(Number(exp?.total ?? 0));
  }

  res.json({ labels, income, expenses, currency: user.currencyCode });
});

router.get("/recent-transactions", requireAuth, async (req, res) => {
  const user = getUser(req);
  const limit = Math.min(50, Number(req.query.limit) || 10);

  const rows = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, user.id))
    .orderBy(desc(transactionsTable.date))
    .limit(limit);

  const transactions = await Promise.all(rows.map(async (t) => {
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, t.accountId)).limit(1);
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, t.categoryId)).limit(1);
    return { ...t, account: account ?? null, category: category ?? null };
  }));

  res.json({ transactions });
});

router.get("/category-breakdown", requireAuth, async (req, res) => {
  const user = getUser(req);
  const period = String(req.query.period ?? "month");
  const type = String(req.query.type ?? "expense");
  const { start, end } = getPeriodDates(period);

  const rows = await db.select({
    categoryId: transactionsTable.categoryId,
    total: sql<number>`COALESCE(SUM(ABS(amount)), 0)`,
  }).from(transactionsTable).where(and(
    eq(transactionsTable.userId, user.id),
    eq(transactionsTable.type, type as any),
    gte(transactionsTable.date, start),
    lte(transactionsTable.date, end),
  )).groupBy(transactionsTable.categoryId);

  const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);

  const items = await Promise.all(rows.map(async (r) => {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, r.categoryId)).limit(1);
    return {
      categoryId: r.categoryId,
      categoryName: cat?.name ?? "Unknown",
      categoryIcon: cat?.icon ?? "circle",
      categoryColor: cat?.color ?? "#6366f1",
      amount: Number(r.total),
      percentage: grandTotal > 0 ? (Number(r.total) / grandTotal) * 100 : 0,
    };
  }));

  res.json({ items: items.sort((a, b) => b.amount - a.amount), total: grandTotal, currency: user.currencyCode });
});

export default router;
