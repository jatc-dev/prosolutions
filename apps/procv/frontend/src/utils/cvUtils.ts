import type { CVData, ContactItem, ContactType } from "../components/TemplateRenderer";

export function createId(): string {
  return crypto?.randomUUID?.() ?? `${Math.random().toString(16).slice(2)}`;
}

export const createEmptyContact = (): ContactItem => ({ value: "", type: "Personal" });

export function normalizeContactItems(value: unknown): ContactItem[] {
  if (!value) return [createEmptyContact()];
  if (Array.isArray(value)) {
    const result = (value as unknown[]).map((item) => {
      if (typeof item === "string") return { value: item, type: "Personal" as ContactType };
      if (item && typeof item === "object" && "value" in (item as object)) {
        const obj = item as { value?: string; type?: string };
        const type = (obj.type as ContactType) || ("Personal" as ContactType);
        return { value: String(obj.value ?? ""), type };
      }
      return { value: String(item), type: "Personal" as ContactType };
    });
    return result.length ? result : [createEmptyContact()];
  }
  if (typeof value === "string") return [{ value, type: "Personal" as ContactType }];
  return [createEmptyContact()];
}

export type SkillItem = { id: string; name: string; level?: number };
export type LanguageItem = { id: string; name: string; level?: string; certificateUrl?: string };
export type CertificateItem = { id: string; title: string; url: string };

export function normalizeSkills(value: unknown): SkillItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return (value as unknown[]).map((item) => {
      if (!item) return { id: createId(), name: "", level: 1 };
      if (typeof item === "string") return { id: item, name: item, level: 1 };
      const obj = item as { id?: string; name?: string; level?: number };
      return {
        id: (obj.id as string) ?? createId(),
        name: (obj.name as string) ?? "",
        level: typeof obj.level === "number" ? obj.level : 1,
      };
    });
  }
  return [];
}

export function normalizeLanguages(value: unknown): LanguageItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return (value as unknown[]).map((item) => {
      if (!item) return { id: createId(), name: "", level: "", certificateUrl: "" };
      if (typeof item === "string") return { id: item, name: item, level: "", certificateUrl: "" };
      const obj = item as { id?: string; name?: string; level?: string; certificateUrl?: string };
      return {
        id: (obj.id as string) ?? createId(),
        name: (obj.name as string) ?? "",
        level: (obj.level as string) ?? "",
        certificateUrl: (obj.certificateUrl as string) ?? "",
      };
    });
  }
  return [];
}

export function normalizeCertificates(value: unknown): CertificateItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return (value as unknown[]).map((item) => {
      if (!item) return { id: createId(), title: "", url: "" };
      const obj = item as { id?: string; title?: string; url?: string };
      return {
        id: (obj.id as string) ?? createId(),
        title: (obj.title as string) ?? "",
        url: (obj.url as string) ?? "",
      };
    });
  }
  return [];
}

export const emptyData: CVData = {
  personal: {
    name: "",
    role: "",
    profileImageStyle: "round",
    showProfileImage: true,
    birthDate: "",
    showBirthDate: false,
    showAge: false,
    showAddress: true,
    showCity: true,
    showCountry: true,
    address: "",
    city: "",
    country: "",
    emails: [createEmptyContact()],
    phones: [createEmptyContact()],
    valueProposition: "",
    showValuePropositionTitle: true,
    summary: "",
  },
  settings: {
    sidebarBg: "#0f172a",
    developerBg: "#0f172a",
    creativeGradient: "linear-gradient(135deg, #3730a3 0%, #0f172a 55%, #1e293b 100%)",
    creativeIntensity: "medium",
    executiveTop: "#0f172a",
    executiveAccent: "#3b82f6",
  },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certificates: [],
  links: {},
};

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function parseMonthYear(value?: string): { month: string; year: string } {
  if (!value) return { month: "", year: "" };
  if (value === "Actualmente") return { month: "", year: "" };
  const iso = /^([0-9]{4})-([0-9]{2})$/.exec(value);
  if (iso) return { year: iso[1], month: iso[2] };
  const slash = /^([0-9]{2})\/([0-9]{4})$/.exec(value);
  if (slash) return { month: slash[1], year: slash[2] };
  const named = /^([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+(\d{4})$/.exec(value);
  if (named) {
    const idx = monthNames.findIndex((m) => m.toLowerCase() === named[1].toLowerCase());
    if (idx >= 0) return { month: String(idx + 1).padStart(2, "0"), year: named[2] };
  }
  return { month: "", year: "" };
}

function buildMonthYearValue(month: string, year: string): string {
  if (!month || !year) return "";
  return `${year}-${month}`;
}
