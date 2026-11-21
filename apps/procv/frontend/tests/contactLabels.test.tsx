import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { contactLabel, normalizeContactLabelStyle } from "../src/modules/procv/contactLabels";
import { TemplateRenderer } from "../src/modules/procv/components/TemplateRenderer";

const data = (contactLabelStyle?: "label" | "icon" | "none") => ({
  personal: {
    name: "Ana Pérez",
    contactLabelStyle,
    emails: [
      { value: "", type: "Correo personal", kind: "email" as const },
      { value: "ana@empresa.com", type: "Correo laboral", kind: "email" as const },
    ],
    phones: [{ value: "300 123 4567", type: "WhatsApp", kind: "phone" as const }],
  },
});

describe("contact labels", () => {
  it("names each email and phone type", () => {
    expect(contactLabel("email", "personal")).toBe("Correo personal");
    expect(contactLabel("email", "education")).toBe("Correo institucional");
    expect(contactLabel("phone", "whatsapp")).toBe("WhatsApp");
    expect(contactLabel("phone", "unknown")).toBe("Teléfono");
    expect(normalizeContactLabelStyle(undefined)).toBe("label");
    expect(normalizeContactLabelStyle("icon")).toBe("icon");
  });

  it("never prints a label without its value and honours the chosen style", () => {
    const labelled = render(<TemplateRenderer template="minimal" data={data()} />);
    expect(labelled.container.textContent).toContain("Correo laboral:");
    expect(labelled.container.textContent).not.toContain("Correo personal:");
    labelled.unmount();

    const icons = render(<TemplateRenderer template="minimal" data={data("icon")} />);
    expect(icons.container.querySelectorAll(".cv-contact-icon")).toHaveLength(2);
    expect(icons.container.textContent).not.toContain("Correo laboral:");
    icons.unmount();

    const bare = render(<TemplateRenderer template="minimal" data={data("none")} />);
    expect(bare.container.querySelectorAll(".cv-contact-icon")).toHaveLength(0);
    expect(bare.container.textContent).toContain("ana@empresa.com");
    expect(bare.container.textContent).not.toContain("WhatsApp:");
  });
});
