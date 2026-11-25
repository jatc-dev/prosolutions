import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalSection } from "../src/modules/procv/components/editor/sections/PersonalSection";
import { createInitialCVData } from "../src/stores/cvEditorStore";

vi.mock("../src/services/api", () => ({ api: {} }));

describe("compact photo options", () => {
  it("uses drop-down lists for style and size, side by side, and toggles together", () => {
    const onChange = vi.fn();
    const { container } = render(<PersonalSection data={createInitialCVData().personal} onChange={onChange} onValidateField={vi.fn()} />);

    const [style, size] = screen.getAllByRole("combobox").slice(0, 2) as HTMLSelectElement[];
    expect(Array.from(style.options).map((option) => option.value)).toEqual(["round", "square", "portrait", "oval", "arch"]);
    expect(Array.from(size.options).map((option) => option.value)).toEqual(["sm", "md", "lg", "xl"]);
    expect(size.value).toBe("md");
    // Both selects share one two-column row.
    expect(style.closest("[class*='sm:grid-cols-2']")).toBe(size.closest("[class*='sm:grid-cols-2']"));
    expect(screen.queryByRole("radiogroup", { name: "Tamaño de la foto" })).toBeNull();

    fireEvent.change(size, { target: { value: "lg" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ profileImageSize: "lg" }));

    const show = screen.getByLabelText("Mostrar foto de perfil en la hoja de vida", { exact: false });
    const border = screen.getByLabelText("Mostrar borde en la foto");
    expect(show.closest("div")).toBe(border.closest("div"));
    fireEvent.click(border);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ profileImageBorder: false }));
    expect(container).toBeTruthy();
  });
});
