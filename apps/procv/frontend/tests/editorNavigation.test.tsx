import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorTabs } from "../src/modules/procv/components/editor/EditorTabs";
import { ValidationSummary } from "../src/modules/procv/components/editor/components/ValidationSummary";
import { changeEditorSection } from "../src/modules/procv/components/editor/navigationValidation";
import { PersonalSection } from "../src/modules/procv/components/editor/sections/PersonalSection";
import { createInitialCVData, useCVEditorStore } from "../src/stores/cvEditorStore";
import type { SectionType } from "../src/types";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es" } }) }));
vi.mock("../src/services/api", () => ({ api: {} }));

const sections: SectionType[] = ["personal", "experience", "education", "skills", "languages", "certificates", "links", "application"];
const completionStatus = Object.fromEntries(sections.map((section) => [section, false])) as Record<SectionType, boolean>;

function resetStore() {
  useCVEditorStore.setState({ cvData: createInitialCVData(), validationErrors: {}, touchedFields: new Set(), activeSection: "personal" });
}

describe("editor navigation validation", () => {
  it("propagates personal profile edits and validates the exact changed values", () => {
    const data = createInitialCVData().personal;
    const onChange = vi.fn();
    const onValidateField = vi.fn();
    render(<PersonalSection data={data} onChange={onChange} onValidateField={onValidateField} />);

    fireEvent.change(screen.getByPlaceholderText("editor.personal.placeholders.fullName"), { target: { value: "Ada Lovelace" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fullName: "Ada Lovelace" }));
    expect(onValidateField).toHaveBeenCalledWith("personal.fullName", "Ada Lovelace");

    fireEvent.change(screen.getByPlaceholderText("editor.personal.placeholders.professionalTitle"), { target: { value: "Ingeniera" } });
    expect(onValidateField).toHaveBeenCalledWith("personal.professionalTitle", "Ingeniera");
    fireEvent.change(screen.getByPlaceholderText("editor.personal.placeholders.summary"), { target: { value: "Perfil actualizado con más de cincuenta caracteres para validar correctamente." } });
    expect(onValidateField).toHaveBeenCalledWith("personal.summary", "Perfil actualizado con más de cincuenta caracteres para validar correctamente.");
  });

  it("blocks navigation for real errors and permits it after correcting the profile", () => {
    resetStore();
    const onSectionChange = vi.fn((section: SectionType) => {
      const store = useCVEditorStore.getState();
      changeEditorSection(store.activeSection, section, store.validateSection, store.setActiveSection);
    });
    const { rerender } = render(<EditorTabs activeSection="personal" onSectionChange={onSectionChange} completionStatus={completionStatus} />);

    fireEvent.click(screen.getByRole("button", { name: /Experiencia/ }));
    expect(useCVEditorStore.getState().activeSection).toBe("personal");
    expect(useCVEditorStore.getState().validationErrors["personal.fullName"]).toBeDefined();

    const initial = createInitialCVData();
    useCVEditorStore.getState().updatePersonal({
      ...initial.personal,
      fullName: "Ada Lovelace",
      professionalTitle: "Ingeniera de software",
      summary: "Experta en análisis, diseño y desarrollo de soluciones tecnológicas con impacto medible.",
    });
    rerender(<EditorTabs activeSection="personal" onSectionChange={onSectionChange} completionStatus={completionStatus} />);
    fireEvent.click(screen.getByRole("button", { name: /Experiencia/ }));
    expect(useCVEditorStore.getState().activeSection).toBe("experience");
    expect(useCVEditorStore.getState().validationErrors).toEqual({});
  });

  it("navigates through all eight sections and does not strand users on a validation exception", () => {
    resetStore();
    const initial = createInitialCVData();
    useCVEditorStore.getState().updatePersonal({
      ...initial.personal,
      fullName: "Ada Lovelace",
      professionalTitle: "Ingeniera",
      summary: "Experta en análisis, diseño y desarrollo de soluciones tecnológicas con impacto medible.",
    });
    const labels: Record<SectionType, string> = {
      personal: "Personal",
      experience: "Experiencia",
      education: "Educación",
      skills: "Habilidades",
      languages: "Idiomas",
      certificates: "Certificados",
      links: "Enlaces",
      application: "Solicitud de empleo",
    };
    const onSectionChange = (next: SectionType) => {
      const currentStore = useCVEditorStore.getState();
      changeEditorSection(currentStore.activeSection, next, currentStore.validateSection, currentStore.setActiveSection);
    };
    const { rerender } = render(<EditorTabs activeSection="personal" onSectionChange={onSectionChange} completionStatus={completionStatus} />);

    sections.slice(1).forEach((next) => {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(labels[next]) }));
      expect(useCVEditorStore.getState().activeSection).toBe(next);
      rerender(<EditorTabs activeSection={next} onSectionChange={onSectionChange} completionStatus={completionStatus} />);
    });
    expect(useCVEditorStore.getState().activeSection).toBe("application");

    const setSection = vi.fn((section: SectionType) => useCVEditorStore.getState().setActiveSection(section));
    expect(changeEditorSection("application", "personal", () => { throw new Error("validator failed"); }, setSection)).toBe(true);
    expect(setSection).toHaveBeenCalledWith("personal");
    expect(useCVEditorStore.getState().activeSection).toBe("personal");
  });

  it("shows only actual errors and removes the alert when the errors are corrected", () => {
    const { rerender } = render(<ValidationSummary section="personal" errors={{ "personal.fullName": [] }} />);
    expect(screen.queryByText(/Errores de validación/)).toBeNull();

    rerender(<ValidationSummary section="personal" errors={{ "personal.fullName": ["El nombre es requerido"] }} />);
    expect(screen.getByText("El nombre es requerido")).not.toBeNull();

    rerender(<ValidationSummary section="personal" errors={{}} />);
    expect(screen.queryByText("El nombre es requerido")).toBeNull();
  });
});
