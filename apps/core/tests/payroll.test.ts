import { describe, expect, it } from "vitest";
import { compareEmploymentVsServices } from "../src/lib/payroll/ops";
import { paramsFor } from "../src/lib/payroll/params";
import { calculateEmployerCost, calculateNetSalary, solidarityFundRate, withholdingUvt } from "../src/lib/payroll/salary";
import { calculateIndemnity, calculateSettlement, days360 } from "../src/lib/payroll/settlement";

const P = paramsFor(2026);
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("net salary (Colombia)", () => {
  it("adds transport allowance up to 2 SMMLV and deducts 4% health + 4% pension", () => {
    const result = calculateNetSalary({ monthlySalary: 3_000_000 });
    expect(result.transportAllowance).toBe(P.transportAllowance);
    expect(result.health).toBe(120_000);
    expect(result.pension).toBe(120_000);
    expect(result.solidarityFund).toBe(0);
    expect(result.withholding.withholding).toBe(0);
    expect(result.netPay).toBe(3_000_000 + P.transportAllowance - 240_000);
  });

  it("applies the solidarity fund from 4 SMMLV and estimates withholding with the art. 383 table", () => {
    const result = calculateNetSalary({ monthlySalary: 10_000_000 });
    expect(result.transportAllowance).toBe(0);
    expect(result.solidarityFundRate).toBe(0.01);
    expect(result.solidarityFund).toBe(100_000);
    // Net income 9.1M, 25% exempt (2.275M) -> taxable 6.825M.
    expect(result.withholding.taxableBase).toBe(6_825_000);
    const expected = Math.round((withholdingUvt(6_825_000 / P.uvt) * P.uvt) / 1000) * 1000;
    expect(result.withholding.withholding).toBe(expected);
    expect(result.withholding.withholding).toBeGreaterThan(0);
  });

  it("uses 70% as contribution base for integral salary", () => {
    const result = calculateNetSalary({ monthlySalary: 30_000_000, integralSalary: true });
    expect(result.contributionBase).toBe(21_000_000);
    expect(result.transportAllowance).toBe(0);
  });

  it("follows the solidarity fund brackets", () => {
    expect(solidarityFundRate(3.99 * P.smmlv, P.smmlv)).toBe(0);
    expect(solidarityFundRate(4 * P.smmlv, P.smmlv)).toBe(0.01);
    expect(solidarityFundRate(16.5 * P.smmlv, P.smmlv)).toBe(0.012);
    expect(solidarityFundRate(25 * P.smmlv, P.smmlv)).toBe(0.02);
  });

  it("matches the withholding table boundaries", () => {
    expect(withholdingUvt(95)).toBe(0);
    expect(withholdingUvt(150)).toBeCloseTo(10.45);
    expect(withholdingUvt(360)).toBeCloseTo(68.8);
    expect(withholdingUvt(2400)).toBeCloseTo(809);
  });
});

describe("employer cost", () => {
  it("includes prestaciones provisions and the art. 114-1 exemption under 10 SMMLV", () => {
    const result = calculateEmployerCost({ monthlySalary: 2_000_000, riskClass: "I" });
    expect(result.contributions.health).toBe(0);
    expect(result.contributions.sena).toBe(0);
    expect(result.contributions.pension).toBe(240_000);
    expect(result.contributions.compensationFund).toBe(80_000);
    expect(result.provisions.prima).toBe(Math.round((2_000_000 + P.transportAllowance) / 12));
    expect(result.provisions.vacation).toBe(Math.round(2_000_000 / 24));
    expect(result.totalMonthlyCost).toBeGreaterThan(2_000_000 * 1.4);
  });

  it("charges health, SENA and ICBF when the exemption does not apply", () => {
    const result = calculateEmployerCost({ monthlySalary: 2_000_000, exempt114_1: false });
    expect(result.contributions.health).toBe(170_000);
    expect(result.contributions.icbf).toBe(60_000);
    expect(result.contributions.sena).toBe(40_000);
  });
});

describe("settlement (liquidación)", () => {
  it("counts days with the 360-day commercial calendar", () => {
    expect(days360(d("2026-01-01"), d("2026-12-31"))).toBe(360);
    expect(days360(d("2026-01-15"), d("2026-01-31"))).toBe(16);
    expect(days360(d("2026-02-01"), d("2026-02-28"))).toBe(30);
    expect(days360(d("2026-03-10"), d("2026-03-01"))).toBe(0);
  });

  it("liquidates one full year of an indefinite contract ended without just cause", () => {
    const result = calculateSettlement({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      monthlySalary: 2_000_000,
      contractType: "indefinido",
      reason: "sin-justa-causa",
    });
    const base = 2_000_000 + P.transportAllowance;
    expect(result.daysWorked).toBe(360);
    expect(result.severance.amount).toBe(base);
    expect(result.severanceInterest.amount).toBe(Math.round(base * 0.12));
    expect(result.prima.days).toBe(180);
    expect(result.prima.amount).toBe(Math.round(base / 2));
    expect(result.vacation.amount).toBe(1_000_000);
    expect(result.indemnity.days).toBe(30);
    expect(result.indemnity.amount).toBe(2_000_000);
    expect(result.total).toBe(
      result.severance.amount + result.severanceInterest.amount + result.prima.amount + result.vacation.amount + 2_000_000,
    );
  });

  it("pays no indemnity on resignation and subtracts vacation already taken", () => {
    const result = calculateSettlement({
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      monthlySalary: 2_000_000,
      contractType: "indefinido",
      reason: "renuncia",
      vacationDaysTaken: 5,
    });
    expect(result.indemnity.applies).toBe(false);
    expect(result.vacation.daysOwed).toBe(2.5);
  });

  it("computes art. 64 indemnity for longer and fixed-term contracts", () => {
    const base = { reason: "sin-justa-causa" as const, monthlySalary: 3_000_000, smmlv: P.smmlv, end: d("2026-06-30") };
    expect(calculateIndemnity({ ...base, contractType: "indefinido", daysWorked: 720, agreedEnd: null }).days).toBe(50);
    const high = calculateIndemnity({ ...base, contractType: "indefinido", monthlySalary: 20_000_000, daysWorked: 720, agreedEnd: null });
    expect(high.days).toBe(35);
    const fixed = calculateIndemnity({ ...base, contractType: "fijo", daysWorked: 180, agreedEnd: d("2026-12-31") });
    expect(fixed.days).toBe(180);
    expect(fixed.amount).toBe(18_000_000);
    const obra = calculateIndemnity({ ...base, contractType: "obra", daysWorked: 100, agreedEnd: d("2026-07-05") });
    expect(obra.days).toBe(15);
  });

  it("rejects inverted dates", () => {
    expect(() => calculateSettlement({ startDate: "2026-05-01", endDate: "2026-01-01", monthlySalary: 1, contractType: "indefinido", reason: "renuncia" })).toThrow();
  });
});

describe("employment vs. service contract", () => {
  it("values prestaciones and finds the equivalent fee", () => {
    const result = compareEmploymentVsServices({ salary: 3_000_000, fee: 3_000_000 });
    expect(result.services.contributionBase).toBe(P.smmlv); // 40% of 3M is below 1 SMMLV
    expect(result.services.health).toBe(Math.round(P.smmlv * 0.125));
    expect(result.difference).toBeLessThan(0);
    expect(result.equivalentFee).toBeGreaterThan(3_000_000);
    const check = compareEmploymentVsServices({ salary: 3_000_000, fee: result.equivalentFee });
    expect(check.services.netMonthly).toBeGreaterThanOrEqual(result.employment.totalMonthlyValue);
  });
});
