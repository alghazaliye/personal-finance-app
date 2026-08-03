import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, plansTable, transactionsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId } from "../lib/utils";

const router = Router();

router.get("/current", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [sub] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, user.id), inArray(subscriptionsTable.status, ["trial", "active"])))
    .orderBy(subscriptionsTable.createdAt).limit(1);
  if (!sub) { res.status(404).json({ error: "not_found", message: "No active subscription" }); return; }
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1);
  res.json({ ...sub, plan });
});

router.get("/plans", async (_req, res) => {
  const plans = await db.select().from(plansTable).where(eq(plansTable.isActive, true));
  res.json({ plans });
});

router.post("/subscribe", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { planId } = req.body;
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId)).limit(1);
  if (!plan) { res.status(404).json({ error: "not_found", message: "Plan not found" }); return; }

  const durationMs = plan.interval === "yearly" ? 365 * 24 * 3600 * 1000 : plan.interval === "lifetime" ? 100 * 365 * 24 * 3600 * 1000 : 30 * 24 * 3600 * 1000;
  const expiresAt = new Date(Date.now() + durationMs);

  // Cancel existing
  await db.update(subscriptionsTable).set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(subscriptionsTable.userId, user.id), inArray(subscriptionsTable.status, ["trial", "active"])));

  const [sub] = await db.insert(subscriptionsTable).values({
    id: generateId(), userId: user.id, planId, status: "active",
    startDate: new Date(), expiresAt,
  }).returning();

  res.json({ ...sub, plan });
});

router.post("/cancel", requireAuth, async (req, res) => {
  const user = getUser(req);
  await db.update(subscriptionsTable).set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(subscriptionsTable.userId, user.id), inArray(subscriptionsTable.status, ["trial", "active"])));
  res.json({ success: true, message: "Subscription cancelled" });
});

router.get("/usage", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [sub] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, user.id), inArray(subscriptionsTable.status, ["trial", "active"])))
    .limit(1);
  const [plan] = sub ? await db.select().from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1) : [];
  const limit = plan?.transactionLimit ?? null;
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable).where(eq(transactionsTable.userId, user.id));
  const used = Number(countResult?.count ?? 0);
  res.json({ used, limit, percentage: limit ? (used / limit) * 100 : 0, canAdd: limit === null || used < limit, planName: plan?.name ?? "Free" });
});

export default router;
