import type { CVData } from "../../types";
import { dafpSector, dafpTimeSummary } from "./dafpExperience";
import { dafpGraduated, educationTitle, inferDafpModality } from "./education";
import { personNames, splitSurnames } from "./personName";
import { professionalCardText } from "./professionalCard";
import { dafpLanguageLevel, formatBirthDate, formatCountry, formatMonthYear, getLocalizedDegreeLabel } from "./components/TemplateRenderer";

/**
 * Word file of the Colombian public-sector form (Formato Único de Hoja de
 * Vida – Persona Natural): bordered boxes like the official form and the
 * preview, instead of the regular CV layout. dafpFormModel() holds the
 * content (shared with the tests); buildDafpDocument() draws it.
 */

export interface DafpCell {
  label: string;
  value: string;
  /** Spans both columns. */
  wide?: boolean;
}

export type DafpBlock =
  | { kind: "grid"; cells: DafpCell[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  /** One job: its caption and fields, kept on one page. */
  | { kind: "job"; caption: string; cells: DafpCell[] }
  | { kind: "declaration"; ineligible: "si" | "no" | ""; place: string };

export interface DafpSection {
  title: string;
  blocks: DafpBlock[];
}

const SPANISH_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const spanishDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${Number(match[3])} de ${SPANISH_MONTHS[Number(match[2]) - 1] ?? ""} de ${match[1]}` : value.trim();
};
const clean = (value: unknown) => String(value ?? "").trim();
const plain = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const DAFP_DECLARATION =
  "me encuentro dentro de las causales de inhabilidad e incompatibilidad del orden constitucional o legal para ejercer cargos o empleos públicos o para celebrar contratos de prestación de servicios con la administración pública. Para todos los efectos legales, certifico que los datos por mí anotados en el presente formato único de hoja de vida son veraces (artículo 5.º de la Ley 190 de 1995).";

export function dafpFormModel(cv: CVData): DafpSection[] {
  const app = cv.application || {};
  const value = (key: string) => clean(app[key]);
  const personal = cv.personal;
  const hidden = Array.isArray(cv.settings?.hiddenSections) ? cv.settings.hiddenSections : [];
  const visible = <T extends { isVisible?: boolean }>(key: string, items: T[] | undefined) => (hidden.includes(key) ? [] : (items ?? []).filter((item) => item && item.isVisible !== false));

  const names = personal?.showFullName === false ? { firstName: "", lastName: "" } : personNames(personal);
  const surnames = names.lastName ? splitSurnames(names.lastName) : { first: value("dafpFirstSurname"), second: value("dafpSecondSurname") };
  const givenNames = names.firstName || value("dafpGivenNames");
  const documentText = [personal?.showDocumentType === false ? "" : personal?.documentType, personal?.showDocumentNumber === false ? "" : personal?.documentNumber].map(clean).filter(Boolean).join(" ");
  const emails = (personal?.emails ?? []).filter((item) => item.isVisible !== false).map((item) => clean(item.value)).filter(Boolean);
  const phones = (personal?.phones ?? []).filter((item) => item.isVisible !== false).map((item) => clean(item.number)).filter(Boolean);
  const address = [
    personal?.showAddress === false ? "" : personal?.address,
    personal?.showCity === false ? "" : personal?.city,
    personal?.showCountry === false ? "" : formatCountry(personal?.country),
  ].map(clean).filter(Boolean).join(", ");

  const sections: DafpSection[] = [
    {
      title: "1. Datos personales",
      blocks: [{
        kind: "grid",
        cells: [
          { label: "Primer apellido", value: surnames.first },
          { label: "Segundo apellido", value: surnames.second },
          { label: "Nombres", value: givenNames, wide: true },
          { label: "Documento de identificación", value: documentText },
          { label: "Sexo", value: value("dafpSex").toUpperCase() },
          { label: "Nacionalidad", value: personal?.showNationality === false ? "" : formatCountry(personal?.nationality) },
          { label: "Libreta militar", value: value("dafpMilitaryCard") },
          { label: "Fecha de nacimiento", value: formatBirthDate(personal?.birthDate) },
          { label: "Lugar de nacimiento", value: value("dafpBirthPlace") },
          { label: "Dirección de correspondencia", value: address, wide: true },
          { label: "Teléfono", value: phones.join(" · ") },
          { label: "Correo electrónico", value: emails.join(" · ") },
        ],
      }],
    },
  ];

  // 2. Education, professional card and languages.
  const education: DafpBlock[] = [];
  if (value("dafpLastGrade") || value("dafpSchoolTitle")) {
    education.push({
      kind: "grid",
      cells: [
        { label: "Educación básica y media: último grado aprobado", value: value("dafpLastGrade") },
        { label: "Título obtenido", value: value("dafpSchoolTitle") },
        { label: "Fecha de grado", value: value("dafpSchoolDate"), wide: true },
      ],
    });
  }
  const higher = visible("education", cv.education).filter((item) => item.degree !== "high-school");
  if (higher.length) {
    education.push({
      kind: "table",
      head: ["Modalidad", "Semestres", "Graduado", "Educación superior: estudios o título", "Institución", "Terminación"],
      rows: higher.map((item) => [
        clean(item.dafpModality) || inferDafpModality(item.degree),
        clean(item.dafpSemesters),
        dafpGraduated(item),
        educationTitle(item, getLocalizedDegreeLabel),
        clean(item.institution),
        item.isCurrentlyStudying || !clean(item.endDate) ? "En curso" : formatMonthYear(item.endDate),
      ]),
    });
  }
  const card = value("dafpProfessionalCard") || professionalCardText(personal);
  if (card) education.push({ kind: "grid", cells: [{ label: "Tarjeta o matrícula profesional", value: card, wide: true }] });
  const languages = visible("languages", cv.languages).filter((item) => clean(item.language));
  if (languages.length) {
    education.push({
      kind: "table",
      head: ["Idioma", "Lo habla / lo lee / lo escribe"],
      rows: languages.map((item) => [clean(item.language), dafpLanguageLevel(item.listeningLevel || item.speakingLevel)]),
    });
  }
  if (education.length) sections.push({ title: "2. Formación académica", blocks: education });

  // 3. Each job, current first, with the fields of the official form.
  const jobs = visible("experience", cv.experience);
  if (jobs.length) {
    sections.push({
      title: "3. Experiencia laboral",
      blocks: jobs.map((item) => {
        const current = Boolean(item.isCurrentPosition) || !clean(item.endDate);
        const sector = dafpSector(item);
        const [city = "", country = ""] = clean(item.location).split(",").map((part) => part.trim());
        return {
          kind: "job" as const,
          caption: current ? "Empleo actual o contrato vigente" : "Empleo o contrato anterior",
          cells: [
            { label: "Empresa o entidad", value: clean(item.company), wide: true },
            { label: "Tipo de entidad", value: sector === "independent" ? "Trabajador independiente" : `Pública ${sector === "public" ? "☒" : "☐"}   Privada ${sector === "private" ? "☒" : "☐"}` },
            { label: "País", value: formatCountry(country) },
            { label: "Departamento", value: clean(item.dafpDepartment) },
            { label: "Municipio", value: city },
            { label: "Correo electrónico de la entidad", value: clean(item.dafpEmail) },
            { label: "Teléfonos", value: clean(item.dafpPhone) },
            { label: "Fecha de ingreso", value: formatMonthYear(item.startDate) },
            { label: "Fecha de retiro", value: current ? "Actual" : formatMonthYear(item.endDate) },
            { label: "Cargo o contrato", value: clean(item.position) },
            { label: "Dependencia", value: clean(item.dafpDependency) },
            { label: "Dirección", value: clean(item.dafpAddress), wide: true },
          ],
        };
      }),
    });
  }

  // 4. Total time, computed from the jobs unless the person typed it.
  const time = dafpTimeSummary(
    jobs.map((item) => ({ sector: dafpSector(item), from: item.startDate, to: item.endDate, current: item.isCurrentPosition })),
    { public: value("dafpTimePublic"), private: value("dafpTimePrivate"), independent: value("dafpTimeIndependent") },
  );
  if (time.public || time.private || time.independent) {
    sections.push({
      title: "4. Tiempo total de experiencia",
      blocks: [{
        kind: "grid",
        cells: [
          { label: "Servidor público", value: time.public || "—" },
          { label: "Empleado del sector privado", value: time.private || "—" },
          { label: "Trabajador independiente", value: time.independent || "—" },
          { label: "Total tiempo de experiencia", value: time.total },
        ],
      }],
    });
  }

  const ineligible = plain(value("dafpIneligible"));
  sections.push({
    title: "5. Firma del servidor público o contratista",
    blocks: [{
      kind: "declaration",
      ineligible: ineligible.startsWith("s") ? "si" : ineligible.startsWith("n") ? "no" : "",
      place: [value("dafpSignPlace"), spanishDate(value("dafpSignDate"))].filter(Boolean).join(", "),
    }],
  });
  return sections;
}

type Docx = typeof import("docx");

/** A4 width minus 1.27 cm margins, in twips. */
const MARGIN = 720;
const CONTENT_WIDTH = 11906 - 2 * MARGIN;
const LINE = "94A3B8";

export function buildDafpDocument(cv: CVData, docx: Docx) {
  const { AlignmentType, BorderStyle, Document, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } = docx;
  const FONT = "Arial";
  const line = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line };
  const shade = (fill: string) => ({ type: ShadingType.CLEAR, fill, color: "auto" });
  const text = (value: string, opts: Record<string, unknown> = {}) => new TextRun({ text: value, font: FONT, size: 19, color: "0F172A", ...opts });
  const margins = { top: 50, bottom: 50, left: 100, right: 100 };
  type Block = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;

  const table = (rows: InstanceType<typeof TableRow>[], columnWidths: number[]) =>
    new Table({ rows, borders, layout: TableLayoutType.FIXED, columnWidths, width: { size: CONTENT_WIDTH, type: WidthType.DXA } });

  /** Label over value, as in the official form. keepNext glues a job's rows together. */
  const fieldCell = (cell: DafpCell, width: number, keepNext: boolean) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      columnSpan: cell.wide ? 2 : 1,
      margins,
      children: [
        new Paragraph({ keepNext: true, children: [text(cell.label.toUpperCase(), { size: 14, bold: true, color: "64748B" })] }),
        // An empty box keeps its height so the grid reads like the form.
        new Paragraph({ keepNext, children: [text(cell.value || " ")] }),
      ],
    });

  /** Pairs the cells two per row; a wide cell takes a row of its own. */
  function grid(cells: DafpCell[], keep = false) {
    const half = CONTENT_WIDTH / 2;
    const rows: DafpCell[][] = [];
    let pending: DafpCell | null = null;
    for (const cell of cells) {
      if (cell.wide) {
        if (pending) rows.push([pending, { label: "", value: "" }]);
        pending = null;
        rows.push([cell]);
      } else if (pending) {
        rows.push([pending, cell]);
        pending = null;
      } else {
        pending = cell;
      }
    }
    if (pending) rows.push([pending, { label: "", value: "" }]);
    return table(
      rows.map((row, index) => new TableRow({
        cantSplit: true,
        children: row.map((cell) => fieldCell(cell, cell.wide ? CONTENT_WIDTH : half, keep && index < rows.length - 1)),
      })),
      [half, half],
    );
  }

  function dataTable(head: string[], rows: string[][]) {
    // The title column is wider; the rest share what is left.
    const titleIndex = head.findIndex((label) => /título/i.test(label));
    const widths = head.map((_, index) => (titleIndex === index ? 0.34 : titleIndex >= 0 ? 0.66 / (head.length - 1) : 1 / head.length) * CONTENT_WIDTH).map(Math.floor);
    const headerRow = new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: head.map((label, index) => new TableCell({ width: { size: widths[index]!, type: WidthType.DXA }, margins, shading: shade("F1F5F9"), children: [new Paragraph({ keepNext: true, children: [text(label.toUpperCase(), { size: 14, bold: true, color: "64748B" })] })] })),
    });
    const bodyRows = rows.map((row) => new TableRow({
      cantSplit: true,
      children: row.map((value, index) => new TableCell({ width: { size: widths[index]!, type: WidthType.DXA }, margins, children: [new Paragraph({ alignment: index < 3 && head.length > 3 ? AlignmentType.CENTER : AlignmentType.LEFT, children: [text(value || " ", index === (titleIndex >= 0 ? titleIndex : 0) ? { bold: true } : {})] })] })),
    }));
    return table([headerRow, ...bodyRows], widths);
  }

  const sectionTitle = (title: string) =>
    table([new TableRow({ cantSplit: true, children: [new TableCell({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, margins, shading: shade("E2E8F0"), children: [new Paragraph({ keepNext: true, children: [text(title.toUpperCase(), { size: 18, bold: true })] })] })] })], [CONTENT_WIDTH]);

  const spacer = (keepNext = false) => new Paragraph({ keepNext, spacing: { after: 0 }, children: [text("", { size: 8 })] });

  const children: Block[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [text("FORMATO ÚNICO · HOJA DE VIDA", { size: 16, bold: true, color: "64748B", characterSpacing: 40 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [text("PERSONA NATURAL", { size: 30, bold: true })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "0F172A", space: 6 } },
      children: [text("Leyes 190 de 1995, 489 y 443 de 1998", { size: 16, color: "475569" })],
    }),
  ];

  for (const section of dafpFormModel(cv)) {
    children.push(new Paragraph({ spacing: { before: 160 }, keepNext: true, children: [] }));
    children.push(sectionTitle(section.title));
    section.blocks.forEach((block, index) => {
      if (index > 0) children.push(spacer(block.kind === "job"));
      if (block.kind === "grid") children.push(grid(block.cells));
      else if (block.kind === "table") children.push(dataTable(block.head, block.rows));
      else if (block.kind === "job") {
        children.push(table([new TableRow({ cantSplit: true, children: [new TableCell({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, margins, shading: shade("F8FAFC"), children: [new Paragraph({ keepNext: true, children: [text(block.caption.toUpperCase(), { size: 14, bold: true, color: "475569" })] })] })] })], [CONTENT_WIDTH]));
        children.push(grid(block.cells, true));
      } else {
        const box = (checked: boolean) => (checked ? "☒" : "☐");
        children.push(table([new TableRow({
          cantSplit: true,
          children: [new TableCell({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              children: [
                text("Manifiesto bajo la gravedad del juramento que ", { size: 17 }),
                text(`SÍ ${box(block.ineligible === "si")}  NO ${box(block.ineligible === "no")}`, { size: 17, bold: true }),
                text(` ${DAFP_DECLARATION}`, { size: 17 }),
              ],
            })],
          })],
        })], [CONTENT_WIDTH]));
        const half = CONTENT_WIDTH / 2;
        const documentText = [cv.personal?.documentType, cv.personal?.documentNumber].map(clean).filter(Boolean).join(" ");
        const signature = (value: string, label: string) => new TableCell({
          width: { size: half, type: WidthType.DXA },
          margins: { top: 600, bottom: 60, left: 120, right: 240 },
          borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
          children: [
            new Paragraph({ keepNext: true, children: [text(value || " ")] }),
            new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: "0F172A", space: 2 } }, children: [text(label, { size: 17 })] }),
          ],
        });
        children.push(new Table({
          layout: TableLayoutType.FIXED,
          columnWidths: [half, half],
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
          rows: [new TableRow({ cantSplit: true, children: [signature(block.place, "Lugar y fecha de diligenciamiento"), signature("", `Firma${documentText ? ` · ${documentText}` : ""}`)] })],
        }));
      }
    });
  }

  const name = [cv.personal?.firstName, cv.personal?.lastName].map(clean).filter(Boolean).join(" ") || clean(cv.personal?.fullName);
  return new Document({
    creator: "ProCV · ProSolutions",
    title: name ? `Formato único de hoja de vida - ${name}` : "Formato único de hoja de vida",
    styles: { default: { document: { run: { font: FONT, size: 19 } } } },
    sections: [{ properties: { page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children }],
  });
}
