import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DateField } from "../src/modules/procv/components/editor/FormSection";
import { CertificatesSection } from "../src/modules/procv/components/editor/sections/CertificatesSection";
import { LinksSection } from "../src/modules/procv/components/editor/sections/LinksSection";
import { CustomizerPanel } from "../src/modules/procv/components/editor/components/CustomizerPanel";
import { CV_FONTS, normalizeCvFont, normalizeFontScale } from "../src/modules/procv/fonts";
import { CustomStylesWrapper } from "../src/modules/procv/components/withCustomStyles";
import { docxTheme } from "../src/modules/procv/exportDocx";
import { normalizeLoadedCVData } from "../src/stores/cvEditorStore";
import type { CertificateItem, LinkItem } from "../src/types";
import { TemplateRenderer, type CVData as RendererCVData } from "../src/modules/procv/components/TemplateRenderer";
import { SectionTitlesEditor } from "../src/modules/procv/components/editor/components/SectionTitlesEditor";
import { sectionTitle } from "../src/modules/procv/sectionTitles";
import { fitWithin, halvingSteps } from "../src/modules/procv/photo";
import { professionalCardText } from "../src/modules/procv/professionalCard";
import { DownloadMenu } from "../src/modules/procv/components/editor/components/DownloadMenu";
import { PDF_AVOID_BREAK, PDF_MARGIN_MM } from "../src/modules/procv/components/editor/CompleteCVEditor";

vi.mock("../src/services/api", () => ({ api: {} }));

function YearField() {
  const [value, setValue] = useState("2020");
  return <DateField value={value} onChange={setValue} allowPartial />;
}

describe("date fields with year only", () => {
  it("keep the year precision while the year is typed or cleared", () => {
    render(<YearField />);
    const precision = screen.getByLabelText("Precisión de fecha") as HTMLSelectElement;
    expect(precision.value).toBe("year");
    const input = screen.getByPlaceholderText("AAAA");

    for (const partial of ["2", "20", "202", "2024", ""]) {
      fireEvent.change(input, { target: { value: partial } });
      expect(precision.value).toBe("year");
      expect((screen.getByPlaceholderText("AAAA") as HTMLInputElement).value).toBe(partial);
    }
  });
});

const certificate: CertificateItem = {
  id: "c1",
  title: "ITIL Foundation",
  issuingOrganization: "Axelos",
  issueDate: "",
  expiryDate: "",
  credentialId: "",
  verificationUrl: "",
  description: "",
  fileUrl: "data:application/pdf;base64,AAAA",
  order: 0,
};

describe("certificates", () => {
  it("no longer offer a file upload and the issue date is optional", () => {
    sessionStorage.setItem("editor.expanded.certificates", JSON.stringify(["c1"]));
    const { container } = render(<CertificatesSection data={[certificate]} onChange={vi.fn()} />);
    expect(container.querySelector("input[type='file']")).toBeNull();
    const required = Array.from(container.querySelectorAll("input[required]"));
    expect(required.every((input) => input.getAttribute("type") !== "date")).toBe(true);
    sessionStorage.clear();
  });

  it("drop old inline files and keep the visibility choice when a CV loads", () => {
    const data = normalizeLoadedCVData({ certificates: [{ ...certificate, isVisible: false }] });
    expect(data.certificates[0].fileUrl).toBe("");
    expect(data.certificates[0].isVisible).toBe(false);
  });
});

describe("links", () => {
  const link: LinkItem = { id: "l1", label: "Portafolio", url: "https://example.com", type: "portfolio", isVisible: true, order: 0 };

  it("can be edited in place and use the same 'Mostrar en el CV' check", () => {
    const onChange = vi.fn();
    render(<LinksSection data={[link]} onChange={onChange} />);

    const input = (value: string) => screen.getAllByDisplayValue(value).find((element) => element.tagName === "INPUT")!;
    fireEvent.change(input("Portafolio"), { target: { value: "Mi portafolio" } });
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ label: "Mi portafolio" })]);

    fireEvent.change(input("https://example.com"), { target: { value: "https://github.com/ana" } });
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ url: "https://github.com/ana", type: "github" })]);

    const check = screen.getByRole("checkbox", { name: "Mostrar en el CV" });
    fireEvent.click(check);
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ isVisible: false })]);
  });
});

describe("typography", () => {
  it("offers six options (template + five fonts); Roboto Slab maps to Merriweather", () => {
    expect(CV_FONTS).toHaveLength(5);
    expect(normalizeCvFont("roboto-slab")).toBe("merriweather");
    expect(normalizeFontScale(undefined)).toBe(1);
    expect(normalizeFontScale(1.07)).toBe(1.05);
    expect(normalizeFontScale(3)).toBe(1.2);
  });

  it("one font choice sets titles and text; sizes change separately; no section-icons switch", () => {
    const onSettingsChange = vi.fn();
    render(<CustomizerPanel settings={{}} onSettingsChange={onSettingsChange} />);

    expect(screen.getAllByRole("button", { pressed: false }).length + screen.getAllByRole("button", { pressed: true }).length).toBe(6);
    fireEvent.click(screen.getByRole("button", { name: /Merriweather/ }));
    expect(onSettingsChange).toHaveBeenLastCalledWith(expect.objectContaining({ fontBody: "merriweather", fontHeading: "merriweather" }));

    fireEvent.click(screen.getByRole("button", { name: "Aumentar tamaño de títulos" }));
    expect(onSettingsChange).toHaveBeenLastCalledWith(expect.objectContaining({ fontScaleHeading: 1.05 }));
    fireEvent.click(screen.getByRole("button", { name: "Reducir tamaño del texto" }));
    expect(onSettingsChange).toHaveBeenLastCalledWith(expect.objectContaining({ fontScaleBody: 0.95 }));

    fireEvent.click(screen.getByRole("button", { name: /Diseño/ }));
    expect(screen.queryByText(/íconos de sección/i)).toBeNull();
  });

  it("applies the size steps to the preview and to Word", () => {
    const { container } = render(
      <CustomStylesWrapper settings={{ fontScaleBody: 1.1, fontScaleHeading: 0.9 }}>
        <p>CV</p>
      </CustomStylesWrapper>,
    );
    const wrapper = container.querySelector(".cv-custom-wrapper") as HTMLElement;
    expect(wrapper.classList.contains("cv-size-custom")).toBe(true);
    expect(wrapper.style.getPropertyValue("--cv-body-scale")).toBe("1.1");
    expect(wrapper.style.getPropertyValue("--cv-heading-scale")).toBe("0.9");

    const base = docxTheme("classic");
    const scaled = docxTheme("classic", { fontScaleBody: 1.1, fontScaleHeading: 0.9 });
    expect(scaled.bodySize).toBe(Math.round(base.bodySize * 1.1));
    expect(scaled.nameSize).toBe(Math.round(base.nameSize * 0.9));
    expect(scaled.headingScale).toBe(0.9);
  });
});

describe("section titles", () => {
  const cv = {
    personal: { name: "Ana", summary: "Asesora comercial con 5 años de experiencia." },
    experience: [{ id: "x1", company: "Éxito", role: "Vendedora", from: "2021-03" }],
    education: [],
  } as unknown as RendererCVData;
  const headings = () => screen.getAllByRole("heading").map((heading) => heading.textContent);

  it("use the same names in every template", () => {
    for (const template of ["minimal", "corporate", "developer", "creative", "classic", "sidebar", "executive", "extensa"]) {
      const { unmount } = render(<TemplateRenderer template={template} data={cv} />);
      expect(headings(), template).toEqual(expect.arrayContaining(["Perfil profesional", "Experiencia laboral"]));
      expect(headings(), template).not.toEqual(expect.arrayContaining(["Perfil", "Resumen", "Sobre mí", "Acerca de mí", "Experiencia"]));
      unmount();
    }
  });

  it("can be renamed by the user, in the preview and in Word", () => {
    const settings = { sectionTitles: { summary: "  Sobre mí ", experience: "" } };
    render(<TemplateRenderer template="corporate" data={{ ...cv, settings }} />);
    expect(headings()).toEqual(expect.arrayContaining(["Sobre mí", "Experiencia laboral"]));
    expect(sectionTitle(settings, "education")).toBe("Educación");
  });

  it("are edited from the Diseño tab, with the standard title as placeholder", () => {
    const onChange = vi.fn();
    render(<SectionTitlesEditor value={{ summary: "Sobre mí" }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Experiencia laboral"), { target: { value: "Trayectoria" } });
    expect(onChange).toHaveBeenLastCalledWith({ summary: "Sobre mí", experience: "Trayectoria" });
    fireEvent.click(screen.getByRole("button", { name: 'Restaurar el título "Perfil profesional"' }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });
});

describe("profile photo size", () => {
  it("shrinks to at most 800 px on the longest side, never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1080, 1920)).toEqual({ width: 450, height: 800 });
    expect(fitWithin(300, 300)).toEqual({ width: 300, height: 300 });
  });

  it("reduces large photos in halving steps for a sharper result", () => {
    expect(halvingSteps(4000, 3000, 800, 600)).toEqual([{ width: 2000, height: 1500 }]);
    expect(halvingSteps(8000, 6000, 800, 600)).toEqual([{ width: 4000, height: 3000 }, { width: 2000, height: 1500 }]);
    expect(halvingSteps(1200, 900, 800, 600)).toEqual([]);
  });
});

describe("download menu", () => {
  it("offers PDF and Word from one button", () => {
    const onPdf = vi.fn();
    const onWord = vi.fn();
    render(<DownloadMenu documentLabel="la hoja de vida" onPdf={onPdf} onWord={onWord} busy={false} />);
    const trigger = screen.getByRole("button", { name: "Descargar la hoja de vida" });
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("menuitem", { name: /Word/ }));
    expect(onWord).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /PDF/ }));
    expect(onPdf).toHaveBeenCalledTimes(1);
  });

  it("is disabled while a file is being generated", () => {
    render(<DownloadMenu documentLabel="la carta" onPdf={vi.fn()} onWord={vi.fn()} busy />);
    expect((screen.getByRole("button", { name: "Descargar la carta" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("PDF page breaks", () => {
  it("uses the same margin on every side so coloured panels look symmetric", () => {
    expect(new Set(PDF_MARGIN_MM).size).toBe(1);
    expect(PDF_MARGIN_MM[0]).toBeGreaterThan(0);
  });

  it("never splits entries, section titles, paragraphs or bullets", () => {
    expect(PDF_AVOID_BREAK).toEqual(expect.arrayContaining(["[data-cv-item]", "[data-pdf-keep-with-next]", "p", "li"]));
  });

  it("every experience, degree and certificate in the templates is marked as one entry", () => {
    const cv = {
      personal: { name: "Ana" },
      experience: [{ id: "x1", company: "Éxito", role: "Vendedora", from: "2021-03" }],
      education: [{ id: "d1", institution: "UNAL", degree: "Administración", from: "2015-01" }],
      certificates: [{ id: "c1", title: "ITIL" }],
    } as unknown as RendererCVData;
    for (const template of ["minimal", "corporate", "sidebar", "executive", "classic"]) {
      const { container, unmount } = render(<TemplateRenderer template={template} data={cv} />);
      expect(container.querySelectorAll("[data-cv-item]").length, template).toBeGreaterThanOrEqual(3);
      unmount();
    }
  });
});

describe("experience entries from older CVs", () => {
  it("always get lists for achievements and tools", () => {
    const data = normalizeLoadedCVData({ experience: [{ id: "x1", position: "Vendedora", company: "Éxito" }] });
    expect(data.experience[0].achievements).toEqual([]);
    expect(data.experience[0].technologies).toEqual([]);
  });
});

describe("professional card", () => {
  it("shows number, issuer and date unless hidden", () => {
    const card = { professionalCardNumber: "25202-123456", professionalCardIssuer: "COPNIA", professionalCardDate: "2019-03" };
    expect(professionalCardText(card)).toBe("N.º 25202-123456 · COPNIA · expedida 03/2019");
    expect(professionalCardText({ ...card, showProfessionalCardIssuer: false, showProfessionalCardDate: false })).toBe("N.º 25202-123456");
    expect(professionalCardText({ ...card, showProfessionalCard: false })).toBe("");
    expect(professionalCardText({ professionalCardIssuer: "COPNIA" })).toBe("");
  });

  it("appears on the CV next to the identity document", () => {
    render(<TemplateRenderer template="corporate" data={{ personal: { name: "Ana", professionalCard: "N.º 123 · COPNIA" } } as unknown as RendererCVData} />);
    expect(screen.getByText("Tarjeta profesional")).toBeTruthy();
    expect(screen.getByText("N.º 123 · COPNIA")).toBeTruthy();
  });
});
