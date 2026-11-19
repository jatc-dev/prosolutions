import { describe, expect, it } from "vitest";
import type { JobDetail } from "../../server/src/contracts";
import { buildJobPostingJsonLd } from "./jobPosting";

const now = new Date("2026-11-18T12:00:00Z");
const base: JobDetail = {
  id: "job-1",
  slug: "auxiliar-bodega",
  title: "Auxiliar de Bodega",
  summary: "Recepción y despacho",
  company: { id: "c1", slug: "acme", name: "Acme <Logística>", logoUrl: "https://cdn.example/logo.png", industry: "Logística", verified: true },
  employmentType: "full_time",
  workplace: "onsite",
  seniority: "junior",
  location: { city: "Bogotá", country: "CO" },
  salary: { min: 1_800_000, max: 2_200_000, currency: "cop", period: "month" },
  skills: ["inventarios"],
  publishedAt: "2026-11-15T12:00:00Z",
  description: "Recibir mercancía.\n\nControlar inventarios.",
  responsibilities: ["Cargar <camiones>"],
  requirements: ["Bachillerato"],
  benefits: [],
  status: "published",
  closesAt: null,
  companyProfile: {
    id: "c1", slug: "acme", name: "Acme", logoUrl: null, industry: null, verified: true, tagline: null, description: null,
    website: "https://acme.example", sizeRange: null, headquarters: null, verificationStatus: "verified",
  },
};

describe("JobPosting structured data", () => {
  it("describes open on-site jobs with location, salary and escaped HTML", () => {
    const data = buildJobPostingJsonLd(base, "https://projobs.test", now)!;
    expect(data).toMatchObject({
      "@type": "JobPosting",
      title: "Auxiliar de Bodega",
      employmentType: "FULL_TIME",
      directApply: true,
      url: "https://projobs.test/empleos/auxiliar-bodega",
      hiringOrganization: { name: "Acme <Logística>", sameAs: "https://acme.example" },
      jobLocation: { "@type": "Place", address: { addressLocality: "Bogotá", addressCountry: "CO" } },
      baseSalary: { currency: "COP", value: { minValue: 1_800_000, maxValue: 2_200_000, unitText: "MONTH" } },
    });
    expect(String(data.description)).toContain("Cargar &lt;camiones&gt;");
    expect(String(data.validThrough)).toBe("2027-01-14T12:00:00.000Z");
  });

  it("uses TELECOMMUTE for remote jobs", () => {
    const data = buildJobPostingJsonLd({ ...base, workplace: "remote" }, "https://projobs.test", now)!;
    expect(data.jobLocationType).toBe("TELECOMMUTE");
    expect(data.applicantLocationRequirements).toEqual({ "@type": "Country", name: "CO" });
    expect(data.jobLocation).toBeUndefined();
  });

  it("emits nothing for closed, draft or expired jobs", () => {
    expect(buildJobPostingJsonLd({ ...base, status: "closed" }, "https://projobs.test", now)).toBeNull();
    expect(buildJobPostingJsonLd({ ...base, status: "draft" }, "https://projobs.test", now)).toBeNull();
    expect(buildJobPostingJsonLd({ ...base, closesAt: "2026-11-01T00:00:00Z" }, "https://projobs.test", now)).toBeNull();
    expect(buildJobPostingJsonLd({ ...base, publishedAt: "2026-08-01T00:00:00Z" }, "https://projobs.test", now)).toBeNull();
  });
});
