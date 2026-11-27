import type { CVData } from "../../types";
import { defaultGreeting, formatLetterDate, letterParagraphs } from "./coverLetter";
import { normalizeCvFont, normalizeFontScale, TEMPLATE_FONT } from "./fonts";
import { sectionTitle } from "./sectionTitles";
import { pageColorFor } from "./pageColor";
import { educationTitle } from "./education";
import { dafpSector, dafpTimeSummary } from "./dafpExperience";

const DAFP_SECTOR_TEXT = { public: "Entidad pública", private: "Entidad privada", independent: "Trabajador independiente" } as const;
import { getLocalizedDegreeLabel } from "./components/TemplateRenderer";
import { groupReferences, referenceContact, referenceDetails, referenceName, REFERENCE_TYPE_LABELS, REFERENCES_ON_REQUEST_TEXT, visibleReferences } from "./references";

/**
 * Word (.docx) export. The text comes from the CV data (real, editable text
 * that applicant tracking systems parse), and the look follows the chosen
 * template: fonts, colours, heading style, header band, side panel, dark page
 * and photo, plus the user's own font and colour choices. The `docx` library
 * is loaded on demand so it never weighs on the editor's first load.
 */

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const LANGUAGE_LEVELS: Record<string, string> = { A1: "básico (A1)", A2: "básico (A2)", B1: "intermedio (B1)", B2: "intermedio alto (B2)", C1: "avanzado (C1)", C2: "nativo o bilingüe (C2)" };

export function monthYear(value?: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(String(value || ""));
  if (!match) return String(value || "").trim();
  return `${MONTHS[Number(match[2]) - 1] ?? ""} ${match[1]}`.trim();
}

export function period(start?: string, end?: string, current?: boolean): string {
  const from = monthYear(start);
  // Ongoing studies without a start date: "en curso" alone, not "actualidad".
  const to = current ? (from ? "actualidad" : "en curso") : monthYear(end);
  return [from, to].filter(Boolean).join(" – ");
}

const visible = <T extends { isVisible?: boolean }>(items: T[] | undefined): T[] => (items ?? []).filter((item) => item && item.isVisible !== false);

export type DocxSectionKey = "summary" | "experience" | "education" | "skills" | "languages" | "certificates" | "references";

/** Plain structure shared by the .docx builder and the tests. */
export interface DocxSection {
  key: DocxSectionKey;
  heading: string;
  blocks: Array<{ title?: string; subtitle?: string; text?: string; bullets?: string[] }>;
}

export function cvDocxContent(cv: CVData): { name: string; headline: string; contact: string; contactItems: string[]; sections: DocxSection[] } {
  const personal = cv.personal;
  const emails = visible(personal?.emails).map((item) => item.value).filter(Boolean);
  const phones = visible(personal?.phones).map((item) => item.number).filter(Boolean);
  const place = [personal?.showCity === false ? "" : personal?.city, personal?.showCountry === false ? "" : personal?.country].filter(Boolean).join(", ");
  const links = (Array.isArray(cv.settings?.hiddenSections) && cv.settings.hiddenSections.includes("links") ? [] : visible(cv.links)).map((link) => link.url).filter(Boolean);
  const sections: DocxSection[] = [];

  if (personal?.summary?.trim() && personal.showSummaryContent !== false) {
    sections.push({ key: "summary", heading: sectionTitle(cv.settings, "summary"), blocks: [{ text: personal.summary.trim() }] });
  }
  const experience = visible(cv.experience);
  if (experience.length) {
    // The public-sector form also asks for the entity's sector, office and
    // contact data, and the total time per sector.
    const dafp = cv.template === "dafp";
    const app = (cv.application || {}) as Record<string, string>;
    const time = dafp
      ? dafpTimeSummary(
          experience.map((item) => ({ sector: dafpSector(item), from: item.startDate, to: item.endDate, current: item.isCurrentPosition })),
          { public: app.dafpTimePublic, private: app.dafpTimePrivate, independent: app.dafpTimeIndependent },
        )
      : null;
    sections.push({
      key: "experience",
      heading: sectionTitle(cv.settings, "experience"),
      blocks: [
        ...experience.map((item) => ({
          title: [item.position, item.company].filter(Boolean).join(" — "),
          subtitle: [
            period(item.startDate, item.endDate, item.isCurrentPosition),
            item.location,
            ...(dafp ? [DAFP_SECTOR_TEXT[dafpSector(item)], item.dafpDepartment, item.dafpDependency] : []),
          ].map((part) => String(part || "").trim()).filter(Boolean).join(" · "),
          text: [
            item.description?.trim(),
            dafp ? [item.dafpAddress, item.dafpPhone, item.dafpEmail].map((part) => String(part || "").trim()).filter(Boolean).join(" · ") : "",
          ].filter(Boolean).join("\n") || undefined,
          bullets: (item.achievements ?? []).map((achievement) => achievement.trim()).filter(Boolean),
        })),
        ...(time && (time.public || time.private || time.independent)
          ? [{
              title: "Tiempo total de experiencia",
              bullets: [
                `Servidor público: ${time.public || "—"}`,
                `Empleado del sector privado: ${time.private || "—"}`,
                `Trabajador independiente: ${time.independent || "—"}`,
                ...(time.total ? [`Total: ${time.total}`] : []),
              ],
            }]
          : []),
      ],
    });
  }
  const education = visible(cv.education);
  if (education.length) {
    sections.push({
      key: "education",
      heading: sectionTitle(cv.settings, "education"),
      blocks: education.map((item) => ({
        // The programme ("Administración de empresas"), or the type of studies
        // in words; it used to print the internal key ("bachelor — …").
        title: educationTitle(item, getLocalizedDegreeLabel),
        subtitle: [item.institution, period(item.startDate, item.endDate, item.isCurrentlyStudying), item.location].filter(Boolean).join(" · "),
      })),
    });
  }
  const skills = visible(cv.skills).map((skill) => skill.name).filter(Boolean);
  if (skills.length) sections.push({ key: "skills", heading: sectionTitle(cv.settings, "skills"), blocks: [{ text: skills.join(" · ") }] });
  const languages = visible(cv.languages)
    .filter((item) => item.language)
    .map((item) => `${item.language}: ${LANGUAGE_LEVELS[item.speakingLevel] ?? item.speakingLevel ?? ""}`.replace(/:\s*$/, ""));
  if (languages.length) sections.push({ key: "languages", heading: sectionTitle(cv.settings, "languages"), blocks: [{ bullets: languages }] });
  const certificates = visible(cv.certificates);
  if (certificates.length) {
    sections.push({
      key: "certificates",
      heading: sectionTitle(cv.settings, "certificates"),
      blocks: certificates.map((item) => ({ title: item.title, subtitle: [item.issuingOrganization, monthYear(item.issueDate)].filter(Boolean).join(" · ") })),
    });
  }
  const references = personal?.showReferences === false ? [] : visibleReferences(personal?.references);
  if (references.length || personal?.referencesAvailableOnRequest) {
    const groups = groupReferences(references);
    sections.push({
      key: "references",
      heading: sectionTitle(cv.settings, "references"),
      blocks: [
        ...groups.flatMap((group) => [
          ...(groups.length > 1 ? [{ text: group.label }] : []),
          ...group.items.map((item) => ({
            title: referenceName(item) || undefined,
            subtitle: [groups.length > 1 ? "" : REFERENCE_TYPE_LABELS[group.type].one, ...referenceDetails(item), ...referenceContact(item)].filter(Boolean).join(" · "),
          })),
        ]),
        ...(personal?.referencesAvailableOnRequest ? [{ text: REFERENCES_ON_REQUEST_TEXT }] : []),
      ],
    });
  }

  const contactItems = [...emails, ...phones, place, ...links].filter(Boolean);
  // Sections the user hid from the CV (editor tabs) stay out of the Word file too.
  const hidden = Array.isArray(cv.settings?.hiddenSections) ? cv.settings.hiddenSections : [];
  return {
    name: personal?.showFullName === false ? "" : personal?.fullName || "",
    headline: personal?.showProfessionalTitle === false ? "" : personal?.professionalTitle || "",
    contact: contactItems.join(" · "),
    contactItems,
    sections: sections.filter((section) => !hidden.includes(section.key)),
  };
}

// ---------------------------------------------------------------------------
// Template look in Word
// ---------------------------------------------------------------------------

/** Word-safe equivalents of the editor fonts (installed with Office/Windows). */
const WORD_FONTS: Record<string, string> = {
  "inter-sans": "Calibri",
  montserrat: "Century Gothic",
  nunito: "Segoe UI",
  merriweather: "Georgia",
  playfair: "Garamond",
};

export interface DocxTheme {
  bodyFont: string;
  headingFont: string;
  /** Hex colours without "#". */
  text: string;
  muted: string;
  heading: string;
  accent: string;
  /** Page colour for the dark templates. */
  /** Dark page (text switches to light colours). */
  pageColor?: string;
  /** Light paper colour chosen by the user (text keeps its colours). */
  paperColor?: string;
  header: "left" | "centered" | "band";
  bandColor?: string;
  layout: "single" | "sidebar";
  sidebarColor?: string;
  headingStyle: "rule" | "plain" | "bar";
  headingCaps: boolean;
  nameSize: number;
  bodySize: number;
  /** Multiplier for section titles (the user's "tamaño de títulos"). */
  headingScale: number;
  photo: boolean;
  formTitle?: string;
}

const hex = (value: string | undefined, fallback: string): string => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(value || "").trim());
  return (match ? match[1] : fallback).toUpperCase();
};

/** Same rule as the editor: a stored colour equal to the old default means "not customized". */
const LEGACY_COLOR_DEFAULTS: Record<string, string> = { accentColor: "#3b82f6", headingColor: "#0f172a", textColor: "#1e293b", mutedTextColor: "#64748b" };
function customColor(settings: Record<string, unknown>, key: keyof typeof LEGACY_COLOR_DEFAULTS): string | undefined {
  const value = String(settings[key] || "").trim().toLowerCase();
  return value && value !== LEGACY_COLOR_DEFAULTS[key] ? value : undefined;
}

export function docxTheme(template: string | undefined, rawSettings?: unknown): DocxTheme {
  const s = (rawSettings ?? {}) as Record<string, unknown>;
  const light = { text: "1E293B", muted: "64748B", heading: "0F172A", accent: "0F172A" };
  const dark = { text: "F1F5F9", muted: "94A3B8", heading: "E2E8F0", accent: "E2E8F0" };
  const base: DocxTheme = {
    bodyFont: "Calibri", headingFont: "Calibri", ...light,
    header: "left", layout: "single", headingStyle: "rule", headingCaps: true, nameSize: 40, bodySize: 21, headingScale: 1, photo: false,
  };
  let theme: DocxTheme;
  switch (template) {
    case "minimal":
    case "ats":
      theme = { ...base, bodyFont: "Arial", headingFont: "Arial", nameSize: 34, bodySize: 20, photo: template === "ats" };
      break;
    case "compact":
      theme = { ...base, header: "centered", bodySize: 20 };
      break;
    case "classic":
      theme = { ...base, bodyFont: "Georgia", headingFont: "Georgia", nameSize: 44 };
      break;
    case "corporate":
      theme = { ...base, nameSize: 48, headingStyle: "plain", photo: true };
      break;
    case "developer":
      theme = { ...base, ...dark, pageColor: hex(s.developerBg as string, "0F172A"), headingStyle: "plain", nameSize: 44, photo: true };
      break;
    case "creative":
      theme = { ...base, ...dark, pageColor: "262262", accent: "C7D2FE", headingStyle: "plain", nameSize: 44, photo: true };
      break;
    case "executive":
      theme = { ...base, header: "band", bandColor: hex(s.executiveTop as string, "0F172A"), accent: hex(s.executiveAccent as string, "3B82F6"), muted: "64748B", heading: "64748B", nameSize: 44, photo: true };
      break;
    case "extensa":
      theme = { ...base, header: "band", bandColor: hex(s.executiveTop as string, "0F172A"), accent: hex((s.extensaAccent ?? s.executiveAccent) as string, "22C55E"), heading: "64748B", nameSize: 40, photo: true };
      break;
    case "timeline":
      theme = { ...base, accent: "22C55E", heading: "64748B", headingStyle: "plain", nameSize: 44 };
      break;
    case "sidebar":
      theme = { ...base, layout: "sidebar", sidebarColor: hex(s.sidebarBg as string, "0F172A"), heading: "94A3B8", headingStyle: "plain", nameSize: 36, photo: true };
      break;
    case "employment":
      theme = { ...base, bodyFont: "Arial", headingFont: "Arial", headingStyle: "bar", nameSize: 32, bodySize: 19, photo: true, formTitle: "HOJA DE VIDA · FORMATO 1003" };
      break;
    case "dafp":
      theme = { ...base, bodyFont: "Arial", headingFont: "Arial", headingStyle: "bar", header: "centered", nameSize: 30, bodySize: 19, formTitle: "FORMATO ÚNICO · HOJA DE VIDA · PERSONA NATURAL" };
      break;
    // Catalog expansion: the Word file keeps each design's character.
    case "harvard":
      theme = { ...base, bodyFont: "Georgia", headingFont: "Georgia", header: "centered", nameSize: 36 };
      break;
    case "elegante":
      theme = { ...base, bodyFont: "Georgia", headingFont: "Georgia", header: "centered", nameSize: 44, photo: true };
      break;
    case "moderna":
      theme = { ...base, headingStyle: "bar", nameSize: 48, photo: true };
      break;
    case "europea":
    case "dos-columnas":
    case "primer-empleo":
    case "competencias":
      theme = { ...base, headingStyle: "plain", nameSize: 40, photo: true };
      break;
    case "cronologica":
      theme = { ...base, nameSize: 40, photo: true };
      break;
    default:
      theme = base;
  }

  const bodyFont = normalizeCvFont(s.fontBody as string | undefined);
  const headingFont = normalizeCvFont(s.fontHeading as string | undefined);
  if (bodyFont !== TEMPLATE_FONT) theme.bodyFont = WORD_FONTS[bodyFont] ?? theme.bodyFont;
  if (headingFont !== TEMPLATE_FONT) theme.headingFont = WORD_FONTS[headingFont] ?? theme.headingFont;
  // Same size steps as the editor; Word sizes are half-points, so keep integers.
  const bodyScale = normalizeFontScale(s.fontScaleBody);
  theme.headingScale = normalizeFontScale(s.fontScaleHeading);
  theme.bodySize = Math.round(theme.bodySize * bodyScale);
  theme.nameSize = Math.round(theme.nameSize * theme.headingScale);
  const paper = pageColorFor(template, s);
  if (paper && !theme.pageColor) theme.paperColor = hex(paper, "FFFFFF");
  // Custom colours only apply on light pages; dark templates keep legible text.
  if (!theme.pageColor) {
    const text = customColor(s, "textColor");
    const muted = customColor(s, "mutedTextColor");
    const heading = customColor(s, "headingColor");
    const accent = customColor(s, "accentColor");
    if (text) theme.text = hex(text, theme.text);
    if (muted) theme.muted = hex(muted, theme.muted);
    if (heading) theme.heading = hex(heading, theme.heading);
    if (accent) theme.accent = hex(accent, theme.accent);
  }
  return theme;
}

// ---------------------------------------------------------------------------
// Document builder
// ---------------------------------------------------------------------------

type Docx = typeof import("docx");

const SIDEBAR_KEYS: DocxSectionKey[] = ["skills", "languages", "references"];

/** Decodes a data: URL or downloads the photo; returns null when it cannot be embedded. */
async function loadPhoto(source?: string): Promise<{ data: Uint8Array; type: "png" | "jpg" } | null> {
  if (!source) return null;
  try {
    const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(source);
    if (match) {
      const binary = atob(match[2]!);
      const data = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) data[i] = binary.charCodeAt(i);
      return { data, type: match[1]!.toLowerCase() === "png" ? "png" : "jpg" };
    }
    if (!/^https?:\/\//i.test(source)) return null;
    const response = await fetch(source);
    if (!response.ok) return null;
    const type = /png/i.test(response.headers.get("content-type") || "") ? "png" : /jpe?g/i.test(response.headers.get("content-type") || "") ? "jpg" : null;
    if (!type) return null;
    return { data: new Uint8Array(await response.arrayBuffer()), type };
  } catch {
    return null;
  }
}

/** Builds the CV as a docx Document styled like its template. */
export async function buildCvDocument(cv: CVData, docx: Docx) {
  const { AlignmentType, BorderStyle, Document, HeightRule, ImageRun, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } = docx;
  const content = cvDocxContent(cv);
  const theme = docxTheme(cv.template, cv.settings);
  const photo = theme.photo ? await loadPhoto(cv.personal?.profileImage) : null;

  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
  const shade = (fill: string) => ({ type: ShadingType.CLEAR, fill, color: "auto" });

  type Colors = { text: string; muted: string; heading: string; accent: string };
  const onLight: Colors = theme;
  const onDark: Colors = { text: "F1F5F9", muted: "CBD5E1", heading: "94A3B8", accent: "E2E8F0" };

  const run = (text: string, opts: Record<string, unknown> = {}) => new TextRun({ text, font: theme.bodyFont, size: theme.bodySize, color: theme.text, ...opts });

  function heading(text: string, colors: Colors) {
    const label = theme.headingCaps ? text.toUpperCase() : text;
    const isBar = theme.headingStyle === "bar";
    return new Paragraph({
      spacing: { before: 280, after: 100 },
      keepNext: true,
      ...(theme.headingStyle === "rule" ? { border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: colors.heading, space: 2 } } } : {}),
      ...(isBar ? { shading: shade("E2E8F0") } : {}),
      children: [new TextRun({ text: label, font: theme.headingFont, bold: true, size: Math.round((isBar ? 18 : 22) * theme.headingScale), characterSpacing: 30, color: isBar ? "0F172A" : colors.heading })],
    });
  }

  function sectionParagraphs(section: DocxSection, colors: Colors) {
    const out = [heading(section.heading, colors)];
    for (const block of section.blocks) {
      if (block.title) out.push(new Paragraph({ spacing: { before: 120 }, keepNext: true, children: [run(block.title, { bold: true, color: colors.text, font: theme.headingFont })] }));
      if (block.subtitle) out.push(new Paragraph({ keepNext: Boolean(block.text || block.bullets?.length), children: [run(block.subtitle, { italics: true, size: theme.bodySize - 2, color: colors.muted })] }));
      if (block.text) for (const line of block.text.split(/\n+/)) if (line.trim()) out.push(new Paragraph({ spacing: { after: 40 }, children: [run(line.trim(), { color: colors.text })] }));
      for (const bullet of block.bullets ?? []) out.push(new Paragraph({ bullet: { level: 0 }, children: [run(bullet, { color: colors.text })] }));
    }
    return out;
  }

  type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType];
  function photoParagraph(size: number, alignment: Alignment = AlignmentType.LEFT) {
    if (!photo) return null;
    return new Paragraph({ alignment, spacing: { after: 160 }, children: [new ImageRun({ type: photo.type, data: photo.data, transformation: { width: size, height: size } })] });
  }

  function headerParagraphs(colors: Colors, alignment: Alignment) {
    const out: InstanceType<typeof Paragraph>[] = [];
    if (theme.formTitle) out.push(new Paragraph({ alignment, children: [run(theme.formTitle, { size: 16, bold: true, characterSpacing: 40, color: colors.muted })] }));
    if (content.name) out.push(new Paragraph({ alignment, children: [new TextRun({ text: theme.formTitle ? content.name.toUpperCase() : content.name, font: theme.headingFont, bold: true, size: theme.nameSize, color: colors === onLight ? (theme.formTitle ? "0F172A" : theme.heading === "64748B" ? "0F172A" : theme.heading) : "FFFFFF" })] }));
    if (content.headline) out.push(new Paragraph({ alignment, children: [run(content.headline, { size: theme.bodySize + 5, color: colors.text })] }));
    if (content.contact) out.push(new Paragraph({ alignment, spacing: { before: 80 }, children: [run(content.contact, { size: theme.bodySize - 2, color: colors.muted })] }));
    return out;
  }

  const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [];
  const pageColors = theme.pageColor ? onDark : onLight;

  if (theme.layout === "sidebar") {
    const side = content.sections.filter((section) => SIDEBAR_KEYS.includes(section.key));
    const main = content.sections.filter((section) => !SIDEBAR_KEYS.includes(section.key));
    const sideChildren = [
      ...[photoParagraph(110, AlignmentType.CENTER)].filter(Boolean) as InstanceType<typeof Paragraph>[],
      heading("Contacto", onDark),
      ...content.contactItems.map((item) => new Paragraph({ spacing: { after: 40 }, children: [run(item, { size: theme.bodySize - 2, color: onDark.text })] })),
      ...side.flatMap((section) => sectionParagraphs(section, onDark)),
    ];
    const mainChildren = [
      ...(content.name ? [new Paragraph({ children: [new TextRun({ text: content.name, font: theme.headingFont, bold: true, size: theme.nameSize, color: "0F172A" })] })] : []),
      ...(content.headline ? [new Paragraph({ spacing: { after: 120 }, children: [run(content.headline, { size: theme.bodySize + 5, color: theme.muted })] })] : []),
      ...main.flatMap((section) => sectionParagraphs(section, onLight)),
    ];
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [3300, 7100],
      layout: TableLayoutType.FIXED,
      borders: noBorders,
      // At least one full A4 page (minus the 1 cm margins) so the panel reaches the bottom.
      rows: [new TableRow({ height: { value: 14400, rule: HeightRule.ATLEAST }, children: [
        new TableCell({ shading: shade(theme.sidebarColor ?? "0F172A"), margins: { top: 300, bottom: 300, left: 240, right: 240 }, children: sideChildren }),
        new TableCell({ margins: { top: 200, bottom: 200, left: 360, right: 120 }, children: mainChildren }),
      ] })],
    }));
  } else {
    if (theme.header === "band") {
      const bandText = [photoParagraph(90), ...headerParagraphs(onDark, AlignmentType.LEFT)].filter(Boolean) as InstanceType<typeof Paragraph>[];
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 24, color: theme.accent } },
        rows: [new TableRow({ children: [new TableCell({ shading: shade(theme.bandColor ?? "0F172A"), margins: { top: 300, bottom: 300, left: 300, right: 300 }, children: bandText })] })],
      }));
    } else {
      const alignment = theme.header === "centered" ? AlignmentType.CENTER : AlignmentType.LEFT;
      const picture = photoParagraph(100, alignment);
      if (picture) children.push(picture);
      children.push(...headerParagraphs(pageColors, alignment));
      if (theme.formTitle) children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "0F172A", space: 4 } }, children: [] }));
    }
    for (const section of content.sections) children.push(...sectionParagraphs(section, pageColors));
  }

  const margin = theme.layout === "sidebar" || theme.header === "band" ? 567 : 851; // 1 cm / 1.5 cm
  return new Document({
    creator: "ProCV · ProSolutions",
    title: content.name ? `Hoja de vida - ${content.name}` : "Hoja de vida",
    ...(theme.pageColor || theme.paperColor ? { background: { color: theme.pageColor ?? theme.paperColor! } } : {}),
    styles: { default: { document: { run: { font: theme.bodyFont, size: theme.bodySize, color: pageColors.text } } } },
    sections: [{ properties: { page: { margin: { top: margin, bottom: margin, left: margin, right: margin } } }, children }],
  });
}

function safeFileName(title: string | undefined, prefix: string): string {
  const base = (title || "hoja-de-vida").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return `${prefix}${base || "documento"}.docx`;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportCvDocx(cv: CVData): Promise<void> {
  const docx = await import("docx");
  const document = await buildCvDocument(cv, docx);
  download(await docx.Packer.toBlob(document), safeFileName(cv.title || cv.personal?.fullName, ""));
}

export async function exportCoverLetterDocx(cv: CVData): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
  const letter = cv.coverLetter ?? {};
  const content = cvDocxContent(cv);
  const theme = docxTheme(cv.template === "developer" || cv.template === "creative" ? "minimal" : cv.template, cv.settings);
  const font = theme.bodyFont;
  const lines = [letter.recipientName, letter.recipientTitle, letter.company, letter.companyAddress].map((line) => line?.trim()).filter(Boolean) as string[];
  const children = [
    new Paragraph({ children: [new TextRun({ text: content.name, bold: true, size: 28, font: theme.headingFont, color: theme.heading })] }),
    ...(content.headline ? [new Paragraph({ children: [new TextRun({ text: content.headline, color: theme.muted })] })] : []),
    ...(content.contact ? [new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: content.contact, size: 20, color: theme.muted })] })] : []),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 240 }, children: [new TextRun(formatLetterDate(letter.city || cv.personal?.city, letter.date))] }),
    ...lines.map((line) => new Paragraph({ children: [new TextRun(line)] })),
    ...(letter.position?.trim() ? [new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: `Asunto: postulación al cargo de ${letter.position.trim()}`, bold: true })] })] : []),
    new Paragraph({ spacing: { before: 240, after: 160 }, children: [new TextRun(letter.greeting?.trim() || defaultGreeting(letter))] }),
    ...letterParagraphs(letter.body).map((paragraph) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, children: [new TextRun(paragraph)] })),
    new Paragraph({ spacing: { before: 240 }, children: [new TextRun(letter.closing?.trim() || "Cordialmente,")] }),
    new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: content.name, bold: true, font: theme.headingFont })] }),
  ];
  const document = new Document({
    creator: "ProCV · ProSolutions",
    title: "Carta de presentación",
    styles: { default: { document: { run: { font, size: 22, color: theme.text } } } },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
  download(await Packer.toBlob(document), safeFileName(cv.title || content.name, "carta_"));
}
