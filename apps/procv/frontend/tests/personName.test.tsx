import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { composeFullName, formNames, splitFullName, splitSurnames } from "../src/modules/procv/personName";
import { TemplateRenderer } from "../src/modules/procv/components/TemplateRenderer";

describe("names and surnames", () => {
  it("splits older full names and joins them back unchanged", () => {
    expect(splitFullName("Ana María Pérez Gómez")).toEqual({ firstName: "Ana María", lastName: "Pérez Gómez" });
    expect(splitFullName("Juan Pérez Gómez")).toEqual({ firstName: "Juan", lastName: "Pérez Gómez" });
    expect(splitFullName("Luis de la Hoz")).toEqual({ firstName: "Luis", lastName: "de la Hoz" });
    const name = "Ana María Pérez Gómez";
    const split = splitFullName(name);
    expect(composeFullName(split.firstName, split.lastName)).toBe(name);
  });

  it("keeps compound surnames together for the DAFP form", () => {
    expect(splitSurnames("Pérez Gómez")).toEqual({ first: "Pérez", second: "Gómez" });
    expect(splitSurnames("De la Hoz Martínez")).toEqual({ first: "De la Hoz", second: "Martínez" });
    expect(splitSurnames("Ruiz del Castillo")).toEqual({ first: "Ruiz", second: "del Castillo" });
  });

  it("follows the full name when it changed elsewhere (an import)", () => {
    expect(formNames({ firstName: "Ana ", lastName: "", fullName: "Ana" })).toEqual({ firstName: "Ana ", lastName: "" });
    expect(formNames({ firstName: "Ana", lastName: "Pérez", fullName: "Carlos Ruiz" })).toEqual({ firstName: "Carlos", lastName: "Ruiz" });
  });

  it("prints given names and both surnames apart in the DAFP form", () => {
    const { container } = render(<TemplateRenderer template="dafp" data={{ personal: { name: "Ana María Pérez Gómez", firstName: "Ana María", lastName: "Pérez Gómez" }, experience: [], education: [], application: {} } as never} />);
    const rows = Array.from(container.querySelectorAll("*")).map((el) => el.textContent || "");
    expect(rows.some((text) => text.startsWith("Primer apellido") && text.includes("Pérez") && !text.includes("Gómez"))).toBe(true);
    expect(container.textContent).toContain("Ana María");
    expect(container.textContent).toContain("Gómez");
  });
});
