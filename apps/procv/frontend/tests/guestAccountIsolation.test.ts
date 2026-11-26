import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAccountEditorData,
  createInitialCVData,
  EDITOR_STORAGE_KEY,
  GUEST_DRAFT_KEY,
  useCVEditorStore,
} from "../src/stores/cvEditorStore";

vi.mock("react-hot-toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const accountCv = () => ({
  ...createInitialCVData(),
  id: "cv-account-1",
  title: "CV de la cuenta",
  personal: { ...createInitialCVData().personal, fullName: "Persona con cuenta" },
});

const guestDraft = (data: object) => localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data }));

describe("signed-out editor never shows the account CV", () => {
  beforeEach(() => {
    localStorage.clear();
    useCVEditorStore.setState({ cvData: accountCv(), isGuest: false, hasUnsavedChanges: false });
  });

  it("starts an empty CV when entering guest mode without a guest draft", () => {
    useCVEditorStore.getState().setIsGuest(true);
    const { cvData } = useCVEditorStore.getState();
    expect(cvData.id).toBeUndefined();
    expect(cvData.personal.fullName).toBe("");
  });

  it("loads the guest's own draft", () => {
    guestDraft({ ...createInitialCVData(), title: "Borrador invitado" });
    useCVEditorStore.getState().setIsGuest(true);
    expect(useCVEditorStore.getState().cvData.title).toBe("Borrador invitado");
  });

  it("discards a guest draft that is really an account CV (left by older versions)", () => {
    guestDraft(accountCv());
    useCVEditorStore.getState().setIsGuest(true);
    expect(useCVEditorStore.getState().cvData.personal.fullName).toBe("");
    expect(localStorage.getItem(GUEST_DRAFT_KEY)).toBeNull();
  });

  it("replaces an account CV restored while already in guest mode", () => {
    useCVEditorStore.setState({ isGuest: true, cvData: accountCv() });
    useCVEditorStore.getState().setIsGuest(true);
    expect(useCVEditorStore.getState().cvData.id).toBeUndefined();
  });

  it("does not keep the account CV in browser storage", () => {
    useCVEditorStore.setState({ isGuest: false, cvData: accountCv(), activeSection: "experience" });
    const stored = JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY) || "{}");
    expect(stored.state.cvData).toBeUndefined();
    expect(stored.state.activeSection).toBe("experience");

    useCVEditorStore.setState({ isGuest: true, cvData: { ...createInitialCVData(), title: "Invitado" } });
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY) || "{}").state.cvData.title).toBe("Invitado");
  });

  it("sign-out clears the editor storage and an account CV in the guest draft, but keeps a real guest draft", () => {
    localStorage.setItem(EDITOR_STORAGE_KEY, "{}");
    guestDraft(accountCv());
    clearAccountEditorData();
    expect(localStorage.getItem(EDITOR_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(GUEST_DRAFT_KEY)).toBeNull();

    guestDraft({ ...createInitialCVData(), title: "Mío" });
    clearAccountEditorData();
    expect(localStorage.getItem(GUEST_DRAFT_KEY)).not.toBeNull();
  });
});
