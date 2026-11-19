import { SEVERANCE_INTEREST_RATE, paramsFor } from "./params";

/**
 * Commercial day count used by Colombian payroll (every month has 30 days,
 * both start and end dates included): 2026-01-01..2026-12-31 = 360 days.
 */
export function days360(start: Date, end: Date): number {
  if (end < start) return 0;
  const d1 = Math.min(start.getUTCDate(), 30);
  const d2 = Math.min(end.getUTCDate(), 30);
  const lastDayOfFeb = (date: Date) =>
    date.getUTCMonth() === 1 && new Date(Date.UTC(date.getUTCFullYear(), 2, 0)).getUTCDate() === date.getUTCDate();
  const endDay = lastDayOfFeb(end) ? 30 : d2;
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 360 + (end.getUTCMonth() - start.getUTCMonth()) * 30 + (endDay - d1) + 1;
}

export function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export type ContractType = "indefinido" | "fijo" | "obra";
export type TerminationReason = "renuncia" | "justa-causa" | "sin-justa-causa" | "fin-contrato";

export interface SettlementInput {
  startDate: string;
  endDate: string;
  monthlySalary: number;
  /** Average variable salary (overtime, commissions) to add to the base. */
  variableMonthly?: number;
  contractType: ContractType;
  reason: TerminationReason;
  /** Vacation days already taken during the employment. */
  vacationDaysTaken?: number;
  /** Fixed-term / project end date (needed for indemnity of fijo/obra). */
  agreedEndDate?: string;
  /** Severance already paid or consigned this year? Count only the current year. */
  severancePaidUntil?: string;
  integralSalary?: boolean;
  year?: number;
}

export interface SettlementResult {
  daysWorked: number;
  base: { salary: number; transportAllowance: number; prestacionesBase: number };
  severance: { days: number; amount: number };
  severanceInterest: { amount: number };
  prima: { days: number; amount: number };
  vacation: { daysOwed: number; amount: number };
  indemnity: { applies: boolean; days: number; amount: number; explanation: string };
  total: number;
}

const round = (value: number) => Math.round(value);

/** Start of the current half-year (prima periods: Jan-Jun, Jul-Dec). */
function semesterStart(end: Date): Date {
  return new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() < 6 ? 0 : 6, 1));
}

function laterOf(a: Date, b: Date): Date {
  return a > b ? a : b;
}

export function calculateSettlement(input: SettlementInput): SettlementResult {
  const params = paramsFor(input.year);
  const start = parseIsoDate(input.startDate);
  const end = parseIsoDate(input.endDate);
  if (!start || !end || end < start) throw new Error("Fechas inválidas: la fecha de retiro debe ser posterior a la de ingreso.");

  const salary = Math.max(0, input.monthlySalary);
  const variable = Math.max(0, input.variableMonthly ?? 0);
  const integral = Boolean(input.integralSalary);
  const transportAllowance = !integral && salary + variable <= 2 * params.smmlv ? params.transportAllowance : 0;
  const prestacionesBase = integral ? 0 : salary + variable + transportAllowance;
  const daysWorked = days360(start, end);

  // Cesantías and interest: only the unpaid period (default: current calendar year).
  const severanceFrom = input.severancePaidUntil
    ? new Date((parseIsoDate(input.severancePaidUntil) ?? start).getTime() + 86_400_000)
    : laterOf(start, new Date(Date.UTC(end.getUTCFullYear(), 0, 1)));
  const severanceDays = days360(laterOf(start, severanceFrom), end);
  const severance = round((prestacionesBase * severanceDays) / 360);
  const severanceInterest = round((severance * severanceDays * SEVERANCE_INTEREST_RATE) / 360);

  const primaDays = days360(laterOf(start, semesterStart(end)), end);
  const prima = round((prestacionesBase * primaDays) / 360);

  // 15 working days of paid vacation per 360 days worked (CST art. 186).
  const earnedVacation = (daysWorked * 15) / 360;
  const daysOwed = Math.max(0, earnedVacation - Math.max(0, input.vacationDaysTaken ?? 0));
  const vacation = round(((salary + variable) / 30) * daysOwed);

  const indemnity = calculateIndemnity({
    contractType: input.contractType,
    reason: input.reason,
    daysWorked,
    monthlySalary: salary + variable,
    smmlv: params.smmlv,
    end,
    agreedEnd: input.agreedEndDate ? parseIsoDate(input.agreedEndDate) : null,
  });

  return {
    daysWorked,
    base: { salary: salary + variable, transportAllowance, prestacionesBase },
    severance: { days: severanceDays, amount: severance },
    severanceInterest: { amount: severanceInterest },
    prima: { days: primaDays, amount: prima },
    vacation: { daysOwed: Math.round(daysOwed * 100) / 100, amount: vacation },
    indemnity,
    total: severance + severanceInterest + prima + vacation + indemnity.amount,
  };
}

/** Indemnity for dismissal without just cause (CST art. 64). */
export function calculateIndemnity(input: {
  contractType: ContractType;
  reason: TerminationReason;
  daysWorked: number;
  monthlySalary: number;
  smmlv: number;
  end: Date;
  agreedEnd: Date | null;
}): SettlementResult["indemnity"] {
  const daily = input.monthlySalary / 30;
  if (input.reason !== "sin-justa-causa") {
    return { applies: false, days: 0, amount: 0, explanation: "Solo hay indemnización cuando el empleador termina el contrato sin justa causa." };
  }
  if (input.contractType === "indefinido") {
    const high = input.monthlySalary >= 10 * input.smmlv;
    const firstYear = high ? 20 : 30;
    const perExtraYear = high ? 15 : 20;
    const extraYears = Math.max(0, input.daysWorked - 360) / 360;
    const days = input.daysWorked <= 360 ? firstYear : firstYear + perExtraYear * extraYears;
    return {
      applies: true,
      days: Math.round(days * 100) / 100,
      amount: Math.round(daily * days),
      explanation: high
        ? "Contrato indefinido con salario de 10 SMMLV o más: 20 días por el primer año y 15 días por cada año adicional (proporcional)."
        : "Contrato indefinido con salario inferior a 10 SMMLV: 30 días por el primer año y 20 días por cada año adicional (proporcional).",
    };
  }
  if (!input.agreedEnd || input.agreedEnd <= input.end) {
    return { applies: true, days: 0, amount: 0, explanation: "Indica la fecha de terminación pactada para calcular el tiempo faltante." };
  }
  const remaining = days360(new Date(input.end.getTime() + 86_400_000), input.agreedEnd);
  const days = input.contractType === "obra" ? Math.max(15, remaining) : remaining;
  return {
    applies: true,
    days,
    amount: Math.round(daily * days),
    explanation:
      input.contractType === "fijo"
        ? "Contrato a término fijo: salarios del tiempo que faltaba para cumplir el plazo pactado."
        : "Contrato por obra o labor: salarios del tiempo faltante para terminar la obra, mínimo 15 días.",
  };
}
