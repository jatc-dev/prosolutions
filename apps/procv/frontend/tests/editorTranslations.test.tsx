import { afterAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "../src/i18n";
import { EditorTabs } from "../src/modules/procv/components/editor/EditorTabs";
import { AutoSaveIndicator } from "../src/modules/procv/components/editor/components/AutoSaveIndicator";
import type { SectionType } from "../src/types";

const sections: SectionType[] = ["personal", "experience", "education", "skills", "languages", "certificates", "links"];
const status = Object.fromEntries(sections.map((section) => [section, false])) as Record<SectionType, boolean>;

describe("editor UI follows the selected language", () => {
  afterAll(() => i18n.changeLanguage("es"));

  it("shows the tabs, progress and save status in English", async () => {
    await i18n.changeLanguage("en");
    render(<EditorTabs activeSection="personal" onSectionChange={() => undefined} completionStatus={status} />);
    expect(screen.getByRole("button", { name: /Experience/ })).toBeTruthy();
    expect(screen.getByText("CV progress")).toBeTruthy();
    expect(screen.getByText("0 of 7 sections completed")).toBeTruthy();
    render(<AutoSaveIndicator isSaving={false} hasUnsavedChanges lastSaved={null} />);
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
  });

  it("keeps Spanish as the default", async () => {
    await i18n.changeLanguage("es");
    render(<EditorTabs activeSection="personal" onSectionChange={() => undefined} completionStatus={status} />);
    expect(screen.getByText("Progreso del CV")).toBeTruthy();
  });
});
