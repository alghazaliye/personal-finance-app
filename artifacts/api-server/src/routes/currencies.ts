import { Router } from "express";
import { db } from "@workspace/db";
import { currenciesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", async (_req, res) => {
  const currencies = await db.select().from(currenciesTable).where(eq(currenciesTable.isActive, true));
  res.json({ currencies });
});

router.get("/exchange-rates", requireAuth, async (req, res) => {
  const base = String(req.query.base ?? "USD");
  const [baseCurrency] = await db.select().from(currenciesTable)
    .where(eq(currenciesTable.code, base)).limit(1);
  const baseRate = baseCurrency?.rateToUsd ?? 1;

  const all = await db.select().from(currenciesTable).where(eq(currenciesTable.isActive, true));
  const rates: Record<string, number> = {};
  for (const c of all) {
    if (c.rateToUsd) rates[c.code] = c.rateToUsd / baseRate;
  }

  res.json({ base, rates, updatedAt: new Date() });
});

router.get("/convert", requireAuth, async (req, res) => {
  const amount = Number(req.query.amount);
  const from = String(req.query.from);
  const to = String(req.query.to);

  const [fromCur] = await db.select().from(currenciesTable).where(eq(currenciesTable.code, from)).limit(1);
  const [toCur] = await db.select().from(currenciesTable).where(eq(currenciesTable.code, to)).limit(1);

  if (!fromCur?.rateToUsd || !toCur?.rateToUsd) {
    res.status(404).json({ error: "not_found", message: "Currency not found" });
    return;
  }

  const rate = toCur.rateToUsd / fromCur.rateToUsd;
  res.json({ from, to, amount, convertedAmount: amount * rate, rate });
});

export default router;
