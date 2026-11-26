import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomStylesWrapper } from "../src/modules/procv/components/withCustomStyles";
import { LayoutCustomizer } from "../src/modules/procv/components/editor/components/LayoutCustomizer";
import { CV_DENSITIES, normalizeDensity, normalizeSectionSpacing, sectionTitleGap } from "../src/modules/procv/cvSpacing";

const wrapper = (settings: object) => {
  const { container } = render(<CustomStylesWrapper settings={settings}><p>x</p></CustomStylesWrapper>);
  return container.firstElementChild as HTMLElement;
};

describe("CV density and section spacing", () => {
  it("has five densities and keeps old values working", () => {
    expect(CV_DENSITIES.map((item) => item.label)).toEqual(["Muy compacto", "Compacto", "Normal", "Amplio", "Muy amplio"]);
    expect(normalizeDensity("compact")).toBe("compact");
    expect(normalizeDensity(undefined)).toBe("balanced");
    expect(normalizeSectionSpacing(9)).toBe(6);
  });

  it("scales all vertical spacing (and line height) for any template", () => {
    const tight = wrapper({ density: "tight", sectionSpacing: 0 });
    expect(tight.classList.contains("cv-vspace")).toBe(true);
    expect(tight.style.getPropertyValue("--cv-vspace")).toBe("0.45");
    expect(tight.style.getPropertyValue("--cv-leading")).toBe("1.3");
    expect(tight.style.getPropertyValue("--cv-title-gap")).toBe("0rem");

    // Normal leaves the template untouched, except the default title gap.
    const normal = wrapper({});
    expect(normal.classList.contains("cv-vspace")).toBe(false);
    expect(normal.classList.contains("cv-leading")).toBe(false);
    expect(normal.style.getPropertyValue("--cv-title-gap")).toBe("0.75rem");
    expect(sectionTitleGap(6, "airy")).toBe("5.2rem");
  });

  it("changes density and section spacing with sliders", () => {
    const onChange = vi.fn();
    render(<LayoutCustomizer settings={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Densidad del CV"), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ density: "tight" });
    fireEvent.change(screen.getByLabelText("Espacio antes de cada sección"), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith({ sectionSpacing: 0 });
  });
});
