import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dafpExperienceDays, dafpSector, dafpTimeSummary, formatDafpDuration } from "../src/modules/procv/dafpExperience";
import { cvDocxContent } from "../src/modules/procv/exportDocx";
import { TemplateRenderer } from "../src/modules/procv/components/TemplateRenderer";
import { createInitialCVData } from "../src/stores/cvEditorStore";

const NOW = new Date(2026, 10, 26);

describe("public-sector form: work experience", () => {
  it("takes the sector the person chose, or infers it from the employment type", () => {
    expect(dafpSector({ dafpSector: "public", employmentType: "full-time" })).toBe("public");
    expect(dafpSector({ employmentType: "freelance" })).toBe("independent");
    expect(dafpSector({ employmentType: "contract" })).toBe("private");
    expect(dafpSector({ dafpSector: "nonsense" })).toBe("private");
  });

  it("adds up whole months per sector and counts simultaneous jobs once", () => {
    const days = dafpExperienceDays([
      { sector: "public", from: "2020-01", to: "2021-12" },
      // Overlaps the public job for 6 months: counts for private, not twice in the total.
      { sector: "private", from: "2021-07", to: "2022-06" },
      { sector: "independent", from: "2026-01", current: true },
      { sector: "private", from: "", to: "2019-01" },
    ], NOW);
    expect(formatDafpDuration(days.public)).toBe("2 años");
    expect(formatDafpDuration(days.private)).toBe("1 año");
    expect(formatDafpDuration(days.independent)).toBe("11 meses");
    expect(formatDafpDuration(days.total)).toBe("3 años y 5 meses");
  });

  it("keeps what the person typed and then leaves the total blank", () => {
    const periods = [{ sector: "public" as const, from: "2020-01", to: "2020-12" }];
    expect(dafpTimeSummary(periods, {}, NOW)).toMatchObject({ public: "1 año", private: "", total: "1 año" });
    expect(dafpTimeSummary(periods, { public: "1 año y 2 meses" }, NOW)).toMatchObject({ public: "1 año y 2 meses", total: "" });
  });

  it("prints each job with the official fields and the computed total", () => {
    const data = {
      personal: { name: "Laura Gómez" },
      education: [],
      application: {},
      experience: [
        { id: "a", company: "Alcaldía de Medellín", role: "Profesional universitario", from: "2022-02", current: true, city: "Medellín", country: "CO", dafpSector: "public", dafpDepartment: "Antioquia", dafpDependency: "Secretaría de Hacienda", dafpAddress: "Calle 44 # 52-165", dafpPhone: "604 385 5555", dafpEmail: "contacto@medellin.gov.co" },
        { id: "b", company: "Andina S.A.S.", role: "Auxiliar contable", from: "2019-01", to: "2021-12", city: "Bogotá", dafpSector: "private" },
      ],
    };
    const { container } = render(<TemplateRenderer template="dafp" data={data as never} />);
    const jobs = container.querySelectorAll("[data-dafp-job]");
    expect(jobs).toHaveLength(2);
    expect(jobs[0]!.textContent).toContain("Empleo actual o contrato vigente");
    for (const text of ["Secretaría de Hacienda", "Antioquia", "Calle 44 # 52-165", "604 385 5555", "contacto@medellin.gov.co"]) {
      expect(jobs[0]!.textContent).toContain(text);
    }
    expect(jobs[1]!.textContent).toContain("Empleo o contrato anterior");
    const text = container.textContent || "";
    expect(text).toContain("Tiempo total de experiencia");
    expect(text).toContain("Empleado del sector privado3 años");
  });

  it("adds the form data to the Word file only for the public-sector template", () => {
    const base = createInitialCVData();
    const cv = {
      ...base,
      template: "dafp",
      experience: [{ id: "x", position: "Profesional", company: "Gobernación", location: "Tunja", employmentType: "full-time", startDate: "2020-01", endDate: "2021-12", isCurrentPosition: false, description: "", achievements: [], technologies: [], order: 0, dafpSector: "public", dafpDependency: "Planeación" }],
    };
    const experience = (template: string) => cvDocxContent({ ...cv, template } as never).sections.find((section) => section.key === "experience")!;
    const dafp = JSON.stringify(experience("dafp"));
    expect(dafp).toContain("Entidad pública");
    expect(dafp).toContain("Planeación");
    expect(dafp).toContain("Servidor público: 2 años");
    expect(JSON.stringify(experience("classic"))).not.toContain("Entidad pública");
  });
});
