import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateRenderer, type CVData } from "../src/modules/procv/components/TemplateRenderer";
import { CURATED_CV_TEMPLATES } from "../src/utils/templateCatalog";

const data: CVData = {
  personal: {
    name: "Laura Gómez Pérez",
    documentType: "CC",
    documentNumber: "1.020.345.678",
    nationality: "CO",
    city: "Facatativá",
    country: "CO",
    emails: [{ value: "laura@example.com", type: "Personal" }],
    phones: [{ value: "+57 300 123 4567", type: "Personal" }],
    referencesAvailableOnRequest: true,
  },
  education: [{ id: "d1", institution: "Universidad Nacional", degree: "Contaduría pública", from: "2012-02", to: "2017-12" }],
  experience: [{ id: "x1", company: "Alcaldía de Facatativá", role: "Auxiliar administrativa", from: "2021-03", city: "Facatativá" }],
  languages: [{ id: "l1", name: "Inglés", level: "B2" }],
  application: {
    dafpFirstSurname: "Gómez",
    dafpSecondSurname: "Pérez",
    dafpGivenNames: "Laura",
    dafpSex: "f",
    dafpTimePublic: "3 años y 8 meses",
    dafpIneligible: "No",
    dafpSignPlace: "Facatativá",
    dafpSignDate: "2026-11-20",
  },
};

describe("Función Pública (DAFP) template", () => {
  it("is in the catalog as an ATS-friendly professional template", () => {
    expect(CURATED_CV_TEMPLATES.find((item) => item.key === "dafp")).toMatchObject({ label: "Función Pública (DAFP)", atsFriendly: true });
  });

  it("renders the official sections from the regular CV data plus the DAFP-only fields", () => {
    const { container } = render(<TemplateRenderer template="dafp" data={data} />);
    for (const heading of ["1. Datos personales", "2. Formación académica", "3. Experiencia laboral", "4. Tiempo total de experiencia", "5. Firma del servidor público o contratista"]) {
      expect(screen.getByText(heading)).toBeTruthy();
    }
    expect(screen.getByText("Gómez")).toBeTruthy();
    expect(screen.getByText("F")).toBeTruthy();
    expect(screen.getByText("CC 1.020.345.678")).toBeTruthy();
    expect(screen.getByText("Alcaldía de Facatativá")).toBeTruthy();
    expect(screen.getByText("Bien")).toBeTruthy(); // B2 → "Bien"
    // Official yes/no boxes: only "NO" is marked.
    const declaration = screen.getByText(/bajo la gravedad del juramento/);
    const boxes = Array.from(declaration.querySelectorAll("[role='img']")).map((box) => box.getAttribute("aria-label"));
    expect(boxes).toEqual(["sin marcar", "marcado"]);
    expect(container.textContent).toContain("Facatativá, 20 de noviembre de 2026");
    // The supplemental references block is not appended to official forms.
    expect(screen.queryByText(/disponibles a solicitud/)).toBeNull();
  });
});
