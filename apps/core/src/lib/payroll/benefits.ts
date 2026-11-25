import { SEVERANCE_INTEREST_RATE, paramsFor } from "./params";
import { days360, parseIsoDate } from "./settlement";

const iso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Cesantías (art. 249 CST) and their interest (Ley 52 de 1975) for one
 * calendar year: one month of salary per year worked, proportional, on the
 * salary + variable pay + transport allowance (up to 2 SMMLV). Interest is 12 %
 * a year on the cesantías. Deadlines: interest paid to the worker by January 31
 * and cesantías deposited in the fund by February 14 of the following year.
 * Integral salary already includes them.
 */
export interface SeveranceInput {
  year?: number;
  monthlySalary: number;
  variableMonthly?: number;
  startDate?: string;
  endDate?: string;
  unpaidDays?: number;
  integralSalary?: boolean;
}

export interface SeveranceResult {
  year: number;
  from: string;
  to: string;
  daysWorked: number;
  base: { salary: number; transportAllowance: number; total: number };
  severance: number;
  interest: number;
  interestDeadline: string;
  depositDeadline: string;
  integral: boolean;
}

export function calculateSeverance(input: SeveranceInput): SeveranceResult {
  const params = paramsFor(input.year);
  const year = params.year;
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 30));
  const start = input.startDate ? parseIsoDate(input.startDate) : null;
  const end = input.endDate ? parseIsoDate(input.endDate) : null;
  if (input.startDate && !start) throw new Error("La fecha de ingreso no es válida.");
  if (input.endDate && !end) throw new Error("La fecha de retiro no es válida.");
  if (start && start > yearEnd) throw new Error(`La fecha de ingreso es posterior a ${year}.`);
  if (end && end < yearStart) throw new Error(`La fecha de retiro es anterior a ${year}.`);
  const from = start && start > yearStart ? start : yearStart;
  const to = end && end < yearEnd ? end : yearEnd;
  if (to < from) throw new Error("La fecha de retiro debe ser posterior a la de ingreso.");

  const integral = Boolean(input.integralSalary);
  const salary = Math.max(0, input.monthlySalary) + Math.max(0, input.variableMonthly ?? 0);
  const transportAllowance = !integral && salary <= 2 * params.smmlv ? params.transportAllowance : 0;
  const base = integral ? 0 : salary + transportAllowance;
  const daysWorked = Math.max(0, Math.min(360, days360(from, to)) - Math.max(0, Math.floor(input.unpaidDays ?? 0)));
  const severance = Math.round((base * daysWorked) / 360);
  const interest = Math.round((severance * daysWorked * SEVERANCE_INTEREST_RATE) / 360);
  return {
    year,
    from: iso(from),
    to: iso(to),
    daysWorked,
    base: { salary, transportAllowance, total: base },
    severance,
    interest,
    interestDeadline: `${year + 1}-01-31`,
    depositDeadline: `${year + 1}-02-14`,
    integral,
  };
}

/**
 * Vacaciones (art. 186 CST): 15 business days of paid rest per year worked,
 * proportional. Their value uses the ordinary salary without transport
 * allowance (average of the last year when it is variable).
 */
export interface VacationInput {
  startDate: string;
  /** Cut-off date (today, or the end of the contract). */
  cutoffDate: string;
  monthlySalary: number;
  variableMonthly?: number;
  daysTaken?: number;
  unpaidDays?: number;
}

export interface VacationResult {
  daysWorked: number;
  daysEarned: number;
  daysTaken: number;
  daysPending: number;
  dailySalary: number;
  value: number;
}

export function calculateVacation(input: VacationInput): VacationResult {
  const start = parseIsoDate(input.startDate);
  const cutoff = parseIsoDate(input.cutoffDate);
  if (!start || !cutoff) throw new Error("Revisa las fechas.");
  if (cutoff < start) throw new Error("La fecha de corte debe ser posterior a la de ingreso.");
  const daysWorked = Math.max(0, days360(start, cutoff) - Math.max(0, Math.floor(input.unpaidDays ?? 0)));
  const daysEarned = Math.round(((daysWorked * 15) / 360) * 100) / 100;
  const daysTaken = Math.max(0, input.daysTaken ?? 0);
  const daysPending = Math.max(0, Math.round((daysEarned - daysTaken) * 100) / 100);
  const dailySalary = (Math.max(0, input.monthlySalary) + Math.max(0, input.variableMonthly ?? 0)) / 30;
  return { daysWorked, daysEarned, daysTaken, daysPending, dailySalary: Math.round(dailySalary), value: Math.round(dailySalary * daysPending) };
}
