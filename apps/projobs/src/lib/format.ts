import type {
  ApplicationStage,
  EmploymentType,
  JobStatus,
  Salary,
  Seniority,
  Workplace,
} from "../../server/src/contracts";

export const WORKPLACE_LABEL: Record<Workplace, string> = { remote: "Remoto", hybrid: "Híbrido", onsite: "Presencial" };

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  full_time: "Tiempo completo",
  part_time: "Medio tiempo",
  contract: "Contrato",
  internship: "Pasantía",
  temporary: "Temporal",
};

export const SENIORITY_LABEL: Record<Seniority, string> = {
  intern: "Practicante",
  junior: "Junior",
  mid: "Semi senior",
  senior: "Senior",
  lead: "Lead",
  executive: "Directivo",
};

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  applied: "Postulado",
  screening: "Revisión",
  interview: "Entrevista",
  offer: "Oferta",
  hired: "Contratado",
  rejected: "No seleccionado",
  withdrawn: "Retirada",
};

export const STATUS_LABEL: Record<JobStatus, string> = { draft: "Borrador", published: "Publicada", closed: "Cerrada" };

const PERIOD_LABEL: Record<Salary["period"], string> = { year: "año", month: "mes", hour: "hora" };

const compactAmount = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const plainAmount = new Intl.NumberFormat("es", { maximumFractionDigits: 0, useGrouping: true });

/** "12 M" for millions (COP/CLP-scale salaries), "3.500" otherwise; currency code appended once. */
function amount(value: number): string {
  return value >= 1_000_000 ? compactAmount.format(value) : plainAmount.format(value);
}

export function formatSalary(salary: Salary | null): string | null {
  if (!salary) return null;
  const { min, max, currency, period } = salary;
  const range =
    min != null && max != null && min !== max ? `${amount(min)} – ${amount(max)}` : amount((min ?? max)!);
  return `${range} ${currency} / ${PERIOD_LABEL[period]}`;
}

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "justo ahora";
}

let countryNames: Intl.DisplayNames | null = null;
export function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    countryNames ??= new Intl.DisplayNames(["es"], { type: "region" });
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function formatLocation(location: { city: string | null; country: string | null }, workplace: Workplace): string {
  const place = [location.city, countryName(location.country)].filter(Boolean).join(", ");
  if (workplace === "remote") return place ? `Remoto · ${countryName(location.country)}` : "Remoto";
  return place || WORKPLACE_LABEL[workplace];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}
