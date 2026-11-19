import {
  ARL_RATES,
  COMPENSATION_FUND_RATE,
  EMPLOYEE_HEALTH_RATE,
  EMPLOYEE_PENSION_RATE,
  EMPLOYER_HEALTH_RATE,
  EMPLOYER_PENSION_RATE,
  ICBF_RATE,
  SENA_RATE,
  SEVERANCE_INTEREST_RATE,
  paramsFor,
  type RiskClass,
} from "./params";

/** Fondo de Solidaridad Pensional (Ley 797 de 2003, art. 8) on the contribution base. */
export function solidarityFundRate(base: number, smmlv: number): number {
  const times = base / smmlv;
  if (times < 4) return 0;
  if (times < 16) return 0.01;
  if (times < 17) return 0.012;
  if (times < 18) return 0.014;
  if (times < 19) return 0.016;
  if (times < 20) return 0.018;
  return 0.02;
}

/**
 * Monthly withholding table (Estatuto Tributario art. 383), in UVT.
 * Returns the withholding in UVT for a taxable base expressed in UVT.
 */
export function withholdingUvt(baseUvt: number): number {
  if (baseUvt <= 95) return 0;
  if (baseUvt <= 150) return (baseUvt - 95) * 0.19;
  if (baseUvt <= 360) return (baseUvt - 150) * 0.28 + 10;
  if (baseUvt <= 640) return (baseUvt - 360) * 0.33 + 69;
  if (baseUvt <= 945) return (baseUvt - 640) * 0.35 + 162;
  if (baseUvt <= 2300) return (baseUvt - 945) * 0.37 + 268;
  return (baseUvt - 2300) * 0.39 + 770;
}

/** Withholding is rounded to the nearest thousand pesos (DIAN practice). */
const roundThousands = (value: number) => Math.round(value / 1000) * 1000;

export interface WithholdingBreakdown {
  /** Labor income minus mandatory contributions (ingresos no constitutivos de renta). */
  netIncome: number;
  /** 25% exempt labor income, capped at 790 UVT/year (ET art. 206 num. 10). */
  exemptIncome: number;
  taxableBase: number;
  withholding: number;
}

/**
 * Procedure-1 estimate for a salaried employee without additional
 * deductions (dependants, prepaid health, mortgage interest, voluntary
 * pension). Real withholding can be lower if the employee reports them.
 */
export function estimateWithholding(input: { laborIncome: number; mandatoryContributions: number; uvt: number }): WithholdingBreakdown {
  const netIncome = Math.max(0, input.laborIncome - input.mandatoryContributions);
  const exemptCap = (790 * input.uvt) / 12;
  const exemptIncome = Math.min(netIncome * 0.25, exemptCap);
  // Global cap: exemptions + deductions <= 40% of net income and 1,340 UVT/year.
  const globalCap = Math.min(netIncome * 0.4, (1340 * input.uvt) / 12);
  const allowed = Math.min(exemptIncome, globalCap);
  const taxableBase = Math.max(0, netIncome - allowed);
  const withholding = roundThousands(withholdingUvt(taxableBase / input.uvt) * input.uvt);
  return { netIncome, exemptIncome: allowed, taxableBase, withholding };
}

export interface NetSalaryInput {
  monthlySalary: number;
  /** Salario integral: contributions on 70% of the salary, no transport allowance or prestaciones. */
  integralSalary?: boolean;
  /** Other monthly salary-type income (bonuses, overtime). */
  otherSalaryIncome?: number;
  year?: number;
}

export interface NetSalaryResult {
  params: { smmlv: number; transportAllowance: number; uvt: number; year: number };
  grossSalary: number;
  transportAllowance: number;
  contributionBase: number;
  health: number;
  pension: number;
  solidarityFund: number;
  solidarityFundRate: number;
  withholding: WithholdingBreakdown;
  totalDeductions: number;
  netPay: number;
}

export function calculateNetSalary(input: NetSalaryInput): NetSalaryResult {
  const params = paramsFor(input.year);
  const salary = Math.max(0, input.monthlySalary);
  const other = Math.max(0, input.otherSalaryIncome ?? 0);
  const gross = salary + other;
  const integral = Boolean(input.integralSalary);
  // Contribution base: 70% for integral salary; never below 1 SMMLV.
  const contributionBase = gross > 0 ? Math.max(params.smmlv, integral ? gross * 0.7 : gross) : 0;
  const transportAllowance = !integral && gross > 0 && gross <= 2 * params.smmlv ? params.transportAllowance : 0;
  const health = Math.round(contributionBase * EMPLOYEE_HEALTH_RATE);
  const pension = Math.round(contributionBase * EMPLOYEE_PENSION_RATE);
  const fspRate = solidarityFundRate(contributionBase, params.smmlv);
  const solidarityFund = Math.round(contributionBase * fspRate);
  const withholding = estimateWithholding({
    laborIncome: gross,
    mandatoryContributions: health + pension + solidarityFund,
    uvt: params.uvt,
  });
  const totalDeductions = health + pension + solidarityFund + withholding.withholding;
  return {
    params: { smmlv: params.smmlv, transportAllowance: params.transportAllowance, uvt: params.uvt, year: params.year },
    grossSalary: gross,
    transportAllowance,
    contributionBase,
    health,
    pension,
    solidarityFund,
    solidarityFundRate: fspRate,
    withholding,
    totalDeductions,
    netPay: gross + transportAllowance - totalDeductions,
  };
}

export interface EmployerCostInput {
  monthlySalary: number;
  riskClass?: RiskClass;
  /**
   * Employers that file income tax are exempt from health (8.5%), SENA and
   * ICBF for workers earning under 10 SMMLV (ET art. 114-1).
   */
  exempt114_1?: boolean;
  integralSalary?: boolean;
  year?: number;
}

export interface EmployerCostResult {
  salary: number;
  transportAllowance: number;
  contributions: { health: number; pension: number; arl: number; compensationFund: number; icbf: number; sena: number };
  /** Monthly provisions for prima, cesantías, intereses and vacaciones. */
  provisions: { prima: number; severance: number; severanceInterest: number; vacation: number };
  totalMonthlyCost: number;
  totalAnnualCost: number;
}

export function calculateEmployerCost(input: EmployerCostInput): EmployerCostResult {
  const params = paramsFor(input.year);
  const salary = Math.max(0, input.monthlySalary);
  const integral = Boolean(input.integralSalary);
  const base = salary > 0 ? Math.max(params.smmlv, integral ? salary * 0.7 : salary) : 0;
  const transportAllowance = !integral && salary > 0 && salary <= 2 * params.smmlv ? params.transportAllowance : 0;
  const exempt = input.exempt114_1 !== false && base < 10 * params.smmlv;
  const contributions = {
    health: exempt ? 0 : Math.round(base * EMPLOYER_HEALTH_RATE),
    pension: Math.round(base * EMPLOYER_PENSION_RATE),
    arl: Math.round(base * ARL_RATES[input.riskClass ?? "I"]),
    compensationFund: Math.round(base * COMPENSATION_FUND_RATE),
    icbf: exempt ? 0 : Math.round(base * ICBF_RATE),
    sena: exempt ? 0 : Math.round(base * SENA_RATE),
  };
  // Integral salary already includes the prestaciones factor (CST art. 132).
  const prestacionesBase = integral ? 0 : salary + transportAllowance;
  const provisions = {
    prima: Math.round(prestacionesBase / 12),
    severance: Math.round(prestacionesBase / 12),
    severanceInterest: Math.round((prestacionesBase / 12) * SEVERANCE_INTEREST_RATE),
    vacation: Math.round(salary / 24),
  };
  const totalMonthlyCost =
    salary +
    transportAllowance +
    Object.values(contributions).reduce((sum, value) => sum + value, 0) +
    Object.values(provisions).reduce((sum, value) => sum + value, 0);
  return { salary, transportAllowance, contributions, provisions, totalMonthlyCost, totalAnnualCost: totalMonthlyCost * 12 };
}
