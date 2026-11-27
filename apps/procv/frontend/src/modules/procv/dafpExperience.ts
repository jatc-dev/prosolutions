/**
 * Work experience in the Colombian public-sector form (Formato Único de Hoja
 * de Vida, Función Pública): the sector of each job and the "tiempo total de
 * experiencia" summary, computed from the job dates.
 */

export type DafpSector = "public" | "private" | "independent";

export const DAFP_SECTORS: Array<{ value: DafpSector; label: string }> = [
  { value: "public", label: "Pública" },
  { value: "private", label: "Privada" },
  { value: "independent", label: "Trabajador independiente" },
];

const isSector = (value: unknown): value is DafpSector => value === "public" || value === "private" || value === "independent";

/** Sector chosen by the person; otherwise freelance work is independent and the rest private. */
export function dafpSector(item: { dafpSector?: string; employmentType?: string }): DafpSector {
  if (isSector(item.dafpSector)) return item.dafpSector;
  return item.employmentType === "freelance" ? "independent" : "private";
}

export interface DafpPeriod {
  sector: DafpSector;
  from?: string;
  to?: string;
  current?: boolean;
}

const DAY_MS = 86_400_000;

/** "2020", "2020-03" or "2020-03-15" → day number; `end` picks the last day of a partial date. */
function dayNumber(value: string | undefined, end: boolean): number | null {
  const match = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) - 1 : end ? 11 : 0;
  if (match[3]) return Math.floor(Date.UTC(year, month, Number(match[3])) / DAY_MS);
  // Last day of the month (or year): day 0 of the next month.
  return end ? Math.floor(Date.UTC(year, month + 1, 0) / DAY_MS) : Math.floor(Date.UTC(year, month, 1) / DAY_MS);
}

/** Days covered by the periods, counting overlapping (simultaneous) time once. */
function coveredDays(ranges: Array<[number, number]>): number {
  const sorted = ranges.filter(([start, end]) => end >= start).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let current: [number, number] | null = null;
  for (const range of sorted) {
    if (current && range[0] <= current[1] + 1) {
      current[1] = Math.max(current[1], range[1]);
    } else {
      if (current) total += current[1] - current[0] + 1;
      current = [range[0], range[1]];
    }
  }
  if (current) total += current[1] - current[0] + 1;
  return total;
}

export interface DafpTotals {
  public: number;
  private: number;
  independent: number;
  total: number;
}

/**
 * Days of experience per sector and in total. A job without an end date (or
 * marked as current) runs until today; jobs without a start date are left out.
 */
export function dafpExperienceDays(periods: DafpPeriod[], now = new Date()): DafpTotals {
  const today = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
  const ranges: Array<{ sector: DafpSector; range: [number, number] }> = [];
  for (const period of periods) {
    const start = dayNumber(period.from, false);
    if (start === null) continue;
    const end = period.current ? today : dayNumber(period.to, true) ?? today;
    ranges.push({ sector: period.sector, range: [start, Math.min(end, today)] });
  }
  const of = (sector: DafpSector) => coveredDays(ranges.filter((item) => item.sector === sector).map((item) => item.range));
  return {
    public: of("public"),
    private: of("private"),
    independent: of("independent"),
    total: coveredDays(ranges.map((item) => item.range)),
  };
}

/** Days → "2 años y 3 meses" (30-day months, 12-month years). */
export function formatDafpDuration(days: number): string {
  const months = Math.floor(Math.max(0, days) / 30);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [
    years ? `${years} ${years === 1 ? "año" : "años"}` : "",
    rest ? `${rest} ${rest === 1 ? "mes" : "meses"}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" y ") : "Menos de un mes";
}

/**
 * The four lines of the form: what the person typed wins (their certificates
 * may count differently); otherwise the time computed from the jobs.
 */
export function dafpTimeSummary(periods: DafpPeriod[], typed: { public?: string; private?: string; independent?: string } = {}, now = new Date()) {
  const days = dafpExperienceDays(periods, now);
  const pick = (manual: string | undefined, value: number) => manual?.trim() || (value ? formatDafpDuration(value) : "");
  const anyTyped = Boolean(typed.public?.trim() || typed.private?.trim() || typed.independent?.trim());
  return {
    public: pick(typed.public, days.public),
    private: pick(typed.private, days.private),
    independent: pick(typed.independent, days.independent),
    // Typed lines cannot be added up reliably, so the total is only computed
    // when every line comes from the dates.
    total: !anyTyped && days.total ? formatDafpDuration(days.total) : "",
  };
}
