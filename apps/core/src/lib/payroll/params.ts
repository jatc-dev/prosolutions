/**
 * Colombian payroll parameters by year. Every calculator reads these values;
 * nothing is hard-coded in components. Update once a year when the
 * Government publishes the decrees (SMMLV, auxilio de transporte) and DIAN the
 * UVT resolution, and keep `sources` pointing to the official documents.
 */
export interface PayrollParams {
  year: number;
  /** Salario mínimo mensual legal vigente. */
  smmlv: number;
  /** Auxilio de transporte (salaries up to 2 SMMLV). */
  transportAllowance: number;
  /** Unidad de Valor Tributario. */
  uvt: number;
  /** Date the parameters were last reviewed (ISO). */
  reviewedAt: string;
  sources: string[];
}

export const PAYROLL_PARAMS: Record<number, PayrollParams> = {
  2026: {
    year: 2026,
    smmlv: 1_750_905,
    transportAllowance: 249_095,
    uvt: 52_374,
    reviewedAt: "2026-11-18",
    sources: [
      "Decreto del Gobierno Nacional que fija el salario mínimo y el auxilio de transporte para 2026",
      "Resolución DIAN que fija el valor de la UVT para 2026",
      "Código Sustantivo del Trabajo (arts. 64, 186, 249, 306) y Ley 52 de 1975",
      "Ley 100 de 1993, Ley 797 de 2003 y Estatuto Tributario (arts. 206, 383, 387)",
    ],
  },
};

export const CURRENT_YEAR = 2026;

export function paramsFor(year = CURRENT_YEAR): PayrollParams {
  const params = PAYROLL_PARAMS[year];
  if (!params) throw new Error(`No payroll parameters for ${year}`);
  return params;
}

/** Employee social security rates (Ley 100 de 1993). */
export const EMPLOYEE_HEALTH_RATE = 0.04;
export const EMPLOYEE_PENSION_RATE = 0.04;

/** Employer rates. */
export const EMPLOYER_HEALTH_RATE = 0.085;
export const EMPLOYER_PENSION_RATE = 0.12;
export const COMPENSATION_FUND_RATE = 0.04;
export const ICBF_RATE = 0.03;
export const SENA_RATE = 0.02;

/** ARL by occupational risk class (Decreto 1772 de 1994, minimum rate per class). */
export const ARL_RATES = { I: 0.00522, II: 0.01044, III: 0.02436, IV: 0.0435, V: 0.0696 } as const;
export type RiskClass = keyof typeof ARL_RATES;

/** Independent workers contribute on 40% of monthly income (Ley 1955 de 2019, art. 244). */
export const INDEPENDENT_IBC_SHARE = 0.4;
export const INDEPENDENT_HEALTH_RATE = 0.125;
export const INDEPENDENT_PENSION_RATE = 0.16;

/** Interest on severance: 12% per year (Ley 52 de 1975). */
export const SEVERANCE_INTEREST_RATE = 0.12;
