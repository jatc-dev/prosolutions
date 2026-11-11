import { Request, Response } from "express";
import { IdentityRequest } from "../middleware/auth";
import prisma from "../prismaClient";
import { clearRefreshTokenCookie } from "../utils/cookies";
import { auditLog, extractRequestInfo } from "../utils/auditLog";
import { getSessionIdleTimeoutMs, partitionSessionsByIdlePolicy } from "../utils/sessionPolicy";

export async function listSessions(req: Request, res: Response) {
  const auth = req as IdentityRequest;
  if (!auth.userId) return res.status(401).json({ message: "Unauthorized" });
  const candidates = await prisma.session.findMany({
    where: { userId: auth.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastAccessedAt: "desc" },
    select: { id: true, createdAt: true, lastAccessedAt: true, expiresAt: true, rememberMe: true, deviceName: true, userAgent: true, ipAddress: true },
  });
  const { active, idleExpired } = partitionSessionsByIdlePolicy(candidates, new Date());
  return res.json({
    sessions: active.map(session => ({ ...session, current: session.id === auth.sessionId })),
    idleExpiredSessions: idleExpired.map(session => ({ ...session, current: false })),
    policy: { idleTimeoutMinutes: Math.round(getSessionIdleTimeoutMs(false) / 60000), rememberedIdleTimeoutDays: 30 },
  });
}

export async function revokeSessionById(req: Request, res: Response) {
  const auth = req as IdentityRequest;
  if (!auth.userId) return res.status(401).json({ message: "Unauthorized" });
  const sessionId = String(req.params.sessionId || "");
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId: auth.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!result.count) return res.status(404).json({ message: "Session not found or already closed" });
  if (sessionId === auth.sessionId) clearRefreshTokenCookie(res);
  auditLog("authentication.session_revoked", { userId: auth.userId, ...extractRequestInfo(req), details: { sessionId } });
  return res.json({ message: "Session closed", currentSession: sessionId === auth.sessionId });
}

export async function revokeOtherSessions(req: Request, res: Response) {
  const auth = req as IdentityRequest;
  if (!auth.userId || !auth.sessionId) return res.status(401).json({ message: "Unauthorized" });
  const result = await prisma.session.updateMany({
    where: { userId: auth.userId, id: { not: auth.sessionId }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  auditLog("authentication.other_sessions_revoked", { userId: auth.userId, ...extractRequestInfo(req), details: { count: result.count } });
  return res.json({ message: "Other sessions closed", count: result.count });
}
