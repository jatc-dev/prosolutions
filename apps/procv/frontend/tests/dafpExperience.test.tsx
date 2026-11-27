import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dafpExperienceDays, dafpSector, dafpTimeSummary, formatDafpDuration } from "../src/modules/procv/dafpExperience";
import * as docx from "docx";
import JSZip from "jszip";
import { buildCvDocument } from "../src/modules/procv/exportDocx";
import { dafpFormModel } from "../src/modules/procv/dafpDocx";
import { TemplateRenderer } from "../src/modules/procv/components/TemplateRenderer";
import { createInitialCVData } from "../src/stores/cvEditorStore";

const NOW = new Date(2026, 10, 26);

/** word/document.xml of a built document (jszip ships with docx). */
async function documentXml(document: InstanceType<typeof docx.Document>): Promise<string> {
  const zip = await JSZip.loadAsync(await docx.Packer.toBuffer(document));
  return zip.file("word/document.xml")!.async("string");
}

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

  it("keeps each job (and the section title with the first one) on one PDF page", () => {
    const data = {
      personal: { name: "Laura Gómez" }, education: [], application: {},
      experience: [
        { id: "a", company: "Alcaldía", role: "Profesional", from: "2022-02", current: true },
        { id: "b", company: "Andina", role: "Auxiliar", from: "2019-01", to: "2021-12" },
      ],
    };
    const { container } = render(<TemplateRenderer template="dafp" data={data as never} />);
    const jobs = Array.from(container.querySelectorAll("[data-dafp-job]"));
    expect(jobs.every((job) => job.hasAttribute("data-cv-item"))).toBe(true);
    expect(jobs[0]!.querySelector("h2")?.textContent).toBe("3. Experiencia laboral");
    // Empty boxes are still drawn, so every grid keeps its lines.
    expect(jobs[1]!.textContent).toContain("Departamento");
  });

  it("draws the Word file as the bordered official form", async () => {
    const base = createInitialCVData();
    const cv = {
      ...base,
      template: "dafp",
      personal: { ...base.personal, firstName: "Laura", lastName: "Gómez Pérez", fullName: "Laura Gómez Pérez" },
      application: { dafpIneligible: "No", dafpSignPlace: "Tunja" },
      experience: [{ id: "x", position: "Profesional", company: "Gobernación", location: "Tunja, Colombia", employmentType: "full-time", startDate: "2020-01", endDate: "2021-12", isCurrentPosition: false, description: "", achievements: [], technologies: [], order: 0, dafpSector: "public", dafpDependency: "Planeación" }],
    } as never;
    const sections = dafpFormModel(cv);
    expect(sections.map((section) => section.title)).toEqual(["1. Datos personales", "3. Experiencia laboral", "4. Tiempo total de experiencia", "5. Firma del servidor público o contratista"]);
    const job = sections[1]!.blocks[0]!;
    expect(job.kind).toBe("job");
    expect(JSON.stringify(job)).toContain("Planeación");
    expect(JSON.stringify(job)).toContain("Pública ☒");
    expect(JSON.stringify(sections[2])).toContain("2 años");

    const xml = await documentXml(await buildCvDocument(cv, docx));
    expect(xml).toContain("<w:tblBorders>");
    expect(xml).toContain("PRIMER APELLIDO");
    expect(xml).toContain("Gómez");
    expect(xml).toContain("<w:cantSplit/>");
  });
});
