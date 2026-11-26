import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dafpGraduated, educationTitle, inferDafpModality } from "../src/modules/procv/education";
import { cvDocxContent } from "../src/modules/procv/exportDocx";
import { TemplateRenderer } from "../src/modules/procv/components/TemplateRenderer";
import { createInitialCVData } from "../src/stores/cvEditorStore";

describe("education title and public-sector form data", () => {
  it("shows the programme the person wrote, not only the type of studies", () => {
    expect(educationTitle({ degree: "bachelor", fieldOfStudy: "Administración de empresas" }, () => "Pregrado/Licenciatura")).toBe("Administración de empresas");
    expect(educationTitle({ degree: "bachelor", fieldOfStudy: "" }, () => "Pregrado/Licenciatura")).toBe("Pregrado/Licenciatura");
  });

  it("no longer prints the internal type key in Word", () => {
    const cv = {
      ...createInitialCVData(),
      education: [{ id: "d", degree: "bachelor", fieldOfStudy: "Administración de empresas", institution: "Universidad Nacional", startDate: "2010-02", endDate: "2015-12", isCurrentlyStudying: false, isVisible: true, order: 0, activities: [], achievements: [] }],
    };
    const education = cvDocxContent(cv as never).sections.find((section) => section.key === "education")!;
    expect(education.blocks[0]!.title).toBe("Administración de empresas");
    expect(JSON.stringify(education)).not.toContain("bachelor");
  });

  it("infers only unambiguous modalities and graduation from the dates", () => {
    expect(inferDafpModality("bachelor")).toBe("UN");
    expect(inferDafpModality("master")).toBe("MG");
    expect(inferDafpModality("associate")).toBe("");
    expect(dafpGraduated({ endDate: "2015-12" })).toBe("SÍ");
    expect(dafpGraduated({ isCurrentlyStudying: true })).toBe("NO");
    expect(dafpGraduated({ dafpGraduated: "no", endDate: "2015-12" })).toBe("NO");
  });

  it("fills modality, semesters and graduation in the DAFP form, without secondary school", () => {
    const data = {
      personal: { name: "Laura Gómez" },
      education: [
        { id: "a", degree: "Administración de empresas", degreeType: "bachelor", dafpModality: "UN", dafpSemesters: "10", dafpGraduated: "SÍ", institution: "Universidad Nacional", from: "2010-02", to: "2015-12" },
        { id: "b", degree: "Bachiller académico", degreeType: "high-school", institution: "Colegio San José", from: "", to: "2009-11" },
      ],
      experience: [], application: {},
    };
    const { container } = render(<TemplateRenderer template="dafp" data={data as never} />);
    const rows = Array.from(container.querySelectorAll("tbody tr")).map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent));
    expect(rows.find((cells) => cells.includes("Administración de empresas"))?.slice(0, 3)).toEqual(["UN", "10", "SÍ"]);
    expect(container.textContent).not.toContain("Colegio San José");
  });
});
