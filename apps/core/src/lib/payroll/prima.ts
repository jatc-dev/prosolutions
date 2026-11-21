import { paramsFor } from "./params";
import { days360, parseIsoDate } from "./settlement";

/**
 * Prima de servicios (art. 306 CST, modificado por la Ley 1788 de 2016):
 * 30 días de salario por año, pagados en dos cuotas por semestre —a más
 * tardar el 30 de junio y el 20 de diciembre— y proporcionales a los días
 * trabajados en el semestre (calendario comercial de 360 días).
 * Base: salario (promedio si es variable) + auxilio de transporte cuando el
 * salario no supera 2 SMMLV. El salario integral ya incluye la prima.
 */
export type PrimaSemester = 1 | 2;

export interface PrimaInput {
  year?: number;
  semester: PrimaSemester;
  monthlySalary: number;
  /** Average variable pay in the semester (overtime, commissions). */
  variableMonthly?: number;
  /** Start date if the job began during the semester (ISO). */
  startDate?: string;
  /** End date if the job ended during the semester (ISO). */
  endDate?: string;
  /** Unpaid leave or suspension days in the semester (they do not count). */
  unpaidDays?: number;
  integralSalary?: boolean;
}

export interface PrimaResult {
  semester: PrimaSemester;
  year: number;
  /** First and last day counted. */
  from: string;
  to: string;
  daysWorked: number;
  base: { salary: number; transportAllowance: number; total: number };
  amount: number;
  /** Legal payment deadline of this installment. */
  deadline: string;
  integral: boolean;
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

export function semesterBounds(year: number, semester: PrimaSemester): { start: Date; end: Date } {
  return semester === 1
    ? { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 5, 30)) }
    : { start: new Date(Date.UTC(year, 6, 1)), end: new Date(Date.UTC(year, 11, 30)) };
}

/** Semester that contains the given date (1 = January–June). */
export function currentSemester(date = new Date()): PrimaSemester {
  return date.getMonth() < 6 ? 1 : 2;
}

export function calculatePrima(input: PrimaInput): PrimaResult {
  const params = paramsFor(input.year);
  const year = params.year;
  const bounds = semesterBounds(year, input.semester);

  const start = input.startDate ? parseIsoDate(input.startDate) : null;
  const end = input.endDate ? parseIsoDate(input.endDate) : null;
  if (input.startDate && !start) throw new Error("La fecha de ingreso no es válida.");
  if (input.endDate && !end) throw new Error("La fecha de retiro no es válida.");

  const from = start && start > bounds.start ? start : bounds.start;
  // The semester closes on day 30 of the commercial calendar (June 30 / Dec 30).
  const to = end && end < bounds.end ? end : bounds.end;
  if (start && start > bounds.end) throw new Error("La fecha de ingreso es posterior a este semestre.");
  if (end && end < bounds.start) throw new Error("La fecha de retiro es anterior a este semestre.");
  if (to < from) throw new Error("La fecha de retiro debe ser posterior a la de ingreso.");

  const integral = Boolean(input.integralSalary);
  const salary = Math.max(0, input.monthlySalary) + Math.max(0, input.variableMonthly ?? 0);
  const transportAllowance = !integral && salary <= 2 * params.smmlv ? params.transportAllowance : 0;
  const base = integral ? 0 : salary + transportAllowance;
  const daysWorked = Math.max(0, Math.min(180, days360(from, to)) - Math.max(0, Math.floor(input.unpaidDays ?? 0)));

  return {
    semester: input.semester,
    year,
    from: iso(from),
    to: iso(to),
    daysWorked,
    base: { salary, transportAllowance, total: base },
    amount: Math.round((base * daysWorked) / 360),
    deadline: input.semester === 1 ? `${year}-06-30` : `${year}-12-20`,
    integral,
  };
}
