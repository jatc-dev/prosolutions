import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplateRenderer } from "../src/modules/procv/components/TemplateRenderer";
import { CURATED_CV_TEMPLATES, CV_TEMPLATE_GROUPS } from "../src/utils/templateCatalog";
import { addPdfTextLayer, toWinAnsi, type PdfWriter } from "../src/modules/procv/pdfTextLayer";

const data = {
  personal: { name: "Ana Pérez", role: "Vendedora", summary: "Vendedora con experiencia.", emails: [{ value: "ana@example.com", type: "Correo" }] },
  experience: [{ id: "x", company: "Éxito", role: "Asesora comercial", from: "2020-01", to: "2023-05", description: "Atención al cliente." }],
  education: [{ id: "d", institution: "SENA", degree: "Técnico en ventas", from: "", to: "2019-12" }],
  skills: [{ id: "s", name: "Negociación" }],
  languages: [{ id: "l", name: "Inglés", level: "B1" }],
  certificates: [],
  links: {},
};

describe("template catalog", () => {
  it("has 21 templates in four groups, all ATS-readable, with no ATS-only group", () => {
    expect(CURATED_CV_TEMPLATES).toHaveLength(21);
    expect(CV_TEMPLATE_GROUPS.map((group) => group.id)).toEqual(["simple", "professional", "design", "official"]);
    expect(CURATED_CV_TEMPLATES.every((template) => template.atsFriendly)).toBe(true);
    expect(CURATED_CV_TEMPLATES.find((template) => template.key === "sidebar")?.group).toBe("design");
    expect(new Set(CURATED_CV_TEMPLATES.map((template) => template.key)).size).toBe(21);
  });

  it.each(CURATED_CV_TEMPLATES.filter((template) => template.group !== "official").map((template) => template.key))(
    "%s renders the CV content with standard section titles",
    (key) => {
      const { container } = render(<TemplateRenderer template={key} data={data as never} />);
      const text = container.textContent || "";
      for (const expected of ["Ana Pérez", "Asesora comercial", "Técnico en ventas", "Negociación"]) expect(text).toContain(expected);
      expect(container.querySelectorAll("[data-cv-section-title]").length).toBeGreaterThanOrEqual(3);
    },
  );
});

describe("PDF text layer", () => {
  it("keeps Spanish characters and drops ones the PDF fonts cannot encode", () => {
    expect(toWinAnsi("Educación – Año ñandú “ok” 😀")).toBe("Educación – Año ñandú “ok” ");
  });

  it("writes invisible text on the right page", () => {
    const calls: Array<[string, number, number, Record<string, unknown> | undefined, number]> = [];
    let page = 0;
    const pdf: PdfWriter = {
      setPage: (value) => (page = value),
      setFont: () => undefined,
      setFontSize: () => undefined,
      getTextWidth: (text) => text.length,
      getNumberOfPages: () => 2,
      text: (text, x, y, options) => calls.push([text, x, y, options, page]),
    };
    addPdfTextLayer(pdf, [
      { page: 2, x: 10, y: 20, width: 30, height: 5, text: "Experiencia laboral" },
      { page: 3, x: 0, y: 0, width: 1, height: 1, text: "fuera" },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("Experiencia laboral");
    expect(calls[0][4]).toBe(2);
    expect(calls[0][3]?.renderingMode).toBe("invisible");
    expect(calls[0][2]).toBeGreaterThan(20);
  });
});
