import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createInitialCVData, useCVEditorStore } from "../src/stores/cvEditorStore";
import type { SectionType } from "../src/types";

const { apiGetMock, apiPutMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPostMock: vi.fn(),
}));
vi.mock("../src/services/api", () => ({ api: { get: apiGetMock, put: apiPutMock, post: apiPostMock } }));

const personalValid = {
  fullName: "Ada Lovelace",
  professionalTitle: "Ingeniera de software",
  summary: "Experta en análisis, diseño y desarrollo de soluciones tecnológicas con impacto medible.",
};

function resetStore() {
  useCVEditorStore.setState({
    cvData: createInitialCVData(),
    validationErrors: {},
    touchedFields: new Set(),
    activeSection: "personal",
  });
}

describe("CV editor validation", () => {
  beforeEach(resetStore);

  it("reports an empty name and removes its error after correction", () => {
    const store = useCVEditorStore.getState();
    store.validateField("personal.fullName", "");
    expect(useCVEditorStore.getState().validationErrors["personal.fullName"]).toHaveLength(1);

    useCVEditorStore.getState().validateField("personal.fullName", "Ada Lovelace");
    expect(useCVEditorStore.getState().validationErrors).not.toHaveProperty("personal.fullName");
    expect(useCVEditorStore.getState().touchedFields.has("personal.fullName")).toBe(true);
  });

  it("clears corrected professional title and summary errors", () => {
    const store = useCVEditorStore.getState();
    store.validateField("personal.professionalTitle", "A");
    useCVEditorStore.getState().validateField("personal.professionalTitle", "Ingeniera");
    expect(useCVEditorStore.getState().validationErrors).not.toHaveProperty("personal.professionalTitle");

    useCVEditorStore.getState().validateField("personal.summary", "corto");
    expect(useCVEditorStore.getState().validationErrors["personal.summary"]).toHaveLength(1);
    useCVEditorStore.getState().validateField("personal.summary", personalValid.summary);
    expect(useCVEditorStore.getState().validationErrors).not.toHaveProperty("personal.summary");
  });

  it("validates nested contact arrays without treating personal as an array", () => {
    const personal = createInitialCVData().personal;
    personal.emails = [{ id: "e1", type: "personal", label: "Email", value: "no-es-correo", isPrimary: true }];
    personal.phones = [{ id: "p1", type: "personal", label: "Teléfono", number: "12", isPrimary: true }];
    useCVEditorStore.getState().updatePersonal(personal);

    expect(useCVEditorStore.getState().validateSection("personal")).toBe(false);
    expect(useCVEditorStore.getState().validationErrors["personal.emails.0.value"]).toBeDefined();
    expect(useCVEditorStore.getState().validationErrors["personal.phones.0.number"]).toBeDefined();

    useCVEditorStore.getState().validateField("personal.emails.0.value", "ada@example.com");
    useCVEditorStore.getState().validateField("personal.phones.0.number", "+57 (300) 123-4567");
    useCVEditorStore.getState().updatePersonal({
      ...personal,
      emails: [{ ...personal.emails[0], value: "ada@example.com" }],
      phones: [{ ...personal.phones[0], number: "+57 (300) 123-4567" }],
      fullName: "Ada Lovelace",
      professionalTitle: "Ingeniera",
      summary: "Experta en análisis, diseño y desarrollo de soluciones tecnológicas con impacto medible.",
    });
    expect(useCVEditorStore.getState().validateSection("personal")).toBe(true);
    expect(useCVEditorStore.getState().validationErrors).not.toHaveProperty("personal.emails.0.value");
    expect(useCVEditorStore.getState().validationErrors).not.toHaveProperty("personal.phones.0.number");
  });

  it("accepts valid contact values and rejects invalid email and phone values", () => {
    const store = useCVEditorStore.getState();
    store.validateField("personal.emails.0.value", "invalid");
    store.validateField("personal.phones.0.number", "abc");
    expect(useCVEditorStore.getState().validationErrors["personal.emails.0.value"]).toBeDefined();
    expect(useCVEditorStore.getState().validationErrors["personal.phones.0.number"]).toBeDefined();
    useCVEditorStore.getState().validateField("personal.emails.0.value", "ada@example.com");
    useCVEditorStore.getState().validateField("personal.phones.0.number", "+1 555-123-4567");
    expect(useCVEditorStore.getState().validationErrors).not.toHaveProperty("personal.emails.0.value");
    expect(useCVEditorStore.getState().validationErrors).not.toHaveProperty("personal.phones.0.number");
  });

  it.each([
    ["experience", [{ position: "", company: "", startDate: "", description: "" }], "experience.0.position"],
    ["education", [{ degree: "", institution: "", startDate: "" }], "education.0.degree"],
    ["skills", [{ name: "" }], "skills.0.name"],
  ] as Array<[SectionType, unknown, string]>)("resolves array paths for %s", (section, value, expectedError) => {
    useCVEditorStore.getState().updateCvData({ [section]: value } as any);
    expect(useCVEditorStore.getState().validateSection(section)).toBe(false);
    expect(useCVEditorStore.getState().validationErrors[expectedError]).toBeDefined();
  });

  it("replaces errors only for the validated section", () => {
    useCVEditorStore.setState({ validationErrors: { "personal.fullName": ["old"], "experience.0.position": ["keep"] } });
    useCVEditorStore.getState().updatePersonal({ ...createInitialCVData().personal, ...personalValid });
    expect(useCVEditorStore.getState().validateSection("personal")).toBe(true);
    expect(useCVEditorStore.getState().validationErrors).toEqual({ "experience.0.position": ["keep"] });
  });

  it("reproduces the reported loaded profile: errors clear and all eight sections become reachable", () => {
    const loaded = createInitialCVData();
    loaded.personal = {
      ...loaded.personal,
      ...personalValid,
      emails: [{ id: "e1", type: "personal", label: "Principal", value: "ada@example.com", isPrimary: true }],
      phones: [{ id: "p1", type: "personal", label: "Principal", number: "+57 3001234567", isPrimary: true }],
    };
    useCVEditorStore.getState().updatePersonal(loaded.personal);
    const store = useCVEditorStore.getState();
    expect(store.validateSection("personal")).toBe(true);

    const sections: SectionType[] = ["personal", "experience", "education", "skills", "languages", "certificates", "links", "application"];
    for (const section of sections) {
      expect(useCVEditorStore.getState().validateSection(section)).toBe(true);
      useCVEditorStore.getState().setActiveSection(section);
      expect(useCVEditorStore.getState().activeSection).toBe(section);
    }
    expect(useCVEditorStore.getState().validationErrors).toEqual({});
  });

  it("keeps corrected validation state clean across save and reload", async () => {
    const loaded = createInitialCVData();
    loaded.id = "cv-regression";
    loaded.personal = {
      ...loaded.personal,
      ...personalValid,
      emails: [{ id: "e1", type: "personal", label: "Principal", value: "ada@example.com", isPrimary: true }],
      phones: [{ id: "p1", type: "personal", label: "Principal", number: "+57 3001234567", isPrimary: true }],
    };
    useCVEditorStore.setState({ cvData: loaded, validationErrors: { "personal.fullName": ["obsoleto"] } });
    expect(useCVEditorStore.getState().validateSection("personal")).toBe(true);
    apiPutMock.mockResolvedValue({});
    apiGetMock.mockResolvedValue({ data: { cv: { data: loaded } } });

    await useCVEditorStore.getState().saveCV();
    await useCVEditorStore.getState().loadCV("cv-regression");

    expect(useCVEditorStore.getState().cvData.personal.fullName).toBe("Ada Lovelace");
    expect(useCVEditorStore.getState().validationErrors).toEqual({});
  });

    describe("Persistence - saveCV gatekeeping", () => {
    const proJobsIdentityUser = {
      ...createInitialCVData().personal,
      ...personalValid,
      emails: [{ id: "e1", type: "personal", label: "Principal", value: "ada@example.com", isPrimary: true }],
      phones: [{ id: "p1", type: "personal", label: "Principal", number: "+57 3001234567", isPrimary: true }],
    };

    function setValidPersonal(store: ReturnType<typeof useCVEditorStore>) {
      store.updatePersonal({ ...createInitialCVData().personal, ...personalValid });
    }

    beforeEach(() => {
      vi.spyOn(Storage.prototype, "setItem");
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("rejects saving invalid CV for guest user", async () => {
      const store = useCVEditorStore.getState();
      store.setIsGuest(true);
      store.updatePersonal({ ...createInitialCVData().personal, fullName: "" });

      await expect(store.saveCV()).rejects.toThrow("VALIDATION_ERROR");

      const setItemCalls = (Storage.prototype.setItem as any).mock.calls;
      const guestSaveCalls = setItemCalls.filter(call => call[0] === "procv_guest_resume");
      expect(guestSaveCalls).toHaveLength(0);
    });

    it("rejects saving invalid CV for authenticated user", async () => {
      const store = useCVEditorStore.getState();
      store.setIsGuest(false);
      store.updatePersonal({ ...createInitialCVData().personal, fullName: "" });

      await expect(store.saveCV()).rejects.toThrow("VALIDATION_ERROR");

      expect(apiPutMock).not.toHaveBeenCalled();
      expect(apiPostMock).not.toHaveBeenCalled();
    });

    it("preserves last valid version after failed save", async () => {
      const store = useCVEditorStore.getState();
      store.setIsGuest(true);

      store.updatePersonal({ ...createInitialCVData().personal, ...personalValid });
      await store.saveCV();

      const originalData = { ...store.cvData };

      store.updatePersonal({ ...store.cvData, fullName: "" });
      await expect(store.saveCV()).rejects.toThrow("VALIDATION_ERROR");

      expect(store.cvData).toEqual(originalData);
    });

    it("autoSave rejects invalid CV for guest user", async () => {
      const store = useCVEditorStore.getState();
      store.setIsGuest(true);
      store.updatePersonal({ ...createInitialCVData().personal, fullName: "" });

      await expect(store.saveCV()).rejects.toThrow("VALIDATION_ERROR");

      const setItemCalls = (Storage.prototype.setItem as any).mock.calls;
      const guestSaveCalls = setItemCalls.filter(call => call[0] === "procv_guest_resume");
      expect(guestSaveCalls).toHaveLength(0);
    });

    function withValidateSectionThrowing(fn: () => void | Promise<void>) {
      const current = useCVEditorStore.getState();
      const original = current.validateSection;
      useCVEditorStore.setState({ validateSection: () => { throw new Error("Validation engine failure"); } });
      try {
        return fn();
      } finally {
        useCVEditorStore.setState({ validateSection: original });
      }
    }

    it("validateCV returns false when validateSection throws", async () => {
      const store = useCVEditorStore.getState();
      store.updatePersonal({ ...createInitialCVData().personal, ...personalValid });

      await withValidateSectionThrowing(() => {
        expect(useCVEditorStore.getState().validateCV()).toBe(false);
      });
    });

    it("saveCV does not write to localStorage when validateSection throws", async () => {
      const store = useCVEditorStore.getState();
      store.setIsGuest(true);
      store.updatePersonal({ ...createInitialCVData().personal, fullName: "" });

      await withValidateSectionThrowing(async () => {
        await expect(useCVEditorStore.getState().saveCV()).rejects.toThrow("VALIDATION_ERROR");
      });

      const setItemCalls = (Storage.prototype.setItem as any).mock.calls;
      const guestSaveCalls = setItemCalls.filter(call => call[0] === "procv_guest_resume");
      expect(guestSaveCalls).toHaveLength(0);
    });

    it("saveCV does not call API when validateSection throws", async () => {
      const store = useCVEditorStore.getState();
      store.setIsGuest(false);
      store.updatePersonal({ ...proJobsIdentityUser });

      await withValidateSectionThrowing(async () => {
        await expect(useCVEditorStore.getState().saveCV()).rejects.toThrow("VALIDATION_ERROR");
      });

      expect(apiPutMock).not.toHaveBeenCalled();
      expect(apiPostMock).not.toHaveBeenCalled();
    });

    it("keeps previous validation errors when validateSection throws", async () => {
      const store = useCVEditorStore.getState();
      store.updatePersonal({ ...createInitialCVData().personal, fullName: "" });
      store.validateSection("personal");

      expect(useCVEditorStore.getState().validationErrors["personal.fullName"]).toBeDefined();

      await withValidateSectionThrowing(async () => {
        await expect(useCVEditorStore.getState().saveCV()).rejects.toThrow("VALIDATION_ERROR");
      });

      expect(useCVEditorStore.getState().validationErrors["personal.fullName"]).toBeDefined();
    });

    it("allows navigation after validation exception", async () => {
      const store = useCVEditorStore.getState();
      store.updatePersonal({ ...createInitialCVData().personal, ...personalValid });

      await withValidateSectionThrowing(() => {
        expect(() => useCVEditorStore.getState().validateSection("personal")).toThrow("Validation engine failure");
        useCVEditorStore.getState().setActiveSection("experience");
        expect(useCVEditorStore.getState().activeSection).toBe("experience");
      });
    });

    it("API failure does not mark CV as saved", async () => {
      const store = useCVEditorStore.getState();
      store.setIsGuest(false);
      store.updatePersonal({ ...createInitialCVData().personal, ...personalValid });

      apiPostMock.mockRejectedValue(new Error("Network error"));

      await expect(store.saveCV()).rejects.toThrow("Network error");

      const current = useCVEditorStore.getState();
      expect(current.isSaving).toBe(false);
      expect(current.hasUnsavedChanges).toBe(true);
    });
  });
});