import React, { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReferencesSection } from "../src/modules/procv/components/editor/sections/ReferencesSection";
import { TemplateRenderer } from "../src/modules/procv/components/TemplateRenderer";
import { groupReferences, referenceDetails, REFERENCES_ON_REQUEST_TEXT } from "../src/modules/procv/references";
import { sectionTitle } from "../src/modules/procv/sectionTitles";
import { createInitialCVData } from "../src/stores/cvEditorStore";
import type { PersonalData } from "../src/types";

vi.mock("react-hot-toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }), default: vi.fn() }));

function Harness({ onState }: { onState?: (p: PersonalData) => void }) {
  const [personal, setPersonal] = useState<PersonalData>(createInitialCVData().personal);
  return (
    <ReferencesSection
      personal={personal}
      onChange={(changes) => {
        const next = { ...personal, ...changes };
        setPersonal(next);
        onState?.(next);
      }}
    />
  );
}

describe("Referencias tab", () => {
  it("adds work, personal and family references, each with its own fields", () => {
    let state: PersonalData | undefined;
    render(<Harness onState={(p) => (state = p)} />);
    fireEvent.click(screen.getByRole("button", { name: "Laboral" }));
    fireEvent.click(screen.getByRole("button", { name: "Familiar" }));
    const cards = screen.getAllByTestId("reference-card");
    expect(within(cards[0]).getByText("Cargo")).toBeTruthy();
    expect(within(cards[0]).getByText("Empresa")).toBeTruthy();
    expect(within(cards[1]).getByText("Parentesco")).toBeTruthy();
    expect(within(cards[1]).queryByText("Empresa")).toBeNull();
    expect(state?.references?.map((item) => item.type)).toEqual(["laboral", "familiar"]);
  });

  it("uses the request text without a colon", () => {
    render(<Harness />);
    expect(screen.getByText(`Mostrar «${REFERENCES_ON_REQUEST_TEXT}»`, { exact: false })).toBeTruthy();
    expect(REFERENCES_ON_REQUEST_TEXT).toBe("Referencias laborales y personales disponibles a solicitud.");
  });
});

describe("references on the CV", () => {
  const references = [
    { id: "1", type: "laboral", name: "Ana Ruiz", position: "Jefe de ventas", company: "Éxito", phone: "300 1" },
    { id: "2", type: "familiar", name: "Luis Ruiz", relationship: "Tío", position: "Docente", phone: "300 2" },
    { id: "3", type: "personal", name: "Eva Díaz", position: "Amiga", relationship: "Amiga", hiddenFields: ["phone"], phone: "300 3" },
    { id: "4", type: "laboral", name: "Oculta", isVisible: false },
  ];

  it("groups by type in a fixed order and hides what the user hid", () => {
    const groups = groupReferences(references);
    expect(groups.map((group) => group.label)).toEqual(["Referencias laborales", "Referencias personales", "Referencias familiares"]);
    expect(referenceDetails(references[1])).toEqual(["Tío", "Docente"]);
    // Older personal references repeated the relationship in both fields.
    expect(referenceDetails(references[2])).toEqual(["Amiga"]);
  });

  it("prints the custom section title and the groups in the template", () => {
    const data = {
      personal: { name: "Persona", references, showReferences: true, referencesAvailableOnRequest: true },
      settings: { sectionTitles: { references: "Mis referencias" } },
      experience: [],
      education: [],
      skills: [],
      languages: [],
      certificates: [],
      links: [],
    };
    expect(sectionTitle(data.settings, "references")).toBe("Mis referencias");
    const { container } = render(<TemplateRenderer template="minimal" data={data as never} />);
    const text = container.textContent || "";
    expect(text).toContain("Mis referencias");
    expect(text).toContain("Referencias familiares");
    expect(text).toContain("Tío · Docente");
    expect(text).not.toContain("Oculta");
    expect(text).not.toContain("300 3");
    expect(text).toContain(REFERENCES_ON_REQUEST_TEXT);
  });
});
