import assert from "node:assert/strict";
import { it as test } from "vitest";
import {
  accessFailureForStatus,
  adminUsersEndpoint,
  errorMessage,
  expireAdminSession,
  hasPermission,
  performModuleMutation,
  requestAdminUsers,
  retryUnauthorizedResponse,
  SessionExpiredError,
  USER_MANAGE_PERMISSION,
  USER_READ_PERMISSION,
} from "../src/pages/adminAccessPolicy";

const response = (status: number) => new Response(null, { status });

test("RBAC separates directory read from module management", () => {
  const readOnly = [USER_READ_PERMISSION];
  assert.equal(hasPermission(readOnly, USER_READ_PERMISSION), true);
  assert.equal(hasPermission(readOnly, USER_MANAGE_PERMISSION), false);
  assert.equal(adminUsersEndpoint(readOnly, "page=1"), "/api/admin/users?page=1");
  assert.equal(adminUsersEndpoint([], "page=1"), null);
});

test("user without identity.users.read never invokes the admin endpoint", async () => {
  let calls = 0;
  const result = await requestAdminUsers([], "page=1", async () => {
    calls += 1;
    return response(200);
  });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("HTTP failures distinguish expired session, denied permission, and server errors", () => {
  assert.equal(accessFailureForStatus(401), "session-expired");
  assert.equal(accessFailureForStatus(403), "denied");
  assert.equal(accessFailureForStatus(500), "error");
  assert.equal(errorMessage(new TypeError("fetch failed"), "fallback"), "Error de red. Comprueba tu conexión e inténtalo de nuevo.");
  assert.equal(errorMessage(new Error("Solicitud fallida (500)"), "fallback"), "Solicitud fallida (500)");
});

test("401 renews and retries once; expired renewal raises SessionExpiredError independent of message", async () => {
  let sends = 0;
  let renewals = 0;
  const retried = await retryUnauthorizedResponse(
    async () => (++sends === 1 ? response(401) : response(200)),
    async () => { renewals += 1; },
  );
  assert.equal(retried.status, 200);
  assert.equal(sends, 2);
  assert.equal(renewals, 1);

  await assert.rejects(
    retryUnauthorizedResponse(async () => response(401), async () => { throw new SessionExpiredError(); }),
    SessionExpiredError,
  );
  await assert.rejects(
    retryUnauthorizedResponse(async () => response(401), async () => { throw new TypeError("network down"); }),
    TypeError,
  );
  await assert.rejects(
    retryUnauthorizedResponse(async () => response(401), async () => { throw new Error("No se pudo renovar la sesión (500)."); }),
    /500/,
  );
});

test("session expiration clears local credentials before replacing navigation", () => {
  const events: string[] = [];
  expireAdminSession(
    () => events.push("clear-token"),
    () => events.push("navigate:/login:replace"),
  );
  assert.deepEqual(events, ["clear-token", "navigate:/login:replace"]);
});

test("rejected module grant/revoke preserves state and reports forbidden", async () => {
  let successes = 0;
  const result = await performModuleMutation(async () => response(403), () => { successes += 1; });
  assert.equal(result.kind, "denied");
  assert.equal(successes, 0);
});

test("expired module mutation does not update state; network and 500 failures remain errors", async () => {
  let successes = 0;
  const expired = await performModuleMutation(async () => response(401), () => { successes += 1; });
  assert.equal(expired.kind, "session-expired");
  assert.equal(successes, 0);

  const serverFailure = await performModuleMutation(async () => response(500), () => { successes += 1; });
  assert.equal(serverFailure.kind, "error");
  assert.equal(successes, 0);
  await assert.rejects(
    performModuleMutation(async () => { throw new TypeError("offline"); }, () => { successes += 1; }),
    TypeError,
  );
  assert.equal(successes, 0);
});

test("successful module mutation is the only outcome that updates UI state", async () => {
  let successes = 0;
  const result = await performModuleMutation(async () => response(200), () => { successes += 1; });
  assert.equal(result.kind, "success");
  assert.equal(successes, 1);
});
