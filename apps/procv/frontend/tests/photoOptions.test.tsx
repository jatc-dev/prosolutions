import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalSection } from "../src/modules/procv/components/editor/sections/PersonalSection";
import { PhotoCustomizer } from "../src/modules/procv/components/editor/components/PhotoCustomizer";
import { OPEN_CUSTOMIZER_EVENT } from "../src/modules/procv/components/editor/components/PreviewDesignBar";
import { createInitialCVData } from "../src/stores/cvEditorStore";

vi.mock("../src/services/api", () => ({ api: {} }));

const PHOTO = "data:image/jpeg;base64,AAAA";

describe("photo: data in the form, look in Personalizar", () => {
  it("keeps only upload/change/remove in the form and opens Personalizar → Foto", () => {
    const onOpen = vi.fn();
    window.addEventListener(OPEN_CUSTOMIZER_EVENT, onOpen);
    render(<PersonalSection data={{ ...createInitialCVData().personal, profileImage: PHOTO }} onChange={vi.fn()} onValidateField={vi.fn()} />);
    expect(screen.queryByLabelText("Mostrar borde en la foto")).toBeNull();
    expect(screen.queryByLabelText("Encuadre horizontal de la foto")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Ajustar foto/ }));
    expect((onOpen.mock.calls[0][0] as CustomEvent).detail).toBe("photo");
    window.removeEventListener(OPEN_CUSTOMIZER_EVENT, onOpen);
  });

  it("edits shape, size, border, visibility and framing in Personalizar", () => {
    const onChange = vi.fn();
    render(<PhotoCustomizer personal={{ ...createInitialCVData().personal, profileImage: PHOTO }} onChange={onChange} />);
    const [shape, size] = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(Array.from(shape.options).map((option) => option.value)).toEqual(["round", "square", "portrait", "oval", "arch"]);
    fireEvent.change(size, { target: { value: "lg" } });
    expect(onChange).toHaveBeenCalledWith({ profileImageSize: "lg" });
    fireEvent.click(screen.getByLabelText("Borde"));
    expect(onChange).toHaveBeenCalledWith({ profileImageBorder: false });
    fireEvent.change(screen.getByLabelText("Acercar o alejar la foto"), { target: { value: "1.5" } });
    expect(onChange).toHaveBeenCalledWith({ profileImageZoom: 1.5 });
  });

  it("asks to upload a photo first when there is none", () => {
    render(<PhotoCustomizer personal={createInitialCVData().personal} onChange={vi.fn()} />);
    expect(screen.getByText(/Aún no tienes foto/)).toBeTruthy();
  });
});
