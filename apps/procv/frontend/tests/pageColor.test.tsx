import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { luminance, pageColorFor } from "../src/modules/procv/pageColor";
import { CustomStylesWrapper } from "../src/modules/procv/components/withCustomStyles";
import { ColorCustomizer } from "../src/modules/procv/components/editor/components/ColorCustomizer";
import { fillPdfPageColor } from "../src/modules/procv/pdfTextLayer";
import { docxTheme } from "../src/modules/procv/exportDocx";

describe("page colour", () => {
  it("applies to normal templates, not to dark ones or official forms", () => {
    expect(pageColorFor("moderna", { pageColor: "#FBF6EC" })).toBe("#fbf6ec");
    expect(pageColorFor("moderna", { pageColor: "#ffffff" })).toBeNull();
    for (const template of ["developer", "creative", "employment", "dafp"]) expect(pageColorFor(template, { pageColor: "#fbf6ec" })).toBeNull();
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("#1e293b")).toBeLessThan(0.1);
  });

  it("colours the page in the preview", () => {
    const { container } = render(<CustomStylesWrapper settings={{ pageColor: "#fbf6ec" }} template="moderna"><div>x</div></CustomStylesWrapper>);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.classList.contains("cv-c-page")).toBe(true);
    expect(wrapper.style.getPropertyValue("--cv-page-bg")).toBe("#fbf6ec");
    const dark = render(<CustomStylesWrapper settings={{ pageColor: "#fbf6ec" }} template="developer"><div>x</div></CustomStylesWrapper>);
    expect((dark.container.firstElementChild as HTMLElement).classList.contains("cv-c-page")).toBe(false);
  });

  it("fills the PDF margins and the space under the content, never the content", () => {
    const rects: Array<[number, number, number, number, number]> = [];
    let page = 0;
    fillPdfPageColor(
      { setPage: (value) => (page = value), getNumberOfPages: () => 2, setFillColor: () => undefined, rect: (x, y, w, h) => rects.push([page, x, y, w, h]) },
      "#fbf6ec",
      { width: 210, height: 297, innerWidth: 198, innerHeight: 285, margin: [6, 6, 6, 6], lastContentHeight: 100 },
    );
    expect(rects).toHaveLength(8);
    // Last page: the bottom strip starts right under the content.
    expect(rects.find(([p, , y]) => p === 2 && y === 106)).toEqual([2, 0, 106, 210, 191]);
    // No strip overlaps the content area of page 1.
    for (const [p, x, y, w, h] of rects.filter(([p]) => p === 1)) {
      const overlaps = x < 204 && x + w > 6 && y < 291 && y + h > 6;
      expect(overlaps, `${p} ${x} ${y} ${w} ${h}`).toBe(false);
    }
  });

  it("sets the Word page background", () => {
    expect(docxTheme("moderna", { pageColor: "#fbf6ec" }).paperColor).toBe("FBF6EC");
    expect(docxTheme("developer", { pageColor: "#fbf6ec" }).paperColor).toBeUndefined();
  });

  it("offers light presets and warns about dark colours", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ColorCustomizer template="moderna" settings={{}} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Crema" }));
    expect(onChange).toHaveBeenCalledWith({ pageColor: "#fbf6ec" });
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<ColorCustomizer template="moderna" settings={{ pageColor: "#1e293b" }} onChange={onChange} />);
    expect(screen.getByRole("alert").textContent).toContain("oscuro");
    rerender(<ColorCustomizer template="dafp" settings={{}} onChange={onChange} />);
    expect(screen.queryByRole("radio", { name: "Crema" })).toBeNull();
  });
});

describe("unified colour swatches", () => {
  it("shows every colour as swatches, in two columns, with the template's own colour first", () => {
    const onChange = vi.fn();
    const { container } = render(<ColorCustomizer template="moderna" settings={{ accentColor: "#3b82f6" }} onChange={onChange} />);
    const accent = screen.getByRole("radiogroup", { name: "Color de acento" });
    // The old stored default means "template colour".
    expect(within(accent).getByRole("radio", { name: "Color de la plantilla" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(accent).getByRole("radio", { name: "Morado" }));
    expect(onChange).toHaveBeenCalledWith({ accentColor: "#7c3aed" });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Títulos" })).getByRole("radio", { name: "Color de la plantilla" }));
    expect(onChange).toHaveBeenCalledWith({ headingColor: undefined });
    expect(container.querySelector("[class*='sm:grid-cols-2']")).not.toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Texto del panel" })).toBeNull();
  });

  it("shows the side-panel colours only for Panel lateral", () => {
    render(<ColorCustomizer template="sidebar" settings={{}} onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Texto del panel" })).toBeTruthy();
  });
});
