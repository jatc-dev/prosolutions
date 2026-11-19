import { describe, expect, it } from "vitest";
import { evaluateCv } from "../src/lib/cvCheck";

const STRONG_CV = `Ana Pérez · ana.perez@correo.com · +57 300 123 4567 · Bogotá
Perfil profesional
Asesora comercial con seis años de experiencia en retail y servicio al cliente. ${"Me enfoco en metas de venta, fidelización y trabajo en equipo. ".repeat(12)}
Experiencia laboral
Asesora comercial senior — Tiendas Andinas (2021 - actual)
- Lideré un equipo de 6 personas y aumenté las ventas de la tienda un 18% en 2024.
- Atendí más de 40 clientes diarios con un índice de satisfacción del 95%.
- Reduje los faltantes de inventario un 30% implementando conteos semanales.
- Capacité a 12 asesores nuevos en el proceso de venta consultiva.
- Negocié acuerdos con 3 proveedores locales para exhibiciones especiales.
${"Coordiné campañas de temporada, organicé el punto de venta y garanticé el cumplimiento de estándares. ".repeat(10)}
Educación
Tecnóloga en Gestión Comercial — SENA (2019)
Habilidades
Ventas consultivas, servicio al cliente, manejo de caja, inventarios, Excel`;

describe("CV quick checklist", () => {
  it("rewards a structured CV with action verbs and quantified achievements", () => {
    const result = evaluateCv(STRONG_CV, "ventas, inventarios, Excel");
    expect(result.items.find((item) => item.id === "sections")?.passed).toBe(true);
    expect(result.items.find((item) => item.id === "verbs")?.passed).toBe(true);
    expect(result.items.find((item) => item.id === "metrics")?.passed).toBe(true);
    expect(result.matchedKeywords).toEqual(["ventas", "inventarios", "Excel"]);
    expect(result.level).toBe("alto");
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("flags a thin CV with actionable tips", () => {
    const result = evaluateCv("Juan. Trabajé en varias empresas. Referencias disponibles.", "atención al cliente");
    expect(result.level).toBe("bajo");
    expect(result.missingKeywords).toEqual(["atención al cliente"]);
    expect(result.items.find((item) => item.id === "format")?.tip).toContain("referencias disponibles");
    expect(result.items.find((item) => item.id === "length")?.tip).toContain("muy corto");
  });

  it("is accent-insensitive for sections and keywords", () => {
    const result = evaluateCv("EDUCACION y FORMACIÓN", "formacion");
    expect(result.matchedKeywords).toEqual(["formacion"]);
  });
});
