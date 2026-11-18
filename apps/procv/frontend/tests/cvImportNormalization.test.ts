import { describe, expect, it } from "vitest";
import { createInitialCVData } from "../src/stores/cvEditorStore";
import { mergeCvDataWithParsed } from "../src/modules/procv/components/editor/CompleteCVEditor";

const validPersonal = {
  fullName: "Ada Lovelace",
  professionalTitle: "Ingeniera de software",
  summary: "Experta en análisis, diseño y desarrollo de soluciones tecnológicas con impacto medible.",
};

describe("CV PDF import normalization", () => {
  it("keeps complete imported sections in the editor model", () => {
    const merged = mergeCvDataWithParsed(createInitialCVData(), {
      personal: validPersonal,
      experience: [{
        position: "Ingeniera",
        company: "Analytical Engines",
        startDate: "2020-01",
        description: "Diseñó y desarrolló soluciones tecnológicas para clientes.",
      }],
      education: [{
        degree: "Ingeniería",
        institution: "Universidad",
        startDate: "2015-01",
      }],
      certificates: [{
        title: "Cloud Architect",
        issuingOrganization: "Cloud Institute",
      }],
    });

    expect(merged.personal).toMatchObject(validPersonal);
    expect(merged.experience).toHaveLength(1);
    expect(merged.education).toHaveLength(1);
    expect(merged.certificates).toHaveLength(1);
  });

  it("does not add partial imported sections that would create invalid state", () => {
    const merged = mergeCvDataWithParsed(createInitialCVData(), {
      personal: validPersonal,
      experience: [{
        position: "Ingeniera",
        company: "Analytical Engines",
        description: "Descripción sin fecha de inicio.",
      }],
      education: [{
        degree: "Ingeniería",
        institution: "Universidad",
      }],
      certificates: [{
        title: "Cloud Architect",
      }],
    });

    expect(merged.experience).toEqual([]);
    expect(merged.education).toEqual([]);
    expect(merged.certificates).toEqual([]);
  });
});
