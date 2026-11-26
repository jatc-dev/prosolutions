import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewDesignBar } from "../src/modules/procv/components/editor/components/PreviewDesignBar";
import { CURATED_CV_TEMPLATES } from "../src/shared/utils/templateCatalog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, options?: unknown) => (typeof options === "string" ? options : (options as { defaultValue?: string })?.defaultValue ?? key) }),
}));

function Harness() {
  const [template, setTemplate] = useState("minimal");
  return <PreviewDesignBar templates={CURATED_CV_TEMPLATES} currentTemplate={template} onTemplateSelect={setTemplate} settings={{}} onSettingsChange={() => undefined} />;
}

describe("design bar above the preview", () => {
  afterEach(() => window.localStorage.clear());

  it("browses templates with the arrows without opening a panel", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: /Minimalista/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Plantilla siguiente" }));
    expect(screen.getByRole("button", { name: new RegExp(CURATED_CV_TEMPLATES[1].label) })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Plantilla anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Plantilla anterior" }));
    expect(screen.getByRole("button", { name: new RegExp(CURATED_CV_TEMPLATES[CURATED_CV_TEMPLATES.length - 1].label.replace(/[()]/g, ".")) })).toBeTruthy();
    expect(document.getElementById("preview-template-panel")).toBeNull();
  });

  it("opens template and customize panels separately, one at a time", () => {
    render(<Harness />);
    const templateToggle = screen.getAllByRole("button").find((button) => button.getAttribute("aria-controls") === "preview-template-panel")!;
    fireEvent.click(templateToggle);
    expect(document.getElementById("preview-template-panel")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Personalizar/ }));
    expect(document.getElementById("preview-template-panel")).toBeNull();
    expect(document.getElementById("preview-customize-panel")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Personalizar/ }));
    expect(document.getElementById("preview-customize-panel")).toBeNull();
  });
});
