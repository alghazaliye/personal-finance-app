import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId, paginate, totalPages } from "../lib/utils";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { limit: lim, offset } = paginate(page, limit);
  const unreadOnly = req.query.unreadOnly === "true";

  const conditions = [eq(notificationsTable.userId, user.id)];
  if (unreadOnly) conditions.push(eq(notificationsTable.isRead, false));

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable).where(and(...conditions));
  const total = Number(countResult?.count ?? 0);
  const [unreadCount] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable).where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));

  const notifications = await db.select().from(notificationsTable).where(and(...conditions)).orderBy(sql`created_at desc`).limit(lim).offset(offset);

  res.json({ notifications, total, page, limit: lim, totalPages: totalPages(total, lim), unreadCount: Number(unreadCount?.count ?? 0) });
});

router.put("/read-all", requireAuth, async (req, res) => {
  const user = getUser(req);
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, user.id));
  res.json({ success: true, message: "All notifications marked as read" });
});

router.get("/unread-count", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
  res.json({ count: Number(result?.count ?? 0) });
});

router.put("/:id/read", requireAuth, async (req, res) => {
  const user = getUser(req);
  await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.id, req.params.id!), eq(notificationsTable.userId, user.id)));
  res.json({ success: true, message: "Notification marked as read" });
});

router.put("/fcm-token", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { token, platform } = req.body;
  await db.update(usersTable).set({ fcmToken: token, fcmPlatform: platform }).where(eq(usersTable.id, user.id));
  res.json({ success: true, message: "FCM token updated" });
});

export default router;
