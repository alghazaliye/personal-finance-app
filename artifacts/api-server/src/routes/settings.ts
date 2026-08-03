import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId } from "../lib/utils";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  let [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, user.id)).limit(1);
  if (!settings) {
    const [created] = await db.insert(settingsTable).values({ id: generateId(), userId: user.id }).returning();
    settings = created!;
  }
  res.json(settings);
});

router.put("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { theme, language, currencyCode, dateFormat, numberFormat, notificationsEnabled, budgetAlerts, weeklyReport, backupEnabled, backupFrequency } = req.body;
  const [updated] = await db.update(settingsTable).set({
    ...(theme && { theme }),
    ...(language && { language }),
    ...(currencyCode && { currencyCode }),
    ...(dateFormat && { dateFormat }),
    ...(numberFormat && { numberFormat }),
    ...(notificationsEnabled !== undefined && { notificationsEnabled }),
    ...(budgetAlerts !== undefined && { budgetAlerts }),
    ...(weeklyReport !== undefined && { weeklyReport }),
    ...(backupEnabled !== undefined && { backupEnabled }),
    ...(backupFrequency && { backupFrequency }),
    updatedAt: new Date(),
  }).where(eq(settingsTable.userId, user.id)).returning();
  if (!updated) { res.status(404).json({ error: "not_found", message: "Settings not found" }); return; }
  res.json(updated);
});

export default router;
