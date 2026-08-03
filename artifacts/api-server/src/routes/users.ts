import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, settingsTable, plansTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

async function getUserWithSub(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;
  const [sub] = await db
    .select({ planName: plansTable.name, status: subscriptionsTable.status, expiresAt: subscriptionsTable.expiresAt })
    .from(subscriptionsTable)
    .leftJoin(plansTable, eq(subscriptionsTable.planId, plansTable.id))
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    country: user.country,
    currencyCode: user.currencyCode,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    trialEndsAt: user.trialEndsAt,
    subscription: sub ? { planName: sub.planName ?? "", status: sub.status, expiresAt: sub.expiresAt } : null,
    createdAt: user.createdAt,
  };
}

router.get("/me", requireAuth, async (req, res) => {
  const user = getUser(req);
  const profile = await getUserWithSub(user.id);
  res.json(profile);
});

router.put("/me", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { name, phone, country, currencyCode } = req.body;
  await db.update(usersTable).set({
    ...(name && { name }),
    ...(phone !== undefined && { phone }),
    ...(country !== undefined && { country }),
    ...(currencyCode && { currencyCode }),
    updatedAt: new Date(),
  }).where(eq(usersTable.id, user.id));

  if (currencyCode) {
    await db.update(settingsTable).set({ currencyCode }).where(eq(settingsTable.userId, user.id));
  }

  const profile = await getUserWithSub(user.id);
  res.json(profile);
});

router.post("/me/avatar", requireAuth, async (req, res) => {
  const user = getUser(req);
  // In production: handle file upload to object storage
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
  await db.update(usersTable).set({ avatarUrl }).where(eq(usersTable.id, user.id));
  res.json({ avatarUrl });
});

export default router;
