import {
  ARL_RATES,
  INDEPENDENT_HEALTH_RATE,
  INDEPENDENT_IBC_SHARE,
  INDEPENDENT_PENSION_RATE,
  SEVERANCE_INTEREST_RATE,
  paramsFor,
  type RiskClass,
} from "./params";
import { calculateNetSalary, estimateWithholding, solidarityFundRate } from "./salary";

/**
 * Employment contract vs. service contract (prestación de servicios, OPS),
 * compared on a monthly basis. Prestaciones of the employment contract are
 * valued monthly so both options are comparable.
 */
export interface OpsComparisonInput {
  /** Monthly salary offered under an employment contract. */
  salary: number;
  /** Monthly fee offered under a service contract. */
  fee: number;
  riskClass?: RiskClass;
  /** Withholding on fees applied by the hiring entity, as a rate (e.g. 0.10 or 0.11). */
  feeWithholdingRate?: number;
  year?: number;
}

export interface OpsComparisonResult {
  employment: {
    netMonthly: number;
    prestacionesMonthly: number;
    vacationMonthly: number;
    totalMonthlyValue: number;
    annualValue: number;
  };
  services: {
    contributionBase: number;
    health: number;
    pension: number;
    solidarityFund: number;
    arl: number;
    withholding: number;
    netMonthly: number;
    annualValue: number;
  };
  /** Fee needed under OPS to match the employment contract's total value. */
  equivalentFee: number;
  difference: number;
}

export function compareEmploymentVsServices(input: OpsComparisonInput): OpsComparisonResult {
  const params = paramsFor(input.year);
  const employment = calculateNetSalary({ monthlySalary: input.salary, year: input.year });
  const prestacionesBase = input.salary + employment.transportAllowance;
  const prima = prestacionesBase / 12;
  const severance = prestacionesBase / 12;
  const severanceInterest = severance * SEVERANCE_INTEREST_RATE;
  const vacationMonthly = input.salary / 24;
  const prestacionesMonthly = Math.round(prima + severance + severanceInterest);
  const employmentTotal = employment.netPay + prestacionesMonthly + Math.round(vacationMonthly);

  const services = servicesNet(input.fee, input.riskClass ?? "I", input.feeWithholdingRate ?? 0, params.smmlv, params.uvt);

  // Smallest fee whose net equals the employment total (binary search, monotonic).
  let low = 0;
  let high = Math.max(employmentTotal * 3, params.smmlv * 3);
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (servicesNet(mid, input.riskClass ?? "I", input.feeWithholdingRate ?? 0, params.smmlv, params.uvt).netMonthly < employmentTotal) low = mid;
    else high = mid;
  }

  return {
    employment: {
      netMonthly: employment.netPay,
      prestacionesMonthly,
      vacationMonthly: Math.round(vacationMonthly),
      totalMonthlyValue: employmentTotal,
      annualValue: employmentTotal * 12,
    },
    services: { ...services, annualValue: services.netMonthly * 12 },
    equivalentFee: Math.ceil(high / 1000) * 1000,
    difference: services.netMonthly - employmentTotal,
  };
}

function servicesNet(fee: number, riskClass: RiskClass, withholdingRate: number, smmlv: number, uvt: number) {
  const gross = Math.max(0, fee);
  const contributionBase = gross > 0 ? Math.max(smmlv, gross * INDEPENDENT_IBC_SHARE) : 0;
  const health = Math.round(contributionBase * INDEPENDENT_HEALTH_RATE);
  const pension = Math.round(contributionBase * INDEPENDENT_PENSION_RATE);
  const solidarityFund = Math.round(contributionBase * solidarityFundRate(contributionBase, smmlv));
  const arl = Math.round(contributionBase * ARL_RATES[riskClass]);
  const withholding =
    withholdingRate > 0
      ? Math.round(gross * withholdingRate)
      : estimateWithholding({ laborIncome: gross, mandatoryContributions: health + pension + solidarityFund, uvt }).withholding;
  const netMonthly = gross - health - pension - solidarityFund - arl - withholding;
  return { contributionBase, health, pension, solidarityFund, arl, withholding, netMonthly };
}
