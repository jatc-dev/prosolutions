import type { ContactType } from "../components/TemplateRenderer";
import type { PersonalData } from "../types";

type WorkspaceContactItem = {
  id?: string;
  value?: string;
  type?: string;
  isPrimary?: boolean;
};

type WorkspacePersonalLike = {
  name?: string;
  role?: string;
  summary?: string;
  valueProposition?: string;
  showValuePropositionTitle?: boolean;
  showValuePropositionContent?: boolean;
  showSummaryTitle?: boolean;
  showSummaryContent?: boolean;
  sidebarIntroMode?: PersonalData["sidebarIntroMode"];
  documentType?: string;
  documentNumber?: string;
  showDocumentIdentity?: boolean;
  references?: PersonalData["references"];
  showReferences?: boolean;
  referencesAvailableOnRequest?: boolean;
  nationality?: string;
  profileImage?: string;
  profileImageStyle?: "round" | "square" | "portrait";
  showProfileImage?: boolean;
  birthDate?: string;
  showBirthDate?: boolean;
  showAge?: boolean;
  address?: string;
  city?: string;
  country?: string;
  showAddress?: boolean;
  showCity?: boolean;
  showCountry?: boolean;
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  emails?: WorkspaceContactItem[];
  phones?: WorkspaceContactItem[];
};

const mapWorkspaceEmailTypeToEditor = (rawType?: string): PersonalData["emails"][number]["type"] => {
  const normalized = (rawType || "").trim().toLowerCase();
  if (!normalized) return "personal";
  if (["personal"].includes(normalized)) return "personal";
  if (["trabajo", "laboral", "work"].includes(normalized)) return "work";
  if (["institucional", "educativo", "universitario", "education"].includes(normalized)) return "education";
  return "other";
};

const mapWorkspacePhoneTypeToEditor = (rawType?: string): PersonalData["phones"][number]["type"] => {
  const normalized = (rawType || "").trim().toLowerCase();
  if (!normalized) return "personal";
  if (normalized === "personal") return "personal";
  if (["oficina", "office"].includes(normalized)) return "office";
  if (normalized === "casa" || normalized === "home") return "home";
  if (normalized === "whatsapp") return "whatsapp";
  return "other";
};

const mapEditorEmailTypeToWorkspace = (
  type: PersonalData["emails"][number]["type"],
  label?: string
): ContactType => {
  if (type === "personal") return "Personal";
  if (type === "work") return "Laboral";
  if (type === "education") return "Institucional";
  return ((label || "").trim() || "Otro") as ContactType;
};

const mapEditorPhoneTypeToWorkspace = (
  type: PersonalData["phones"][number]["type"],
  label?: string
): ContactType => {
  if (type === "personal") return "Personal";
  if (type === "office") return "Oficina";
  if (type === "home") return "Casa";
  if (type === "whatsapp") return "WhatsApp";
  return ((label || "").trim() || "Otro") as ContactType;
};

export function toEditorPersonalData(
  workspacePersonal: WorkspacePersonalLike | undefined,
  generateId: () => string
): PersonalData {
  const source = workspacePersonal || {};
  const sourceEmails = source.emails || [];
  const sourcePhones = source.phones || [];

  const emails = sourceEmails.map((e) => ({
    id: e?.id || generateId(),
    type: mapWorkspaceEmailTypeToEditor(e?.type),
    label: e?.type || "",
    value: e?.value || "",
    isPrimary: Boolean(e?.isPrimary),
  }));

  const phones = sourcePhones.map((p) => ({
    id: p?.id || generateId(),
    type: mapWorkspacePhoneTypeToEditor(p?.type),
    number: p?.value || "",
    label: p?.type || "",
    isPrimary: Boolean(p?.isPrimary),
  }));

  const hasExplicitEmailPrimaryFlag = sourceEmails.some((email) => typeof email?.isPrimary === "boolean");
  if (!hasExplicitEmailPrimaryFlag && emails.length > 0 && !emails.some((email) => email.isPrimary)) {
    emails[0].isPrimary = true;
  }

  const hasExplicitPhonePrimaryFlag = sourcePhones.some((phone) => typeof phone?.isPrimary === "boolean");
  if (!hasExplicitPhonePrimaryFlag && phones.length > 0 && !phones.some((phone) => phone.isPrimary)) {
    phones[0].isPrimary = true;
  }

  return {
    fullName: source.name || "",
    professionalTitle: source.role || "",
    emails,
    phones,
    valueProposition: source.valueProposition || "",
    showValuePropositionTitle: source.showValuePropositionTitle !== false,
    showValuePropositionContent: source.showValuePropositionContent !== false,
    summary: source.summary || "",
    showSummaryTitle: source.showSummaryTitle !== false,
    showSummaryContent: source.showSummaryContent !== false,
    profileImage: source.profileImage || "",
    profileImageStyle: source.profileImageStyle || "round",
    showProfileImage: source.showProfileImage !== false,
    birthDate: source.birthDate || "",
    showBirthDate: Boolean(source.showBirthDate),
    showAge: Boolean(source.showAge),
    address: source.address || "",
    city: source.city || "",
    country: source.country || "",
    showAddress: source.showAddress !== false,
    showCity: source.showCity !== false,
    showCountry: source.showCountry !== false,
    website: source.website || "",
    linkedin: source.linkedin || "",
    github: source.github || "",
    twitter: source.twitter || "",
  };
}

export function toWorkspacePersonalData(
  editorPersonal: PersonalData,
  previousPersonal?: WorkspacePersonalLike
): WorkspacePersonalLike {
  return {
    ...(previousPersonal || {}),
    name: editorPersonal.fullName,
    role: editorPersonal.professionalTitle,
    valueProposition: editorPersonal.valueProposition,
    showValuePropositionTitle: editorPersonal.showValuePropositionTitle !== false,
    showValuePropositionContent: editorPersonal.showValuePropositionContent !== false,
    showSummaryTitle: editorPersonal.showSummaryTitle !== false,
    showSummaryContent: editorPersonal.showSummaryContent !== false,
    sidebarIntroMode: 'valueProposition',
    documentType: editorPersonal.documentType || '',
    documentNumber: editorPersonal.documentNumber || '',
    showDocumentIdentity: Boolean(editorPersonal.showDocumentIdentity),
    references: editorPersonal.references || [],
    showReferences: editorPersonal.showReferences !== false,
    referencesAvailableOnRequest: Boolean(editorPersonal.referencesAvailableOnRequest),
    nationality: editorPersonal.nationality || '',
    summary: editorPersonal.summary,
    birthDate: editorPersonal.birthDate,
    showBirthDate: Boolean(editorPersonal.showBirthDate),
    showAge: Boolean(editorPersonal.showAge),
    profileImage: editorPersonal.profileImage,
    profileImageStyle: editorPersonal.profileImageStyle || "round",
    showProfileImage: editorPersonal.showProfileImage !== false,
    address: editorPersonal.address,
    city: editorPersonal.city,
    country: editorPersonal.country,
    showAddress: editorPersonal.showAddress !== false,
    showCity: editorPersonal.showCity !== false,
    showCountry: editorPersonal.showCountry !== false,
    website: editorPersonal.website,
    linkedin: editorPersonal.linkedin,
    github: editorPersonal.github,
    twitter: editorPersonal.twitter,
    emails: editorPersonal.emails.map((e) => ({
      id: e.id,
      value: e.value,
      type: mapEditorEmailTypeToWorkspace(e.type, e.label),
      isPrimary: Boolean(e.isPrimary),
    })),
    phones: editorPersonal.phones.map((p) => ({
      id: p.id,
      value: p.number,
      type: mapEditorPhoneTypeToWorkspace(p.type, p.label),
      isPrimary: Boolean(p.isPrimary),
    })),
  };
}
