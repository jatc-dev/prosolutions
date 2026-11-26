import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
vi.mock("../src/services/api", () => ({
  api: { get: (...args: unknown[]) => get(...args), post: (...args: unknown[]) => post(...args) },
}));
const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@prosolutions/ui", async (original) => ({ ...(await original<typeof import("@prosolutions/ui")>()), trackEvent }));
let signedIn = true;
vi.mock("../src/stores/authStore", () => ({ useAuth: () => ({ isAuthenticated: signedIn }) }));
vi.mock("../src/stores/cvEditorStore", () => ({
  useCVEditorStore: (select: (state: { cvData: { id: string } }) => unknown) => select({ cvData: { id: "cv-1" } }),
}));

import { AiImproveField, AI_ACTIONS } from "../src/modules/procv/components/editor/components/AiImproveField";
import { resetAiAvailabilityForTests } from "../src/services/cvAIGeneration";

const longText = "Vendedora con tres años de experiencia en tiendas de ropa y atención al cliente.";

async function renderField(props: Partial<React.ComponentProps<typeof AiImproveField>> = {}) {
  const onApply = vi.fn();
  render(<AiImproveField section="summary" text={longText} onApply={onApply} fieldLabel="el perfil profesional" {...props} />);
  await act(async () => undefined);
  return onApply;
}

describe("Mejorar con IA in the CV form", () => {
  beforeEach(() => {
    signedIn = true;
    resetAiAvailabilityForTests();
    get.mockResolvedValue({ data: { available: true } });
  });
  afterEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("sends the chosen action with the field text and the saved CV, then applies the proposal", async () => {
    post.mockResolvedValue({ data: { suggestion: "Vendedora con tres años de experiencia.", changes: ["Más breve"], needsUserInput: ["Una cifra de ventas"] } });
    const onApply = await renderField();

    fireEvent.click(screen.getByRole("button", { name: "Mejorar el perfil profesional con IA" }));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(
      AI_ACTIONS.map((action) => `${action.label}${action.description}`),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: /Hacerlo más breve/ }));
    });

    expect(post).toHaveBeenCalledWith("/ai/improve", expect.objectContaining({ section: "summary", text: longText, cvId: "cv-1" }));
    expect(post.mock.calls[0][1].instruction).toContain("más breve");
    expect(screen.getByText("Vendedora con tres años de experiencia.")).toBeTruthy();
    expect(screen.getByText("Una cifra de ventas")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Usar esta versión" }));
    expect(onApply).toHaveBeenCalledWith("Vendedora con tres años de experiencia.");
    // Analytics: which action and section, never the text the person wrote.
    expect(trackEvent).toHaveBeenCalledWith("ai_improve", { section: "summary", action: "shorter", result: "success" });
    expect(trackEvent).toHaveBeenCalledWith("ai_improve_applied", { section: "summary" });
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain("Vendedora");
  });

  it("adds the job as context for an experience", async () => {
    post.mockResolvedValue({ data: { suggestion: "x", changes: [], needsUserInput: [] } });
    await renderField({ section: "experience", context: "Cargo: Vendedora. Empresa: Éxito" });
    fireEvent.click(screen.getByRole("button", { name: /con IA/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: /Mejorar redacción/ }));
    });
    expect(post.mock.calls[0][1].instruction).toContain("Contexto: Cargo: Vendedora. Empresa: Éxito.");
  });

  it("asks for more text before calling the assistant and shows server errors", async () => {
    await renderField({ text: "Vendedora" });
    fireEvent.click(screen.getByRole("button", { name: /con IA/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Mejorar redacción/ }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Escribe un poco más");
  });

  it("shows the daily limit message from the server", async () => {
    post.mockRejectedValue({ response: { data: { message: "Alcanzaste el límite diario de sugerencias de IA. Vuelve mañana.", code: "ai_daily_limit" } } });
    await renderField();
    fireEvent.click(screen.getByRole("button", { name: /con IA/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: /Mejorar redacción/ }));
    });
    expect(screen.getByRole("alert").textContent).toContain("límite diario");
  });

  it("is hidden for guests and when the server has no AI", async () => {
    signedIn = false;
    await renderField();
    expect(screen.queryByRole("button", { name: /con IA/ })).toBeNull();

    signedIn = true;
    resetAiAvailabilityForTests();
    get.mockResolvedValue({ data: { available: false } });
    await renderField();
    expect(screen.queryByRole("button", { name: /con IA/ })).toBeNull();
  });
});
