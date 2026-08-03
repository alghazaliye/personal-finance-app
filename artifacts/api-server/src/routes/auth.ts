import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, settingsTable, plansTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  requireAuth,
  getUser,
} from "../lib/auth";
import { generateId } from "../lib/utils";

const router = Router();

async function createUserResponse(user: typeof usersTable.$inferSelect) {
  const [sub] = await db
    .select({ planName: plansTable.name, status: subscriptionsTable.status, expiresAt: subscriptionsTable.expiresAt })
    .from(subscriptionsTable)
    .leftJoin(plansTable, eq(subscriptionsTable.planId, plansTable.id))
    .where(eq(subscriptionsTable.userId, user.id))
    .orderBy(subscriptionsTable.createdAt)
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

// Register
router.post("/register", async (req, res) => {
  const { email, password, name, currencyCode, country, phone } = req.body;
  if (!email || !password || !name || !currencyCode) {
    res.status(400).json({ error: "validation", message: "Required fields missing" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "conflict", message: "Email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = generateId();
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(usersTable).values({
    id: userId,
    email,
    passwordHash,
    name,
    currencyCode,
    country,
    phone,
    trialEndsAt,
  });

  // Create default settings
  await db.insert(settingsTable).values({
    id: generateId(),
    userId,
    currencyCode,
  }).onConflictDoNothing();

  // Create trial subscription
  const [freePlan] = await db.select().from(plansTable).where(eq(plansTable.isFree, true)).limit(1);
  if (freePlan) {
    await db.insert(subscriptionsTable).values({
      id: generateId(),
      userId,
      planId: freePlan.id,
      status: "trial",
      startDate: new Date(),
      expiresAt: trialEndsAt,
    });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const userResponse = await createUserResponse(user!);

  res.status(201).json({
    accessToken: generateAccessToken({ userId, role: "user" }),
    refreshToken: generateRefreshToken({ userId, role: "user" }),
    user: userResponse,
  });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "validation", message: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    return;
  }

  if (!user.isActive) {
    res.status(401).json({ error: "unauthorized", message: "Account is inactive" });
    return;
  }

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  const userResponse = await createUserResponse(user);
  res.json({
    accessToken: generateAccessToken({ userId: user.id, role: user.role }),
    refreshToken: generateRefreshToken({ userId: user.id, role: user.role }),
    user: userResponse,
  });
});

// Logout
router.post("/logout", requireAuth, async (_req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

// Refresh token
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "validation", message: "Refresh token required" });
    return;
  }
  try {
    const payload = verifyToken(refreshToken);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "unauthorized", message: "User not found" });
      return;
    }
    const userResponse = await createUserResponse(user);
    res.json({
      accessToken: generateAccessToken({ userId: user.id, role: user.role }),
      refreshToken: generateRefreshToken({ userId: user.id, role: user.role }),
      user: userResponse,
    });
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid refresh token" });
  }
});

// Google Auth (stub - verify idToken with Firebase in production)
router.post("/google", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ error: "validation", message: "ID token required" });
    return;
  }
  res.status(501).json({ error: "not_implemented", message: "Google auth requires Firebase setup" });
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "validation", message: "Email required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (user) {
    const token = generateId();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.update(usersTable).set({
      resetPasswordToken: token,
      resetPasswordExpiresAt: expiresAt,
    }).where(eq(usersTable.id, user.id));
    // In production: send email with token
  }
  res.json({ success: true, message: "If the email exists, a reset link has been sent" });
});

// Reset password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "validation", message: "Token and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.resetPasswordToken, token)).limit(1);
  if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
    res.status(400).json({ error: "invalid_token", message: "Invalid or expired token" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(usersTable).set({
    passwordHash,
    resetPasswordToken: null,
    resetPasswordExpiresAt: null,
  }).where(eq(usersTable.id, user.id));
  res.json({ success: true, message: "Password reset successfully" });
});

// Change password
router.post("/change-password", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "validation", message: "Current and new password required" });
    return;
  }
  if (!user.passwordHash) {
    res.status(400).json({ error: "no_password", message: "Account uses social login" });
    return;
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "invalid_password", message: "Current password is incorrect" });
    return;
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
  res.json({ success: true, message: "Password changed successfully" });
});

export default router;
