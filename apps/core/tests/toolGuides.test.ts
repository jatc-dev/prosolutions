import { describe, expect, it } from "vitest";
import { toolGuide } from "../src/content/toolGuides";
import { calculatePrima } from "../src/lib/payroll/prima";
import { paramsFor } from "../src/lib/payroll/params";
import { headForPath } from "../src/public/seo";

const SLUGS = ["prima", "cesantias", "vacaciones", "salario-neto", "liquidacion", "contrato-vs-prestacion"] as const;

describe("calculator guides", () => {
  it("every payroll calculator has a worked example, FAQs and related tools", () => {
    for (const slug of SLUGS) {
      const guide = toolGuide(slug)!;
      expect(guide.example.rows.length, slug).toBeGreaterThan(1);
      expect(guide.example.result[1], slug).toMatch(/^\$\d/);
      expect(guide.faq.length, slug).toBeGreaterThanOrEqual(3);
      expect(guide.related).not.toContain(slug);
    }
  });

  it("uses the same calculation and yearly parameters as the calculator", () => {
    const params = paramsFor();
    const prima = calculatePrima({ year: params.year, semester: 1, monthlySalary: params.smmlv });
    const guide = toolGuide("prima")!;
    expect(guide.example.result[1]).toBe(`$${Math.round(prima.amount).toLocaleString("es-CO")}`);
    expect(guide.faq[0]!.q).toContain(String(params.year));
  });

  it("says which contract is worth more with the right sign", () => {
    expect(toolGuide("contrato-vs-prestacion")!.example.result[0]).toBe("El contrato laboral vale más cada mes");
  });

  it("publishes the FAQs as structured data", () => {
    const head = headForPath("/tools/cesantias")!;
    expect(head.jsonLd?.some((item) => item["@type"] === "FAQPage")).toBe(true);
  });
});
