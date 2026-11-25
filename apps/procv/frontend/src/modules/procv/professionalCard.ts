/**
 * Professional card / licence (tarjeta o matrícula profesional): number,
 * issuing body and optional issue date, each one can be hidden on the CV.
 */
export interface ProfessionalCardFields {
  professionalCardNumber?: string;
  professionalCardIssuer?: string;
  professionalCardDate?: string;
  /** false hides the whole card on the CV. */
  showProfessionalCard?: boolean;
  showProfessionalCardIssuer?: boolean;
  showProfessionalCardDate?: boolean;
}

/** Common issuing bodies in Colombia, offered as suggestions. */
export const PROFESSIONAL_CARD_ISSUERS = [
  "COPNIA (Consejo Profesional Nacional de Ingeniería)",
  "Junta Central de Contadores",
  "Consejo Profesional Nacional de Arquitectura y sus Profesiones Auxiliares",
  "Consejo Profesional de Administración de Empresas",
  "ReTHUS (Registro Único Nacional del Talento Humano en Salud)",
  "Consejo Superior de la Judicatura (Tarjeta profesional de abogado)",
  "Consejo Profesional de Economía",
  "Colegio Colombiano de Psicólogos",
  "Consejo Profesional de Química",
  "Consejo Profesional de Medicina Veterinaria y Zootecnia",
];

function formatIssueDate(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const full = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (full) return `${full[3]}/${full[2]}/${full[1]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(raw);
  if (month) return `${month[2]}/${month[1]}`;
  return raw;
}

/** Text shown on the CV ("N.º 25202-123456 · COPNIA · expedida 03/2019"), or "" when hidden or empty. */
export function professionalCardText(personal: ProfessionalCardFields | undefined): string {
  if (!personal || personal.showProfessionalCard === false) return "";
  const number = String(personal.professionalCardNumber || "").trim();
  if (!number) return "";
  const issuer = personal.showProfessionalCardIssuer === false ? "" : String(personal.professionalCardIssuer || "").trim();
  const date = personal.showProfessionalCardDate === false ? "" : formatIssueDate(personal.professionalCardDate);
  return [`N.º ${number}`, issuer, date ? `expedida ${date}` : ""].filter(Boolean).join(" · ");
}
