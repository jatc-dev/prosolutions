import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplateRenderer } from "../src/modules/procv/components/TemplateRenderer";
import { period } from "../src/modules/procv/exportDocx";
import { createInitialCVData, useCVEditorStore } from "../src/stores/cvEditorStore";

vi.mock("react-hot-toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }), default: vi.fn() }));

describe("education without a start date", () => {
  it("is valid: only degree and institution are required", () => {
    useCVEditorStore.setState({
      cvData: {
        ...createInitialCVData(),
        education: [{ id: "d1", institution: "SENA", degree: "Técnico en ventas", fieldOfStudy: "", startDate: "", endDate: "2019-12", isCurrentlyStudying: false, order: 0, isVisible: true } as never],
      },
      validationErrors: {},
    });
    useCVEditorStore.getState().validateSection("education");
    const errors = useCVEditorStore.getState().validationErrors;
    expect(Object.keys(errors).filter((key) => key.startsWith("education") && (errors[key] || []).length)).toEqual([]);
  });

  it("shows only the end date, or 'En curso' for ongoing studies", () => {
    const data = {
      personal: { name: "Ana" },
      education: [
        { id: "a", institution: "SENA", degree: "Técnico en ventas", from: "", to: "2019-12" },
        { id: "b", institution: "Universidad", degree: "Administración", from: "", to: "En curso" },
      ],
      experience: [], skills: [], languages: [], certificates: [], links: [],
    };
    const { container } = render(<TemplateRenderer template="minimal" data={data as never} />);
    expect(container.textContent).toContain("Diciembre de 2019");
    expect(container.textContent).toContain("En curso");
    expect(period("", "2019-12")).toBe("diciembre 2019");
    expect(period("", "", true)).toBe("en curso");
    expect(period("2018-02", "", true)).toBe("febrero 2018 – actualidad");
  });
});
