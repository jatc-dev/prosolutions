import crypto from 'crypto';

export const REFRESH_ROTATION_RECOVERY_WINDOW_MS = 10_000;

/**
 * Derive one stable successor session id for a refresh-token rotation.
 * The HMAC prevents the predecessor token from being used directly as a
 * database identifier while ensuring concurrent requests derive the same id.
 */
export function deriveRefreshSuccessorJti(
  predecessorRefreshToken: string,
  secret: string,
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`prosolutions-refresh-rotation:${predecessorRefreshToken}`)
    .digest('hex');
}

export interface RefreshRotationSession {
  userId: string;
  jti: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastAccessedAt: Date;
  createdAt: Date;
  userAgent: string | null;
}

export function canRecoverRefreshRotation(input: {
  predecessor: RefreshRotationSession;
  successor: RefreshRotationSession;
  expectedUserId: string;
  requestUserAgent: string | null;
  now?: Date;
}): boolean {
  const {
    predecessor,
    successor,
    expectedUserId,
    requestUserAgent,
    now = new Date(),
  } = input;

  if (!requestUserAgent) return false;
  if (predecessor.userId !== expectedUserId || successor.userId !== expectedUserId) {
    return false;
  }
  if (predecessor.expiresAt <= now || predecessor.revokedAt === null) {
    return false;
  }
  if (successor.revokedAt !== null || successor.expiresAt <= now) {
    return false;
  }
  if (
    predecessor.userAgent !== requestUserAgent ||
    successor.userAgent !== requestUserAgent
  ) {
    return false;
  }

  // These timestamps are written together only by the rotation transaction.
  // A later explicit revocation changes revokedAt and invalidates recovery.
  const rotationAt = predecessor.revokedAt.getTime();
  if (
    predecessor.lastAccessedAt.getTime() !== rotationAt ||
    successor.createdAt.getTime() !== rotationAt ||
    successor.lastAccessedAt.getTime() !== rotationAt
  ) {
    return false;
  }

  const age = now.getTime() - rotationAt;
  return age >= 0 && age <= REFRESH_ROTATION_RECOVERY_WINDOW_MS;
}
