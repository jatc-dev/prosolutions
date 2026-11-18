import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportReviewModal } from "../src/modules/procv/components/editor/components/ImportReviewModal";
import type { ParsedCvDraft } from "../src/shared/services/cvImport";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(cleanup);

const incompleteDraft: ParsedCvDraft = {
  personal: { fullName: "Ada Lovelace" },
  experience: [{ position: "Ingeniera", company: "Analytical Engines", description: "" }],
  education: [{ degree: "Ingeniería", institution: "Universidad" }],
  certificates: [{ title: "Cloud Architect" }],
};

describe("ImportReviewModal", () => {
  it("requires incomplete records to be completed before applying", () => {
    const onApply = vi.fn();
    render(
      <ImportReviewModal
        isOpen
        fileName="resume.pdf"
        parsedData={incompleteDraft}
        onCancel={vi.fn()}
        onApply={onApply}
      />,
    );

    const applyButton = screen.getByRole("button", { name: /editor.importer.apply/i }) as HTMLButtonElement;
    expect(applyButton.disabled).toBe(true);
    expect(screen.getAllByText("Necesita revisión antes de aplicar.")).toHaveLength(3);

    const startDateInputs = screen.getAllByPlaceholderText("Fecha de inicio");
    fireEvent.change(startDateInputs[0], { target: { value: "2020-01" } });
    fireEvent.change(screen.getByPlaceholderText("Descripción (mínimo 10 caracteres)"), {
      target: { value: "Diseñó soluciones tecnológicas para clientes." },
    });
    fireEvent.change(startDateInputs[1], { target: { value: "2015-01" } });
    fireEvent.change(screen.getByPlaceholderText("Organización emisora"), { target: { value: "Cloud Institute" } });

    expect(applyButton.disabled).toBe(false);
    fireEvent.click(applyButton);

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      experience: [expect.objectContaining({ startDate: "2020-01" })],
      education: [expect.objectContaining({ startDate: "2015-01" })],
      certificates: [expect.objectContaining({ issuingOrganization: "Cloud Institute" })],
    }));
  });

  it("requires an explicit exclusion decision for an incomplete record", () => {
    const onApply = vi.fn();
    render(
      <ImportReviewModal
        isOpen
        fileName="resume.pdf"
        parsedData={incompleteDraft}
        onCancel={vi.fn()}
        onApply={onApply}
      />,
    );

    const excludeCheckboxes = screen.getAllByRole("checkbox");
    excludeCheckboxes.forEach((checkbox) => fireEvent.click(checkbox));

    const applyButton = screen.getByRole("button", { name: /editor.importer.apply/i }) as HTMLButtonElement;
    expect(applyButton.disabled).toBe(false);
    fireEvent.click(applyButton);

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      experience: [],
      education: [],
      certificates: [],
    }));
  });
});
