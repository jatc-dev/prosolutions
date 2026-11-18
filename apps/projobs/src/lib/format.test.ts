import { describe, expect, it } from "vitest";
import { formatLocation, formatSalary, initials, timeAgo } from "./format";

describe("format", () => {
  it("formats salary ranges with currency and period", () => {
    expect(formatSalary({ min: 3000, max: 4000, currency: "USD", period: "month" })).toBe("3.000 – 4.000 USD / mes");
    expect(formatSalary({ min: 12_000_000, max: 16_000_000, currency: "COP", period: "month" })).toMatch(/^12\sM – 16\sM COP \/ mes$/);
    expect(formatSalary({ min: null, max: 90_000, currency: "MXN", period: "year" })).toBe("90.000 MXN / año");
    expect(formatSalary(null)).toBeNull();
  });

  it("describes remote and onsite locations", () => {
    expect(formatLocation({ city: null, country: null }, "remote")).toBe("Remoto");
    expect(formatLocation({ city: "Lima", country: "PE" }, "onsite")).toBe("Lima, Perú");
    expect(formatLocation({ city: null, country: "CO" }, "remote")).toBe("Remoto · Colombia");
  });

  it("renders relative times and initials", () => {
    const now = Date.parse("2026-11-17T12:00:00Z");
    expect(timeAgo("2026-11-16T12:00:00Z", now)).toBe("ayer");
    expect(timeAgo("2026-11-17T11:59:50Z", now)).toBe("justo ahora");
    expect(initials("Andes Fintech S.A.")).toBe("AF");
  });
});
