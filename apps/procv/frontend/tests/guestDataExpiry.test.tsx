import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInitialCVData,
  EDITOR_STORAGE_KEY,
  GUEST_DATA_TTL_MS,
  GUEST_DRAFT_KEY,
  isGuestDataExpired,
  useCVEditorStore,
} from "../src/stores/cvEditorStore";
import { GuestDataDialog } from "../src/modules/procv/components/editor/components/GuestDataDialog";

vi.mock("react-hot-toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const draft = (savedAt: number | undefined, title = "Borrador") =>
  localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify({ savedAt, data: { ...createInitialCVData(), title } }));

describe("guest CV kept for 2 hours without changes", () => {
  beforeEach(() => {
    localStorage.clear();
    useCVEditorStore.setState({ cvData: createInitialCVData(), isGuest: false });
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("keeps a recent draft and deletes one older than 2 hours", () => {
    draft(Date.now() - 10 * 60 * 1000, "Reciente");
    useCVEditorStore.getState().setIsGuest(true);
    expect(useCVEditorStore.getState().cvData.title).toBe("Reciente");

    useCVEditorStore.setState({ isGuest: false });
    localStorage.clear();
    draft(Date.now() - GUEST_DATA_TTL_MS - 1000, "Viejo");
    useCVEditorStore.getState().setIsGuest(true);
    expect(useCVEditorStore.getState().cvData.title).not.toBe("Viejo");
    expect(localStorage.getItem(GUEST_DRAFT_KEY)).toBeNull();
  });

  it("treats drafts saved before the time limit existed as expired", () => {
    draft(undefined);
    expect(isGuestDataExpired()).toBe(true);
  });

  it("counts every change as activity and expires 2 hours after the last one", () => {
    useCVEditorStore.setState({ isGuest: true, cvData: { ...createInitialCVData(), title: "Editando" } });
    const now = Date.now();
    expect(isGuestDataExpired(now + 60 * 60 * 1000)).toBe(false);
    expect(isGuestDataExpired(now + GUEST_DATA_TTL_MS + 60 * 1000)).toBe(true);
  });

  it("does not restore an expired CV when the page opens again", async () => {
    localStorage.setItem(
      EDITOR_STORAGE_KEY,
      JSON.stringify({ state: { isGuest: true, persistedAt: Date.now() - GUEST_DATA_TTL_MS - 1000, cvData: { ...createInitialCVData(), title: "Viejo" } }, version: 0 }),
    );
    await useCVEditorStore.persist.rehydrate();
    expect(useCVEditorStore.getState().cvData.title).not.toBe("Viejo");
  });

  it("deletes everything on request", () => {
    useCVEditorStore.setState({ isGuest: true, cvData: { ...createInitialCVData(), title: "Mío" } });
    draft(Date.now(), "Mío");
    useCVEditorStore.getState().discardGuestData();
    expect(localStorage.getItem(GUEST_DRAFT_KEY)).toBeNull();
    expect(useCVEditorStore.getState().cvData.title).not.toBe("Mío");
  });
});

describe("guest leave / delete dialog", () => {
  it("offers download, sign-up, delete-and-leave and leave", () => {
    const handlers = { onClose: vi.fn(), onDownload: vi.fn(), onLeave: vi.fn(), onClear: vi.fn() };
    render(<GuestDataDialog mode="leave" {...handlers} />);
    expect(screen.getByRole("dialog").textContent).toContain("2 horas");
    expect(screen.getByRole("link", { name: /Crear cuenta gratis/ }).getAttribute("href")).toBe("/auth");
    fireEvent.click(screen.getByRole("button", { name: /Descargar PDF/ }));
    fireEvent.click(screen.getByRole("button", { name: /Borrar mis datos y salir/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Salir$/ }));
    expect(handlers.onDownload).toHaveBeenCalledOnce();
    expect(handlers.onClear).toHaveBeenCalledOnce();
    expect(handlers.onLeave).toHaveBeenCalledOnce();
  });

  it("asks before deleting", () => {
    const handlers = { onClose: vi.fn(), onDownload: vi.fn(), onLeave: vi.fn(), onClear: vi.fn() };
    render(<GuestDataDialog mode="clear" {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(handlers.onClose).toHaveBeenCalledOnce();
    expect(handlers.onClear).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Borrar mis datos$/ }));
    expect(handlers.onClear).toHaveBeenCalledOnce();
  });
});
