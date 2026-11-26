import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEMPLATE_CARDS } from "../src/content/formats";
import { CURATED_CV_TEMPLATES, CV_TEMPLATE_GROUPS } from "../../procv/frontend/src/utils/templateCatalog";

describe("public template gallery", () => {
  it("lists exactly the ProCV catalog, with the same names and groups", () => {
    const groupLabel = Object.fromEntries(CV_TEMPLATE_GROUPS.map((group) => [group.id, group.label]));
    expect(TEMPLATE_CARDS.map((card) => card.key).sort()).toEqual(CURATED_CV_TEMPLATES.map((template) => template.key).sort());
    for (const template of CURATED_CV_TEMPLATES) {
      const card = TEMPLATE_CARDS.find((item) => item.key === template.key)!;
      expect(card.name).toBe(template.label);
      expect(card.group).toBe(groupLabel[template.group]);
      expect(card.photo).toBe(template.supportsPhoto);
    }
  });

  it("has a preview image for every template", () => {
    for (const card of TEMPLATE_CARDS) {
      expect(existsSync(join(__dirname, "..", "public", "plantillas", `${card.key}.webp`)), card.key).toBe(true);
    }
  });

  it("lets Google read the noindex of the sign-in screens", () => {
    const script = readFileSync(join(__dirname, "..", "scripts", "prerender.mjs"), "utf8");
    const block = script.slice(script.indexOf("const disallow = ["), script.indexOf("];", script.indexOf("const disallow = [")));
    for (const path of ["/login", "/register", "/forgot-password"]) expect(block).not.toContain(`"${path}"`);
    expect(block).toContain('"/admin"');
  });
});
