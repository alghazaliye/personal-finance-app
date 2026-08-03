import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const JWT_SECRET = process.env["SESSION_SECRET"] ?? "dev-secret-change-in-production";
const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "30d";

export interface JwtPayload {
  userId: string;
  role: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Missing or invalid token" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "unauthorized", message: "User not found or inactive" });
      return;
    }
    (req as any).user = user;
    next();
  } catch (err) {
    logger.warn({ err }, "Auth token verification failed");
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      res.status(403).json({ error: "forbidden", message: "Admin access required" });
      return;
    }
    next();
  });
}

export function getUser(req: Request) {
  return (req as any).user;
}
