import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialCVData } from "../src/stores/cvEditorStore";
import type { CVData } from "../src/types";
import { buildCoverLetterDraft, formatLetterDate, letterParagraphs, placeholdersIn, wordCount, yearsOfExperience } from "../src/modules/procv/coverLetter";
import { CoverLetterPreview } from "../src/modules/procv/components/CoverLetterPreview";

const NOW = new Date("2026-11-19T12:00:00Z");

function sampleCv(overrides: Partial<CVData> = {}): CVData {
  const initial = createInitialCVData();
  return {
    ...initial,
    template: "minimal",
    personal: {
      ...initial.personal,
      fullName: "Laura Gómez",
      professionalTitle: "Analista administrativa",
      city: "Bogotá",
      emails: [{ id: "e1", type: "personal", label: "Personal", value: "laura@example.com", isPrimary: true }],
      phones: [{ id: "p1", type: "mobile", number: "+57 300 123 4567", isPrimary: true }],
    },
    experience: [
      { id: "x1", position: "Auxiliar contable", company: "Servicios Integrales", employmentType: "full-time", startDate: "2019-02", endDate: "2021-02", isCurrentPosition: false, description: "", achievements: [], technologies: [], order: 1 },
      { id: "x2", position: "Analista administrativa", company: "Comercial Andina", employmentType: "full-time", startDate: "2021-03", isCurrentPosition: true, description: "", achievements: [], technologies: [], order: 0 },
    ] as CVData["experience"],
    skills: [
      { id: "s1", name: "Excel avanzado", category: "technical", level: "advanced", isCertified: false, order: 0 },
      { id: "s2", name: "SIIGO", category: "technical", level: "intermediate", isCertified: false, order: 1 },
      { id: "s3", name: "Conciliaciones", category: "technical", level: "advanced", isCertified: false, order: 2 },
    ] as CVData["skills"],
    ...overrides,
  };
}

describe("cover letter draft", () => {
  it("counts whole years from the earliest job", () => {
    expect(yearsOfExperience(sampleCv().experience, NOW)).toBe(7);
    expect(yearsOfExperience([], NOW)).toBe(0);
  });

  it("builds a four-paragraph draft from the CV and the target vacancy", () => {
    const draft = buildCoverLetterDraft(sampleCv(), { company: "Grupo Éxito", position: "Coordinadora administrativa" }, NOW);
    const paragraphs = letterParagraphs(draft);
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[0]).toBe(
      "Me dirijo a ustedes para postularme al cargo de Coordinadora administrativa en Grupo Éxito. Soy analista administrativa con más de 7 años de experiencia. Actualmente me desempeño como Analista administrativa en Comercial Andina.",
    );
    expect(paragraphs[1]).toContain("Excel avanzado, SIIGO y Conciliaciones");
    expect(paragraphs[2]).toContain("Grupo Éxito");
    // The parts only the candidate can write stay as visible placeholders.
    expect(placeholdersIn(draft)).toHaveLength(2);
    expect(wordCount(draft)).toBeGreaterThan(60);
  });

  it("does not double the final period of company names", () => {
    const cv = sampleCv();
    cv.experience[1]!.company = "Comercial Andina S.A.S.";
    const draft = buildCoverLetterDraft(cv, { company: "Grupo Éxito S.A." }, NOW);
    expect(draft).toContain("en Comercial Andina S.A.S. Actualmente".replace(" Actualmente", ""));
    expect(draft).not.toMatch(/S\.A\.S\.\./);
    expect(draft).not.toMatch(/S\.A\.\./);
  });

  it("falls back gracefully on an empty CV", () => {
    const empty = createInitialCVData();
    const draft = buildCoverLetterDraft(empty, {}, NOW);
    expect(draft).toContain("[cargo al que aplicas]");
    expect(draft).toContain("esta empresa");
    expect(draft).not.toContain("undefined");
  });

  it("formats the place and date in Spanish", () => {
    expect(formatLetterDate("Medellín", "2026-11-19")).toBe("Medellín, 19 de noviembre de 2026");
    expect(formatLetterDate("", "2026-01-05")).toBe("5 de enero de 2026");
  });
});

describe("CoverLetterPreview", () => {
  it("renders sender, recipient, subject, body with highlighted placeholders and signature", () => {
    const cv = sampleCv({
      coverLetter: {
        recipientName: "Ana Ruiz",
        company: "Grupo Éxito",
        position: "Coordinadora administrativa",
        date: "2026-11-19",
        body: "Primer párrafo.\n\nSegundo con [un logro medible].",
      },
    });
    render(<CoverLetterPreview cv={cv} />);
    expect(screen.getByRole("heading", { level: 1, name: "Laura Gómez" })).toBeTruthy();
    expect(screen.getByText("laura@example.com · +57 300 123 4567 · Bogotá")).toBeTruthy();
    expect(screen.getByText("Bogotá, 19 de noviembre de 2026")).toBeTruthy();
    expect(screen.getByText("Estimado(a) Ana Ruiz:")).toBeTruthy();
    expect(screen.getByText("Asunto: postulación al cargo de Coordinadora administrativa")).toBeTruthy();
    expect(screen.getByText("[un logro medible]").tagName).toBe("MARK");
    expect(screen.getByText("Cordialmente,")).toBeTruthy();
  });

  it("uses the dark band header of dark templates and the user's chosen font", () => {
    const cv = sampleCv({ template: "developer", settings: { ...createInitialCVData().settings, fontBody: "merriweather" } });
    const { container } = render(<CoverLetterPreview cv={cv} />);
    expect(container.querySelector(".cv-font-body-custom")).not.toBeNull();
    expect((container.querySelector("header") as HTMLElement).style.background).toContain("rgb(15, 23, 42)");
  });
});
