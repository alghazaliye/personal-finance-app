import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq, and, or, isNull } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { generateId } from "../lib/utils";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const type = req.query.type as string;

  const conditions = [or(eq(categoriesTable.userId, user.id), isNull(categoriesTable.userId))!];
  if (type && type !== "all") conditions.push(or(eq(categoriesTable.type, type as any), eq(categoriesTable.type, "both"))!);

  const categories = await db.select().from(categoriesTable).where(and(...conditions));
  res.json({ categories });
});

router.post("/", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { name, nameAr, type, icon, color, parentId } = req.body;
  if (!name || !type || !icon || !color) {
    res.status(400).json({ error: "validation", message: "Name, type, icon, and color required" });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values({
    id: generateId(), userId: user.id, name, nameAr, type, icon, color, parentId, isDefault: false,
  }).returning();
  res.status(201).json(cat);
});

router.put("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { name, nameAr, icon, color } = req.body;
  const [updated] = await db.update(categoriesTable).set({
    ...(name && { name }),
    ...(nameAr !== undefined && { nameAr }),
    ...(icon && { icon }),
    ...(color && { color }),
  }).where(and(eq(categoriesTable.id, req.params.id!), eq(categoriesTable.userId, user.id))).returning();
  if (!updated) { res.status(404).json({ error: "not_found", message: "Category not found" }); return; }
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  await db.delete(categoriesTable)
    .where(and(eq(categoriesTable.id, req.params.id!), eq(categoriesTable.userId, user.id)));
  res.json({ success: true, message: "Category deleted" });
});

export default router;
