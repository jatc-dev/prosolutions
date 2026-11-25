import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

import { AdminConsolePage } from "../src/pages/AdminConsolePage";
import { resetAdminPermissionsCache } from "../src/admin/AdminLayout";

const USERS_READ = "identity.users.read";
const ROLES_READ = "identity.roles.read";

function renderConsole(path = "/admin") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminConsolePage />} />
        <Route path="/admin/usuarios" element={<p>Directorio de usuarios</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function respondWithPermissions(role: string, permissions: string[]) {
  identityRequestMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ user: { id: "test-user", name: "Test User", email: "test@example.test", role, permissions } }),
  });
}

describe("Administration navigation", () => {
  beforeEach(() => {
    identityRequestMock.mockReset();
    resetAdminPermissionsCache();
  });

  it("links straight to the users page for an account with identity.users.read", async () => {
    respondWithPermissions("member", [USERS_READ]);
    renderConsole();

    const navigation = await screen.findByRole("navigation", { name: "Administración" });
    expect(await within(navigation).findByRole("link", { name: "Usuarios" })).toHaveAttribute("href", "/admin/usuarios");
  });

  it("hides users from an admin without identity.users.read", async () => {
    respondWithPermissions("admin", [ROLES_READ]);
    renderConsole();

    const navigation = await screen.findByRole("navigation", { name: "Administración" });
    expect(await within(navigation).findByRole("link", { name: "Roles y permisos" })).toBeInTheDocument();
    expect(within(navigation).queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("keeps personal account links out of the administration sidebar", async () => {
    respondWithPermissions("admin", [USERS_READ, ROLES_READ]);
    renderConsole();

    const navigation = await screen.findByRole("navigation", { name: "Administración" });
    await within(navigation).findByRole("link", { name: "Usuarios" });
    const hrefs = within(navigation).getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).not.toContain("/settings");
    expect(hrefs).not.toContain("/security/sessions");
  });

  it("redirects the old users section to the users page", async () => {
    respondWithPermissions("admin", [USERS_READ]);
    renderConsole("/admin?section=users");
    expect(await screen.findByText("Directorio de usuarios")).toBeInTheDocument();
  });
});
