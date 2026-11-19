import { paramsFor } from "../lib/payroll/params";

export type ToolSlug = "salario-neto" | "liquidacion" | "contrato-vs-prestacion" | "evaluador-cv";

export interface ToolInfo {
  slug: ToolSlug;
  title: string;
  shortTitle: string;
  description: string;
  /** Date the rules/parameters behind the tool were last reviewed (ISO). */
  updatedAt: string;
}

const payrollReviewedAt = paramsFor().reviewedAt;

export const TOOLS: ToolInfo[] = [
  {
    slug: "salario-neto",
    title: "Calculadora de salario neto y costo empresa en Colombia 2026",
    shortTitle: "Salario neto y costo empresa",
    description:
      "Calcula cuánto recibes cada mes después de salud, pensión, Fondo de Solidaridad y retención en la fuente, y cuánto le cuesta tu salario al empleador en 2026.",
    updatedAt: payrollReviewedAt,
  },
  {
    slug: "liquidacion",
    title: "Calculadora de liquidación laboral en Colombia 2026",
    shortTitle: "Liquidación laboral",
    description:
      "Estima prima, cesantías, intereses a las cesantías, vacaciones e indemnización al terminar un contrato indefinido, a término fijo o por obra.",
    updatedAt: payrollReviewedAt,
  },
  {
    slug: "contrato-vs-prestacion",
    title: "Contrato laboral vs. prestación de servicios: simulador 2026",
    shortTitle: "Laboral vs. prestación de servicios",
    description:
      "Compara cuánto recibes con un contrato laboral y con uno de prestación de servicios (IBC del 40%), y qué honorarios necesitas para quedar igual.",
    updatedAt: payrollReviewedAt,
  },
  {
    slug: "evaluador-cv",
    title: "Evaluador gratuito de hoja de vida (checklist ATS)",
    shortTitle: "Evaluador de CV",
    description:
      "Pega el texto de tu hoja de vida y recibe una puntuación con recomendaciones: estructura, verbos de acción, logros medibles y palabras clave de la vacante.",
    updatedAt: "2026-11-18",
  },
];

export function getTool(slug: string): ToolInfo | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}
