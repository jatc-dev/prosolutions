import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../src/identityApi", () => ({
  identityAuthApiUrl: () => "https://identity.test/api/auth",
}));
vi.mock("../src/i18n", () => ({
  useCoreLocale: () => ({ locale: "es", setLocale: vi.fn() }),
}));
vi.mock("../src/preferencesApi", () => ({
  saveUserPreferences: vi.fn(async () => undefined),
}));

import { AdminAccessPage } from "../src/pages/AdminAccessPage";

const READ = "identity.users.read";
const MANAGE = "identity.users.manage";

function jsonResponse(status: number, body: unknown): Response {
  const result = {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    clone() { return this; },
  };
  return result as unknown as Response;
}

function CurrentRoute() {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/access"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CurrentRoute />
      <Routes>
        <Route path="/admin/access" element={<AdminAccessPage />} />
        <Route path="/login" element={<h1>Login route</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

function requestPath(input: RequestInfo | URL): string {
  return new URL(urlOf(input)).pathname;
}

function userPayload(permissions: string[]) {
  return { user: { id: "actor-1", name: "Admin Tester", email: "admin@example.test", permissions } };
}

function usersPayload(modules: string[] = []) {
  return {
    users: [{
      id: "user-1",
      email: "person@example.test",
      name: "Test Person",
      role: "member",
      isActive: true,
      emailVerified: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      modules,
    }],
    pagination: { page: 1, limit: 50, total: 1, pages: 1 },
  };
}

function setupFetch(permissions: string[], initialModules: string[] = []) {
  let modules = [...initialModules];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = requestPath(input);
    const method = (init?.method || "GET").toUpperCase();
    if (path === "/api/auth/me") return jsonResponse(200, userPayload(permissions));
    if (path === "/api/admin/users") return jsonResponse(200, usersPayload(modules));
    if (path === "/api/csrf-token") return jsonResponse(200, { csrfToken: `csrf-${fetchMock.mock.calls.length}` });
    if (path === "/api/modules/grant" && method === "POST") {
      const body = JSON.parse(String(init?.body));
      modules = [...new Set([...modules, body.module])];
      return jsonResponse(200, { ok: true });
    }
    if (path === "/api/modules/revoke" && method === "POST") {
      const body = JSON.parse(String(init?.body));
      modules = modules.filter((module) => module !== body.module);
      return jsonResponse(200, { ok: true });
    }
    if (path === "/api/auth/refresh" && method === "POST") return jsonResponse(401, {});
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  sessionStorage.setItem("pro_identity_token", "test-token");
  return fetchMock;
}

function moduleCheckbox(label: string) {
  const card = screen.getByText(label).closest("label");
  if (!card) throw new Error(`Missing module control for ${label}`);
  return within(card).getByRole("checkbox");
}

describe("AdminAccessPage mounted RBAC behavior", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("identity.users.read loads the directory while read-only controls cannot grant or revoke", async () => {
    const fetchMock = setupFetch([READ], ["PROCV"]);
    renderPage();

    expect(await screen.findByText("person@example.test")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => requestPath(url) === "/api/admin/users")).toBe(true);
    expect(moduleCheckbox("ProCV")).toBeDisabled();
    fireEvent.click(moduleCheckbox("ProCV"));
    expect(moduleCheckbox("ProJobs")).toBeDisabled();
    fireEvent.click(moduleCheckbox("ProJobs"));
    expect(fetchMock.mock.calls.some(([url]) => requestPath(url).startsWith("/api/modules/"))).toBe(false);
  });

  it("a user without identity.users.read sees no management controls", async () => {
    const fetchMock = setupFetch([]);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Acceso denegado" })).toBeInTheDocument();
    expect(screen.queryByTestId("core-admin-header")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => requestPath(url).startsWith("/api/admin/") || requestPath(url).startsWith("/api/modules/"))).toBe(false);
  });

  it("identity.users.manage with read permission can grant and revoke a module", async () => {
    const fetchMock = setupFetch([READ, MANAGE]);
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /ProCV/ });
    expect(checkbox).toBeEnabled();
    fireEvent.click(checkbox);
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => requestPath(url) === "/api/modules/grant")).toHaveLength(1));
    expect(await screen.findByText(/permiso activado/)).toBeInTheDocument();

    const granted = await screen.findByRole("checkbox", { name: /ProCV/ });
    expect(granted).toBeChecked();
    fireEvent.click(granted);
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => requestPath(url) === "/api/modules/revoke")).toHaveLength(1));
    expect(await screen.findByText(/permiso revocado/)).toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: /ProCV/ })).not.toBeChecked();
  });

  it("401 clears token and replaces the route with login even when refresh also returns 401", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (requestPath(input) === "/api/auth/me") return jsonResponse(401, { message: "" });
      if (requestPath(input) === "/api/auth/refresh") return jsonResponse(401, { message: "expired" });
      throw new Error(`Unexpected request: ${requestPath(input)}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    sessionStorage.setItem("pro_identity_token", "test-token");
    renderPage();

    expect(await screen.findByRole("heading", { name: "Login route" })).toBeInTheDocument();
    expect(sessionStorage.getItem("pro_identity_token")).toBeNull();
    expect(screen.getByTestId("current-route")).toHaveTextContent("/login");
  });

  it("a permission 403 on module grant is not retried as a CSRF failure and leaves the checkbox unchanged", async () => {
    const fetchMock = setupFetch([READ, MANAGE]);
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === "/api/auth/me") return jsonResponse(200, userPayload([READ, MANAGE]));
      if (path === "/api/admin/users") return jsonResponse(200, usersPayload());
      if (path === "/api/csrf-token") return jsonResponse(200, { csrfToken: "csrf" });
      if (path === "/api/modules/grant") return jsonResponse(403, { message: "Insufficient permission" });
      return jsonResponse(500, { message: "unexpected" });
    });
    renderPage();

    fireEvent.click(await screen.findByRole("checkbox", { name: /ProCV/ }));
    await screen.findByRole("alert");
    expect(fetchMock.mock.calls.filter(([url]) => requestPath(url) === "/api/modules/grant")).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => requestPath(url) === "/api/csrf-token")).toHaveLength(1);
    expect(await screen.findByRole("checkbox", { name: /ProCV/ })).not.toBeChecked();
  });

  it("identified CSRF rejection refreshes the CSRF token and retries once", async () => {
    const fetchMock = setupFetch([READ, MANAGE]);
    let grants = 0;
    let modules: string[] = [];
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === "/api/auth/me") return jsonResponse(200, userPayload([READ, MANAGE]));
      if (path === "/api/admin/users") return jsonResponse(200, usersPayload(modules));
      if (path === "/api/csrf-token") return jsonResponse(200, { csrfToken: `csrf-${fetchMock.mock.calls.length}` });
      if (path === "/api/modules/grant") {
        grants += 1;
        if (grants === 1) return jsonResponse(403, { message: "CSRF token mismatch" });
        modules = ["PROCV"];
        return jsonResponse(200, { ok: true });
      }
      return jsonResponse(500, { message: "unexpected" });
    });
    renderPage();

    fireEvent.click(await screen.findByRole("checkbox", { name: /ProCV/ }));
    await waitFor(() => expect(grants).toBe(2));
    expect(await screen.findByText(/permiso activado/)).toBeInTheDocument();
    expect(grants).toBe(2);
    expect(fetchMock.mock.calls.filter(([url]) => requestPath(url) === "/api/csrf-token")).toHaveLength(2);
    expect(await screen.findByRole("checkbox", { name: /ProCV/ })).toBeChecked();
  });

  it.each([
    ["network", new TypeError("fetch failed"), /Error de red/],
    ["server", jsonResponse(500, { message: "Identity unavailable" }), /Identity unavailable/],
  ])("%s failures render a recoverable error state", async (_label, failure, message) => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (requestPath(input) === "/api/auth/me") {
        if (failure instanceof Error) throw failure;
        return failure;
      }
      throw new Error("No administrative request expected");
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    sessionStorage.setItem("pro_identity_token", "test-token");
    renderPage();

    expect(await screen.findByRole("heading", { name: "No se pudo cargar la consola" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });
});
