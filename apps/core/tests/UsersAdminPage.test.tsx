import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { identityRequestMock } = vi.hoisted(() => ({
  identityRequestMock: vi.fn(),
}));

vi.mock("../src/preferencesApi", () => ({
  identityRequest: identityRequestMock,
  saveUserPreferences: vi.fn(),
}));
vi.mock("../src/i18n", () => ({
  useCoreLocale: () => ({ locale: "es", setLocale: vi.fn() }),
}));

import { contentLabel, DeleteDialog, UsersAdminPage } from "../src/admin/UsersAdminPage";
import { resetAdminPermissionsCache } from "../src/admin/AdminLayout";

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

const ANA = {
  id: "user-ana", email: "ana@example.test", name: "Ana Pérez", emailVerified: true, signInWithGoogle: false,
  status: "active", createdAt: "2026-10-01T00:00:00.000Z", lastLoginAt: null, deletionScheduledAt: null,
  modules: ["PROCV"], adminRoles: [], content: { procv: { cvs: 3 }, projobs: { applications: 2, savedJobs: 0 } },
};

function mockApi(permissions: string[]) {
  identityRequestMock.mockImplementation(async (path: string) => {
    if (path === "/api/auth/me") return json({ user: { id: "me", name: "Owner", email: "owner@example.test", permissions } });
    if (path.startsWith("/api/admin/users?")) return json({ users: [ANA], pagination: { page: 1, pages: 1, total: 1 } });
    if (path.startsWith("/api/admin/users/user-ana")) {
      return json({ user: { ...ANA, moduleAccess: [{ module: "PROCV", grantedAt: ANA.createdAt, expiresAt: null }], adminRoleAssignments: [], sessions: [], activity: [] } });
    }
    if (path === "/api/admin/roles") return json({ roles: [] });
    return json({}, 404);
  });
}

function renderPage(path = "/admin/usuarios") {
  return render(<MemoryRouter initialEntries={[path]}><UsersAdminPage /></MemoryRouter>);
}

describe("UsersAdminPage", () => {
  beforeEach(() => {
    identityRequestMock.mockReset();
    resetAdminPermissionsCache();
  });

  it("lists users with status, modules and a per-module content summary", async () => {
    mockApi(["identity.users.read"]);
    renderPage();

    const row = (await screen.findByText("Ana Pérez")).closest("tr")!;
    expect(within(row).getByText("Activo")).toBeInTheDocument();
    expect(within(row).getByText("ProCV")).toBeInTheDocument();
    expect(within(row).getByText("CV 3 · Postulaciones 2")).toBeInTheDocument();
    const listCall = identityRequestMock.mock.calls.map(([path]) => String(path)).find((path) => path.startsWith("/api/admin/users?"));
    expect(listCall).toContain("withContent=1");
  });

  it("offers deletion only to accounts with identity.users.delete", async () => {
    mockApi(["identity.users.read", "identity.users.manage"]);
    renderPage("/admin/usuarios?user=user-ana");
    const drawer = await screen.findByRole("dialog", { name: "Ficha del usuario" });
    expect(await within(drawer).findByRole("button", { name: "Suspender" })).toBeInTheDocument();
    expect(within(drawer).queryByRole("button", { name: "Eliminar…" })).not.toBeInTheDocument();
  });

  it("shows the owner the delete action", async () => {
    mockApi(["identity.users.read", "identity.users.manage", "identity.users.delete"]);
    renderPage("/admin/usuarios?user=user-ana");
    const drawer = await screen.findByRole("dialog", { name: "Ficha del usuario" });
    expect(await within(drawer).findByRole("button", { name: "Eliminar…" })).toBeInTheDocument();
  });

  it("explains when the directory is not allowed", async () => {
    mockApi(["identity.roles.read"]);
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("no tiene permiso para ver el directorio");
  });
});

describe("DeleteDialog", () => {
  it("requires the exact email and defaults to a scheduled deletion", () => {
    const onConfirm = vi.fn();
    render(<DeleteDialog user={{ email: "ana@example.test", content: ANA.content }} english={false} busy={false} onCancel={vi.fn()} onConfirm={onConfirm} />);

    const submit = screen.getByRole("button", { name: "Programar eliminación" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Días"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText(/Escribe ana@example.test/), { target: { value: "ANA@example.test" } });
    fireEvent.click(submit);
    expect(onConfirm).toHaveBeenCalledWith({ mode: "scheduled", days: 7, confirmEmail: "ANA@example.test" });
  });

  it("can delete immediately", () => {
    const onConfirm = vi.fn();
    render(<DeleteDialog user={{ email: "ana@example.test", content: undefined }} english={false} busy={false} onCancel={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByLabelText("Eliminar ahora (irreversible)"));
    fireEvent.change(screen.getByLabelText(/Escribe ana@example.test/), { target: { value: "ana@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar ahora" }));
    expect(onConfirm).toHaveBeenCalledWith({ mode: "now", confirmEmail: "ana@example.test" });
  });

  it("clamps the schedule to 1-90 days", () => {
    render(<DeleteDialog user={{ email: "a@b.test", content: undefined }} english={false} busy={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    const days = screen.getByLabelText("Días") as HTMLInputElement;
    fireEvent.change(days, { target: { value: "400" } });
    expect(days.value).toBe("90");
  });
});

describe("contentLabel", () => {
  it("marks unreachable modules and empty accounts", () => {
    expect(contentLabel({ procv: { cvs: 1 }, projobs: null }, false)).toBe("CV 1 · ?");
    expect(contentLabel({ procv: { cvs: 0 } }, false)).toBe("—");
    expect(contentLabel({ procv: null }, true)).toBe("?");
  });
});
