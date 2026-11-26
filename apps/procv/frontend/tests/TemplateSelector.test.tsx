import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TemplateSelector } from "../src/modules/procv/components/editor/components/TemplateSelector";
import { CURATED_CV_TEMPLATES } from "../src/shared/utils/templateCatalog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

afterEach(cleanup);

describe("public editor template selection", () => {
  it.each(["guest", "authenticated"])("allows every catalog template in the %s flow", () => {
    const onTemplateSelect = vi.fn();
    const selectedTemplate = CURATED_CV_TEMPLATES[0].key;

    render(
      <TemplateSelector
        templates={CURATED_CV_TEMPLATES}
        currentTemplate={selectedTemplate}
        onTemplateSelect={onTemplateSelect}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(CURATED_CV_TEMPLATES.length);

    CURATED_CV_TEMPLATES.forEach((template) => {
      fireEvent.click(screen.getByRole("button", { name: template.label }));
      expect(onTemplateSelect).toHaveBeenLastCalledWith(template.key);
    });

    expect(onTemplateSelect).toHaveBeenCalledTimes(CURATED_CV_TEMPLATES.length);
  });
});
