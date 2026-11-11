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

import { AdminConsolePage } from "../src/pages/AdminConsolePage";

const USERS_READ = "identity.users.read";
const ROLES_READ = "identity.roles.read";

function renderConsole() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <AdminConsolePage />
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

describe("AdminConsolePage navigation permissions", () => {
  beforeEach(() => identityRequestMock.mockReset());

  it("shows and opens users navigation for a non-admin with identity.users.read", async () => {
    respondWithPermissions("member", [USERS_READ]);
    renderConsole();

    const navigation = await screen.findByRole("navigation", { name: "Administración de la plataforma" });
    fireEvent.click(within(navigation).getByRole("button", { name: "Usuarios y accesos" }));

    expect(await screen.findByText("Usuarios y accesos a módulos")).toBeInTheDocument();
  });

  it("does not grant users navigation from the admin role without identity.users.read", async () => {
    respondWithPermissions("admin", [ROLES_READ]);
    renderConsole();

    const navigation = await screen.findByRole("navigation", { name: "Administración de la plataforma" });
    expect(within(navigation).getByRole("button", { name: "Roles y permisos" })).toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "Usuarios y accesos" })).not.toBeInTheDocument();
  });
});
