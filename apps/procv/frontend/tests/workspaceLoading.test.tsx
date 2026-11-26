import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({ apiMock: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock("../src/services/api", () => ({ api: apiMock }));
vi.mock("../src/components/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { SLOW_LOAD_MS, UnifiedWorkspacePage } from "../src/pages/UnifiedWorkspacePage";

describe("loading the saved CVs", () => {
  afterEach(() => vi.useRealTimers());

  it("says the CVs are loading, explains a slow start, and goes away when ready", async () => {
    vi.useFakeTimers();
    let resolve: (value: unknown) => void = () => undefined;
    apiMock.get.mockReturnValue(new Promise((done) => (resolve = done)));
    render(<MemoryRouter><UnifiedWorkspacePage /></MemoryRouter>);

    expect(screen.getByRole("status").textContent).toContain("Cargando tus hojas de vida");
    expect(screen.getByRole("status").textContent).not.toContain("servidor");
    await act(async () => { vi.advanceTimersByTime(SLOW_LOAD_MS); });
    expect(screen.getByRole("status").textContent).toContain("el servidor se está activando");

    await act(async () => { resolve({ data: { cvs: [] } }); });
    expect(screen.queryByText(/Cargando tus hojas de vida/)).toBeNull();
  });
});
