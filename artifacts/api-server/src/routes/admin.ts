import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, subscriptionsTable, plansTable,
  paymentsTable, transactionsTable, currenciesTable,
  notificationsTable, systemSettingsTable,
} from "@workspace/db";
import { eq, and, sql, gte, lte, desc, inArray, like, ne } from "drizzle-orm";
import { requireAdmin, getUser } from "../lib/auth";
import { generateId, paginate, totalPages } from "../lib/utils";

const router = Router();

router.get("/stats", requireAdmin, async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [activeUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.isActive, true));
  const [trialUsers] = await db.select({ count: sql<number>`count(*)` }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "trial"));
  const [subscribedUsers] = await db.select({ count: sql<number>`count(*)` }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "active"));
  const [totalRevenue] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(paymentsTable).where(eq(paymentsTable.status, "completed"));
  const [monthlyRevenue] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(paymentsTable).where(and(eq(paymentsTable.status, "completed"), gte(paymentsTable.createdAt, monthStart)));
  const [totalTxCount] = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable);
  const [newUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(gte(usersTable.createdAt, monthStart));
  const activeCount = Number(activeUsers?.count ?? 0);
  const totalCount = Number(totalUsers?.count ?? 0);

  res.json({
    totalUsers: totalCount,
    activeUsers: activeCount,
    trialUsers: Number(trialUsers?.count ?? 0),
    subscribedUsers: Number(subscribedUsers?.count ?? 0),
    totalRevenue: Number(totalRevenue?.total ?? 0),
    monthlyRevenue: Number(monthlyRevenue?.total ?? 0),
    totalTransactions: Number(totalTxCount?.count ?? 0),
    newUsersThisMonth: Number(newUsers?.count ?? 0),
    conversionRate: totalCount > 0 ? (Number(subscribedUsers?.count ?? 0) / totalCount) * 100 : 0,
  });
});

router.get("/revenue", requireAdmin, async (req, res) => {
  const labels: string[] = [];
  const revenue: number[] = [];
  const subscriptions: number[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    labels.push(date.toLocaleString("ar-SA", { month: "short" }));
    const [r] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(paymentsTable).where(and(eq(paymentsTable.status, "completed"), gte(paymentsTable.createdAt, start), lte(paymentsTable.createdAt, end)));
    const [s] = await db.select({ count: sql<number>`count(*)` }).from(subscriptionsTable).where(and(eq(subscriptionsTable.status, "active"), gte(subscriptionsTable.createdAt, start), lte(subscriptionsTable.createdAt, end)));
    revenue.push(Number(r?.total ?? 0));
    subscriptions.push(Number(s?.count ?? 0));
  }

  const [total] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(paymentsTable).where(eq(paymentsTable.status, "completed"));
  res.json({ labels, revenue, subscriptions, total: Number(total?.total ?? 0) });
});

router.get("/users", requireAdmin, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { limit: lim, offset } = paginate(page, limit);

  const conditions: any[] = [];
  if (req.query.search) conditions.push(like(usersTable.name, `%${req.query.search}%`));

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(conditions.length ? and(...conditions) : undefined);
  const total = Number(countResult?.count ?? 0);
  const users = await db.select().from(usersTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(usersTable.createdAt)).limit(lim).offset(offset);

  const enriched = await Promise.all(users.map(async (u) => {
    const [sub] = await db.select({ planName: plansTable.name, status: subscriptionsTable.status, expiresAt: subscriptionsTable.expiresAt }).from(subscriptionsTable).leftJoin(plansTable, eq(subscriptionsTable.planId, plansTable.id)).where(eq(subscriptionsTable.userId, u.id)).limit(1);
    const [txCount] = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable).where(eq(transactionsTable.userId, u.id));
    return { ...u, passwordHash: undefined, subscription: sub ? { planName: sub.planName ?? "", status: sub.status, expiresAt: sub.expiresAt } : null, transactionCount: Number(txCount?.count ?? 0), accountCount: 0, lastLoginAt: u.lastLoginAt };
  }));

  res.json({ users: enriched, total, page, limit: lim, totalPages: totalPages(total, lim) });
});

router.get("/users/:id", requireAdmin, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id!)).limit(1);
  if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, user.id)).limit(1);
  const [plan] = sub ? await db.select().from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1) : [null];
  const [txCount] = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable).where(eq(transactionsTable.userId, user.id));
  res.json({ ...user, passwordHash: undefined, subscription: sub ? { ...sub, plan } : null, transactionCount: Number(txCount?.count ?? 0), accountCount: 0 });
});

router.put("/users/:id", requireAdmin, async (req, res) => {
  const { name, role, isActive, currencyCode } = req.body;
  const [updated] = await db.update(usersTable).set({
    ...(name && { name }),
    ...(role && { role }),
    ...(isActive !== undefined && { isActive }),
    ...(currencyCode && { currencyCode }),
    updatedAt: new Date(),
  }).where(eq(usersTable.id, req.params.id!)).returning();
  if (!updated) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  res.json({ ...updated, passwordHash: undefined });
});

router.put("/users/:id/toggle-status", requireAdmin, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id!)).limit(1);
  if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  await db.update(usersTable).set({ isActive: !user.isActive }).where(eq(usersTable.id, req.params.id!));
  res.json({ success: true, message: `User ${user.isActive ? "deactivated" : "activated"}` });
});

router.get("/plans", requireAdmin, async (_req, res) => {
  const plans = await db.select().from(plansTable);
  res.json({ plans });
});

router.post("/plans", requireAdmin, async (req, res) => {
  const { name, nameAr, description, price, currency, interval, transactionLimit, features, isFree, trialDays, googlePlayProductId, appleProductId } = req.body;
  const [plan] = await db.insert(plansTable).values({
    id: generateId(), name, nameAr, description, price: price ?? 0, currency: currency ?? "USD", interval,
    transactionLimit, features: features ?? [], isFree: isFree ?? false, trialDays, googlePlayProductId, appleProductId,
  }).returning();
  res.status(201).json(plan);
});

router.put("/plans/:id", requireAdmin, async (req, res) => {
  const { name, nameAr, description, price, transactionLimit, features, isActive } = req.body;
  const [updated] = await db.update(plansTable).set({
    ...(name && { name }),
    ...(nameAr !== undefined && { nameAr }),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price }),
    ...(transactionLimit !== undefined && { transactionLimit }),
    ...(features && { features }),
    ...(isActive !== undefined && { isActive }),
    updatedAt: new Date(),
  }).where(eq(plansTable.id, req.params.id!)).returning();
  if (!updated) { res.status(404).json({ error: "not_found", message: "Plan not found" }); return; }
  res.json(updated);
});

router.delete("/plans/:id", requireAdmin, async (req, res) => {
  await db.update(plansTable).set({ isActive: false }).where(eq(plansTable.id, req.params.id!));
  res.json({ success: true, message: "Plan deactivated" });
});

router.get("/currencies", requireAdmin, async (_req, res) => {
  const currencies = await db.select().from(currenciesTable);
  res.json({ currencies });
});

router.post("/currencies", requireAdmin, async (req, res) => {
  const { code, name, nameAr, symbol, flag, rateToUsd } = req.body;
  const [cur] = await db.insert(currenciesTable).values({ id: generateId(), code, name, nameAr, symbol, flag, rateToUsd }).returning();
  res.status(201).json(cur);
});

router.put("/currencies/:id/exchange-rate", requireAdmin, async (req, res) => {
  const { rate } = req.body;
  const [updated] = await db.update(currenciesTable).set({ rateToUsd: rate, updatedAt: new Date() }).where(eq(currenciesTable.id, req.params.id!)).returning();
  if (!updated) { res.status(404).json({ error: "not_found", message: "Currency not found" }); return; }
  res.json(updated);
});

router.get("/subscriptions", requireAdmin, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { limit: lim, offset } = paginate(page, limit);
  const status = req.query.status as string;
  const conditions: any[] = [];
  if (status) conditions.push(eq(subscriptionsTable.status, status as any));
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(subscriptionsTable).where(conditions.length ? and(...conditions) : undefined);
  const total = Number(countResult?.count ?? 0);
  const subs = await db.select().from(subscriptionsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(subscriptionsTable.createdAt)).limit(lim).offset(offset);
  const enriched = await Promise.all(subs.map(async (s) => {
    const [u] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, s.userId)).limit(1);
    const [p] = await db.select({ name: plansTable.name }).from(plansTable).where(eq(plansTable.id, s.planId)).limit(1);
    return { ...s, userName: u?.name ?? "", userEmail: u?.email ?? "", planName: p?.name ?? "", amount: 0 };
  }));
  res.json({ subscriptions: enriched, total, page, limit: lim, totalPages: totalPages(total, lim) });
});

router.get("/settings", requireAdmin, async (_req, res) => {
  let [settings] = await db.select().from(systemSettingsTable).limit(1);
  if (!settings) {
    const [created] = await db.insert(systemSettingsTable).values({ id: "singleton" }).returning();
    settings = created!;
  }
  res.json(settings);
});

router.put("/settings", requireAdmin, async (req, res) => {
  const updates = req.body;
  await db.update(systemSettingsTable).set(updates).where(eq(systemSettingsTable.id, "singleton"));
  const [settings] = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, "singleton")).limit(1);
  res.json(settings);
});

router.post("/send-notification", requireAdmin, async (req, res) => {
  const { title, body, targetUsers, userIds, type } = req.body;
  let users: { id: string }[] = [];
  if (userIds?.length) {
    users = await db.select({ id: usersTable.id }).from(usersTable).where(inArray(usersTable.id, userIds));
  } else if (targetUsers === "all") {
    users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.isActive, true));
  }
  const notifs = users.map(u => ({ id: generateId(), userId: u.id, title, body, type: type ?? "system", isRead: false }));
  if (notifs.length > 0) await db.insert(notificationsTable).values(notifs);
  res.json({ success: true, message: `Notification sent to ${notifs.length} users` });
});

export default router;
