import test from "node:test";
import assert from "node:assert/strict";
import { getSessionIdleTimeoutMs, isSessionIdleExpired } from "../../src/utils/sessionPolicy";

test("ordinary sessions use configured idle timeout", () => {
  assert.equal(getSessionIdleTimeoutMs(false, "45"), 45 * 60 * 1000);
});

test("remembered sessions use a 30-day idle timeout", () => {
  assert.equal(getSessionIdleTimeoutMs(true, "15"), 30 * 24 * 60 * 60 * 1000);
});

test("invalid idle timeout configuration falls back to 30 minutes", () => {
  assert.equal(getSessionIdleTimeoutMs(false, "0"), 30 * 60 * 1000);
  assert.equal(getSessionIdleTimeoutMs(false, "not-a-number"), 30 * 60 * 1000);
});

test("idle expiry is false at the exact boundary and true after it", () => {
  const now = new Date("2026-11-08T12:00:00.000Z");
  const boundary = new Date(now.getTime() - 30 * 60 * 1000);
  const expired = new Date(boundary.getTime() - 1);

  assert.equal(isSessionIdleExpired(boundary, false, now, "30"), false);
  assert.equal(isSessionIdleExpired(expired, false, now, "30"), true);
});

test("remembered session remains valid beyond the ordinary timeout", () => {
  const now = new Date("2026-11-08T12:00:00.000Z");
  const lastAccessedAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  assert.equal(isSessionIdleExpired(lastAccessedAt, true, now, "30"), false);
  assert.equal(isSessionIdleExpired(lastAccessedAt, false, now, "30"), true);
});

test("partitionSessionsByIdlePolicy hides idle temporary sessions without mutating them", async () => {
  const { partitionSessionsByIdlePolicy } = await import("../../src/utils/sessionPolicy");
  const now = new Date("2026-11-10T12:00:00.000Z");
  const sessions = [
    { id: "recent", lastAccessedAt: new Date(now.getTime() - 5 * 60 * 1000), rememberMe: false },
    { id: "idle", lastAccessedAt: new Date(now.getTime() - 45 * 60 * 1000), rememberMe: false },
    { id: "remembered", lastAccessedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), rememberMe: true },
  ];
  const { active, idleExpired } = partitionSessionsByIdlePolicy(sessions, now);
  assert.deepEqual(active.map((session) => session.id), ["recent", "remembered"]);
  assert.deepEqual(idleExpired.map((session) => session.id), ["idle"]);
  assert.equal(sessions.length, 3);
});
