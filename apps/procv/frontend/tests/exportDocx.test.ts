import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { createInitialCVData } from "../src/stores/cvEditorStore";
import type { CVData } from "../src/types";
import { cvDocxContent, monthYear, period } from "../src/modules/procv/exportDocx";

function sampleCv(): CVData {
  const initial = createInitialCVData();
  return {
    ...initial,
    title: "Hoja de vida Laura",
    personal: {
      ...initial.personal,
      fullName: "Laura Gómez",
      professionalTitle: "Auxiliar contable",
      summary: "Contadora con experiencia en conciliaciones.",
      city: "Bogotá",
      emails: [{ id: "e1", type: "personal", label: "Personal", value: "laura@example.com", isPrimary: true }],
      phones: [{ id: "p1", type: "mobile", number: "+57 300 123 4567", isPrimary: true }],
      references: [{ id: "r1", type: "laboral", name: "Carlos Ruiz", position: "Jefe", company: "Andina", phone: "+57 310 555 0101", hiddenFields: ["phone"] }],
      referencesAvailableOnRequest: true,
    },
    experience: [
      { id: "x1", position: "Auxiliar contable", company: "Andina", location: "Bogotá", employmentType: "full-time", startDate: "2021-03", isCurrentPosition: true, description: "Causación de facturas.", achievements: ["Reduje el cierre a 3 días.", " "], technologies: [], order: 0 },
      { id: "x2", isVisible: false, position: "Oculto", company: "X", employmentType: "full-time", startDate: "2019-01", isCurrentPosition: false, description: "", achievements: [], technologies: [], order: 1 },
    ] as CVData["experience"],
    skills: [{ id: "s1", name: "Excel", category: "technical", level: "advanced", isCertified: false, order: 0 }] as CVData["skills"],
    languages: [{ id: "l1", language: "Inglés", listeningLevel: "B1", readingLevel: "B2", speakingLevel: "B1", writingLevel: "B1", order: 0 }] as CVData["languages"],
  };
}

describe("Word export", () => {
  it("formats dates in Spanish", () => {
    expect(monthYear("2021-03")).toBe("marzo 2021");
    expect(period("2021-03", undefined, true)).toBe("marzo 2021 – actualidad");
    expect(period("2019-01", "2020-12", false)).toBe("enero 2019 – diciembre 2020");
  });

  it("builds a one-column structure from the CV data, skipping hidden items and fields", () => {
    const content = cvDocxContent(sampleCv());
    expect(content.name).toBe("Laura Gómez");
    expect(content.headline).toBe("Auxiliar contable");
    expect(content.contact).toBe("laura@example.com · +57 300 123 4567 · Bogotá");
    expect(content.sections.map((section) => section.heading)).toEqual(["Perfil profesional", "Experiencia laboral", "Habilidades", "Idiomas", "Referencias"]);
    const experience = content.sections[1]!.blocks;
    expect(experience).toHaveLength(1);
    expect(experience[0]).toMatchObject({ title: "Auxiliar contable — Andina", subtitle: "marzo 2021 – actualidad · Bogotá", bullets: ["Reduje el cierre a 3 días."] });
    expect(content.sections[3]!.blocks[0]!.bullets).toEqual(["Inglés: intermedio (B1)"]);
    const references = content.sections[4]!.blocks;
    expect(references[0]!.subtitle).toBe("Laboral · Jefe, Andina");
    expect(references[1]!.text).toContain("disponibles a solicitud");
  });

  it("produces a valid .docx package with the text inside", async () => {
    const content = cvDocxContent(sampleCv());
    const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun(content.name)] })] }] });
    const buffer = await Packer.toBuffer(doc);
    // A .docx is a zip archive ("PK" signature).
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
