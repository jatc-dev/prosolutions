import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock, navigateMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
  navigateMock: vi.fn(),
}));

vi.mock("../src/services/api", () => ({ api: apiMock }));
vi.mock("../src/components/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-router-dom", async (original) => ({ ...(await original<typeof import("react-router-dom")>()), useNavigate: () => navigateMock }));

import { UnifiedWorkspacePage } from "../src/pages/UnifiedWorkspacePage";

const CV = { id: "cv-1", title: "CV Analista", template: "sidebar", updatedAt: "2026-11-20T10:00:00.000Z" };

function renderPage() {
  return render(<MemoryRouter><UnifiedWorkspacePage /></MemoryRouter>);
}

describe("CV cards on the ProCV dashboard", () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((fn) => fn.mockReset());
    navigateMock.mockReset();
    apiMock.get.mockResolvedValue({ data: { cvs: [CV] } });
  });

  it("offers rename, duplicate and delete in the actions menu, delete last", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: 'Más acciones para "CV Analista"' }));
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Renombrar", "Duplicar CV", "Eliminar"]);
  });

  it("renames inline with Enter and saves only the title", async () => {
    apiMock.put.mockResolvedValue({ data: { cv: { ...CV, title: "CV Contador", updatedAt: "2026-11-25T10:00:00.000Z" } } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: 'Renombrar "CV Analista"' }));
    const input = screen.getByLabelText("Nuevo nombre del CV");
    fireEvent.change(input, { target: { value: "  CV   Contador " } });
    fireEvent.submit(input.closest("form")!);

    expect(await screen.findByRole("heading", { name: "CV Contador" })).toBeTruthy();
    expect(apiMock.put).toHaveBeenCalledWith("/cvs/cv-1", { title: "CV Contador" });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("Escape cancels without saving and the menu can start a rename", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: 'Más acciones para "CV Analista"' }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Renombrar" }));
    const input = screen.getByLabelText("Nuevo nombre del CV");
    fireEvent.change(input, { target: { value: "Otro" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.getByRole("heading", { name: "CV Analista" })).toBeTruthy();
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it("restores the old name when the server rejects the rename", async () => {
    apiMock.put.mockRejectedValue(new Error("network"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: 'Renombrar "CV Analista"' }));
    const input = screen.getByLabelText("Nuevo nombre del CV");
    fireEvent.change(input, { target: { value: "Nuevo" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(screen.getByRole("heading", { name: "CV Analista" })).toBeTruthy());
  });

  it("closes the menu with Escape", async () => {
    renderPage();
    const trigger = await screen.findByRole("button", { name: 'Más acciones para "CV Analista"' });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
