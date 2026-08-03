import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, accountsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/monthly", requireAuth, async (req, res) => {
  const user = getUser(req);
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!month || !year) { res.status(400).json({ error: "validation", message: "Month and year required" }); return; }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [incResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "income"), gte(transactionsTable.date, start), lte(transactionsTable.date, end)));
  const [expResult] = await db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
    .from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "expense"), gte(transactionsTable.date, start), lte(transactionsTable.date, end)));

  const totalIncome = Number(incResult?.total ?? 0);
  const totalExpense = Number(expResult?.total ?? 0);

  // By category
  const catRows = await db.select({ categoryId: transactionsTable.categoryId, total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
    .from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "expense"), gte(transactionsTable.date, start), lte(transactionsTable.date, end)))
    .groupBy(transactionsTable.categoryId);

  const grandTotal = catRows.reduce((s, r) => s + Number(r.total), 0);
  const byCategory = await Promise.all(catRows.map(async (r) => {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, r.categoryId)).limit(1);
    return { categoryId: r.categoryId, categoryName: cat?.name ?? "Unknown", categoryIcon: cat?.icon ?? "circle", categoryColor: cat?.color ?? "#6366f1", amount: Number(r.total), percentage: grandTotal > 0 ? (Number(r.total) / grandTotal) * 100 : 0 };
  }));

  // Daily data
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = new Date(year, month - 1, d);
    const dayEnd = new Date(year, month - 1, d, 23, 59, 59);
    const [di] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "income"), gte(transactionsTable.date, dayStart), lte(transactionsTable.date, dayEnd)));
    const [de] = await db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` }).from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "expense"), gte(transactionsTable.date, dayStart), lte(transactionsTable.date, dayEnd)));
    dailyData.push({ date: dayStart.toISOString().split("T")[0], income: Number(di?.total ?? 0), expense: Number(de?.total ?? 0) });
  }

  res.json({ month, year, currency: user.currencyCode, totalIncome, totalExpense, netBalance: totalIncome - totalExpense, byCategory: byCategory.sort((a, b) => b.amount - a.amount), byAccount: [], dailyData });
});

router.get("/annual", requireAuth, async (req, res) => {
  const user = getUser(req);
  const year = Number(req.query.year);
  if (!year) { res.status(400).json({ error: "validation", message: "Year required" }); return; }

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);

  const [incResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "income"), gte(transactionsTable.date, start), lte(transactionsTable.date, end)));
  const [expResult] = await db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` }).from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "expense"), gte(transactionsTable.date, start), lte(transactionsTable.date, end)));

  const monthlyData = [];
  for (let m = 1; m <= 12; m++) {
    const mStart = new Date(year, m - 1, 1);
    const mEnd = new Date(year, m, 0, 23, 59, 59);
    const [mi] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "income"), gte(transactionsTable.date, mStart), lte(transactionsTable.date, mEnd)));
    const [me] = await db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` }).from(transactionsTable).where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "expense"), gte(transactionsTable.date, mStart), lte(transactionsTable.date, mEnd)));
    monthlyData.push({ month: m, income: Number(mi?.total ?? 0), expense: Number(me?.total ?? 0) });
  }

  res.json({ year, currency: user.currencyCode, totalIncome: Number(incResult?.total ?? 0), totalExpense: Number(expResult?.total ?? 0), netBalance: Number(incResult?.total ?? 0) - Number(expResult?.total ?? 0), monthlyData, topCategories: [] });
});

router.get("/category", requireAuth, async (req, res) => {
  const user = getUser(req);
  const startDate = String(req.query.startDate);
  const endDate = String(req.query.endDate);
  const type = String(req.query.type ?? "expense");

  const rows = await db.select({ categoryId: transactionsTable.categoryId, total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
    .from(transactionsTable).where(and(
      eq(transactionsTable.userId, user.id),
      eq(transactionsTable.type, type as any),
      gte(transactionsTable.date, new Date(startDate)),
      lte(transactionsTable.date, new Date(endDate)),
    )).groupBy(transactionsTable.categoryId);

  const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);
  const categories = await Promise.all(rows.map(async (r) => {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, r.categoryId)).limit(1);
    return { categoryId: r.categoryId, categoryName: cat?.name ?? "Unknown", categoryIcon: cat?.icon ?? "circle", categoryColor: cat?.color ?? "#6366f1", amount: Number(r.total), percentage: grandTotal > 0 ? (Number(r.total) / grandTotal) * 100 : 0 };
  }));

  res.json({ startDate, endDate, type, currency: user.currencyCode, categories: categories.sort((a, b) => b.amount - a.amount) });
});

router.post("/export", requireAuth, async (req, res) => {
  res.status(501).json({ error: "not_implemented", message: "PDF export requires additional setup" });
});

export default router;
