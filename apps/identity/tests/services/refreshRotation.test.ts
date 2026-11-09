import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRecoverRefreshRotation,
  deriveRefreshSuccessorJti,
  REFRESH_ROTATION_RECOVERY_WINDOW_MS,
  type RefreshRotationSession,
} from '../../src/utils/refreshRotation';

const now = new Date('2026-11-09T12:00:10.000Z');
const rotationAt = new Date(now.getTime() - 2_000);

function session(overrides: Partial<RefreshRotationSession> = {}): RefreshRotationSession {
  return {
    userId: 'user-123',
    jti: 'session-jti',
    expiresAt: new Date(now.getTime() + 60_000),
    revokedAt: null,
    lastAccessedAt: rotationAt,
    createdAt: rotationAt,
    userAgent: 'Chrome/156 Windows',
    ...overrides,
  };
}

function recoveryAllowed(
  predecessor = session({ revokedAt: rotationAt }),
  successor = session(),
  requestUserAgent: string | null = 'Chrome/156 Windows',
): boolean {
  return canRecoverRefreshRotation({
    predecessor,
    successor,
    expectedUserId: 'user-123',
    requestUserAgent,
    now,
  });
}

test('derives a stable opaque successor jti from the predecessor refresh token', () => {
  const first = deriveRefreshSuccessorJti('old-refresh-token', 'test-secret');
  const second = deriveRefreshSuccessorJti('old-refresh-token', 'test-secret');

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(
    first,
    deriveRefreshSuccessorJti('different-refresh-token', 'test-secret'),
  );
  assert.notEqual(
    first,
    deriveRefreshSuccessorJti('old-refresh-token', 'different-secret'),
  );
});

test('allows recovery only for the matching recently rotated session and browser', () => {
  assert.equal(recoveryAllowed(), true);
});

test('allows recovery after normal activity updates the successor lastAccessedAt', () => {
  const successorAfterMeRequest = session({
    lastAccessedAt: new Date(rotationAt.getTime() + 500),
  });

  assert.equal(recoveryAllowed(undefined, successorAfterMeRequest), true);
});

test('rejects recovery when the browser user-agent is missing or different', () => {
  assert.equal(recoveryAllowed(undefined, undefined, null), false);
  assert.equal(recoveryAllowed(undefined, undefined, 'Firefox/other'), false);
});

test('rejects recovery after explicit revocation changes the rotation marker', () => {
  const explicitlyRevoked = session({
    revokedAt: new Date(rotationAt.getTime() + 1),
    lastAccessedAt: rotationAt,
  });

  assert.equal(recoveryAllowed(explicitlyRevoked), false);
});

test('rejects recovery when the predecessor or successor is expired or revoked', () => {
  assert.equal(
    recoveryAllowed(session({
      revokedAt: rotationAt,
      expiresAt: new Date(now.getTime() - 1),
    })),
    false,
  );
  assert.equal(
    recoveryAllowed(undefined, session({
      revokedAt: new Date(rotationAt.getTime() + 1),
    })),
    false,
  );
  assert.equal(
    recoveryAllowed(undefined, session({
      expiresAt: new Date(now.getTime() - 1),
    })),
    false,
  );
});

test('rejects recovery outside the short grace window', () => {
  const oldRotation = new Date(now.getTime() - REFRESH_ROTATION_RECOVERY_WINDOW_MS - 1);
  assert.equal(
    recoveryAllowed(
      session({ revokedAt: oldRotation, lastAccessedAt: oldRotation }),
      session({ createdAt: oldRotation, lastAccessedAt: oldRotation }),
    ),
    false,
  );
});

test('rejects recovery if predecessor and successor do not belong to the same user', () => {
  assert.equal(
    recoveryAllowed(undefined, session({ userId: 'another-user' })),
    false,
  );
});
