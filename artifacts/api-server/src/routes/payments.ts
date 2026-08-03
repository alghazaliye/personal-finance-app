import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, plansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId, paginate, totalPages } from "../lib/utils";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/history", requireAuth, async (req, res) => {
  const user = getUser(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { limit: lim, offset } = paginate(page, limit);

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(paymentsTable).where(eq(paymentsTable.userId, user.id));
  const total = Number(countResult?.count ?? 0);
  const rows = await db.select().from(paymentsTable).where(eq(paymentsTable.userId, user.id)).orderBy(paymentsTable.createdAt).limit(lim).offset(offset);

  const payments = await Promise.all(rows.map(async (p) => {
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, p.planId)).limit(1);
    return { ...p, plan: plan ?? null };
  }));

  res.json({ payments, total, page, limit: lim, totalPages: totalPages(total, lim) });
});

router.post("/verify", requireAuth, async (req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Payment verification requires store billing integration" });
});

export default router;
