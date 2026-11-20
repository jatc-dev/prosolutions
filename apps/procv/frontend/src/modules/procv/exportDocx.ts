import type { CVData } from "../../types";
import { defaultGreeting, formatLetterDate, letterParagraphs } from "./coverLetter";

/**
 * Word (.docx) export built from the CV data, not from the visual template:
 * one column, standard headings, real text. That is what recruiters edit and
 * what applicant tracking systems parse best. The `docx` library is loaded on
 * demand so it never weighs on the editor's first load.
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
  const to = current ? "actualidad" : monthYear(end);
  return [from, to].filter(Boolean).join(" – ");
}

const visible = <T extends { isVisible?: boolean }>(items: T[] | undefined): T[] => (items ?? []).filter((item) => item && item.isVisible !== false);

/** Plain structure shared by the .docx builder and the tests. */
export interface DocxSection {
  heading: string;
  blocks: Array<{ title?: string; subtitle?: string; text?: string; bullets?: string[] }>;
}

export function cvDocxContent(cv: CVData): { name: string; headline: string; contact: string; sections: DocxSection[] } {
  const personal = cv.personal;
  const emails = visible(personal?.emails).map((item) => item.value).filter(Boolean);
  const phones = visible(personal?.phones).map((item) => item.number).filter(Boolean);
  const place = [personal?.showCity === false ? "" : personal?.city, personal?.showCountry === false ? "" : personal?.country].filter(Boolean).join(", ");
  const links = visible(cv.links).map((link) => link.url).filter(Boolean);
  const sections: DocxSection[] = [];

  if (personal?.summary?.trim() && personal.showSummaryContent !== false) {
    sections.push({ heading: "Perfil profesional", blocks: [{ text: personal.summary.trim() }] });
  }
  const experience = visible(cv.experience);
  if (experience.length) {
    sections.push({
      heading: "Experiencia laboral",
      blocks: experience.map((item) => ({
        title: [item.position, item.company].filter(Boolean).join(" — "),
        subtitle: [period(item.startDate, item.endDate, item.isCurrentPosition), item.location].filter(Boolean).join(" · "),
        text: item.description?.trim() || undefined,
        bullets: (item.achievements ?? []).map((achievement) => achievement.trim()).filter(Boolean),
      })),
    });
  }
  const education = visible(cv.education);
  if (education.length) {
    sections.push({
      heading: "Formación académica",
      blocks: education.map((item) => ({
        title: [item.degree, item.fieldOfStudy && item.fieldOfStudy !== item.degree ? item.fieldOfStudy : ""].filter(Boolean).join(" — "),
        subtitle: [item.institution, period(item.startDate, item.endDate, item.isCurrentlyStudying), item.location].filter(Boolean).join(" · "),
      })),
    });
  }
  const skills = visible(cv.skills).map((skill) => skill.name).filter(Boolean);
  if (skills.length) sections.push({ heading: "Habilidades", blocks: [{ text: skills.join(" · ") }] });
  const languages = visible(cv.languages)
    .filter((item) => item.language)
    .map((item) => `${item.language}: ${LANGUAGE_LEVELS[item.speakingLevel] ?? item.speakingLevel ?? ""}`.replace(/:\s*$/, ""));
  if (languages.length) sections.push({ heading: "Idiomas", blocks: [{ bullets: languages }] });
  const certificates = visible(cv.certificates);
  if (certificates.length) {
    sections.push({
      heading: "Cursos y certificaciones",
      blocks: certificates.map((item) => ({ title: item.title, subtitle: [item.issuingOrganization, monthYear(item.issueDate)].filter(Boolean).join(" · ") })),
    });
  }
  const references = personal?.showReferences === false ? [] : visible(personal?.references).filter((item) => item.name);
  if (references.length || personal?.referencesAvailableOnRequest) {
    sections.push({
      heading: "Referencias",
      blocks: [
        ...references.map((item) => {
          const hidden = item.hiddenFields ?? [];
          const show = (field: string) => !hidden.includes(field);
          const role = item.type === "laboral"
            ? [show("position") ? item.position : "", show("company") ? item.company : ""].filter(Boolean).join(", ")
            : show("relationship") ? item.relationship || item.position || "" : "";
          return {
            title: show("name") ? item.name : undefined,
            subtitle: [item.type === "laboral" ? "Laboral" : "Personal", role, show("phone") ? item.phone : "", show("email") ? item.email : ""].filter(Boolean).join(" · "),
          };
        }),
        ...(personal?.referencesAvailableOnRequest ? [{ text: "Referencias laborales y personales: disponibles a solicitud." }] : []),
      ],
    });
  }

  return {
    name: personal?.showFullName === false ? "" : personal?.fullName || "",
    headline: personal?.showProfessionalTitle === false ? "" : personal?.professionalTitle || "",
    contact: [...emails, ...phones, place, ...links].filter(Boolean).join(" · "),
    sections,
  };
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
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const content = cvDocxContent(cv);
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: content.name, bold: true })] }),
  ];
  if (content.headline) children.push(new Paragraph({ children: [new TextRun({ text: content.headline, size: 26 })] }));
  if (content.contact) children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: content.contact, size: 20 })] }));
  for (const section of content.sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 80 }, children: [new TextRun(section.heading)] }));
    for (const block of section.blocks) {
      if (block.title) children.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: block.title, bold: true })] }));
      if (block.subtitle) children.push(new Paragraph({ children: [new TextRun({ text: block.subtitle, italics: true, size: 20 })] }));
      if (block.text) for (const line of block.text.split(/\n+/)) children.push(new Paragraph({ children: [new TextRun(line.trim())] }));
      for (const bullet of block.bullets ?? []) children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(bullet)] }));
    }
  }
  const document = new Document({
    creator: "ProCV · ProSolutions",
    title: content.name ? `Hoja de vida - ${content.name}` : "Hoja de vida",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  download(await Packer.toBlob(document), safeFileName(cv.title || content.name, ""));
}

export async function exportCoverLetterDocx(cv: CVData): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
  const letter = cv.coverLetter ?? {};
  const content = cvDocxContent(cv);
  const lines = [letter.recipientName, letter.recipientTitle, letter.company, letter.companyAddress].map((line) => line?.trim()).filter(Boolean) as string[];
  const children = [
    new Paragraph({ children: [new TextRun({ text: content.name, bold: true, size: 28 })] }),
    ...(content.headline ? [new Paragraph({ children: [new TextRun(content.headline)] })] : []),
    ...(content.contact ? [new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: content.contact, size: 20 })] })] : []),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 240 }, children: [new TextRun(formatLetterDate(letter.city || cv.personal?.city, letter.date))] }),
    ...lines.map((line) => new Paragraph({ children: [new TextRun(line)] })),
    ...(letter.position?.trim() ? [new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: `Asunto: postulación al cargo de ${letter.position.trim()}`, bold: true })] })] : []),
    new Paragraph({ spacing: { before: 240, after: 160 }, children: [new TextRun(letter.greeting?.trim() || defaultGreeting(letter))] }),
    ...letterParagraphs(letter.body).map((paragraph) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, children: [new TextRun(paragraph)] })),
    new Paragraph({ spacing: { before: 240 }, children: [new TextRun(letter.closing?.trim() || "Cordialmente,")] }),
    new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: content.name, bold: true })] }),
  ];
  const document = new Document({
    creator: "ProCV · ProSolutions",
    title: "Carta de presentación",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  download(await Packer.toBlob(document), safeFileName(cv.title || content.name, "carta_"));
}
