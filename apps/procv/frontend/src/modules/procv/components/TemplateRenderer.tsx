import React from "react";
import i18n from "../../../shared/i18n";

export type ContactType =
  | "Personal"
  | "Trabajo"
  | "Laboral"
  | "Institucional"
  | "Universitario"
  | "Educativo"
  | "Oficina"
  | "Casa"
  | "WhatsApp"
  | "Otro";

export interface ContactItem {
  value: string;
  isVisible?: boolean;
  type: ContactType;
}

export interface CVData {
  personal?: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    emails?: ContactItem[];
    phones?: ContactItem[];
    address?: string;
    city?: string;
    country?: string;
    nationality?: string;
    showAddress?: boolean;
    showCity?: boolean;
    showCountry?: boolean;
    valueProposition?: string;
    showValuePropositionTitle?: boolean;
    showValuePropositionContent?: boolean;
    summary?: string;
    showSummaryTitle?: boolean;
    showSummaryContent?: boolean;
    profileImage?: string;
    profileImageStyle?: "round" | "square" | "portrait";
    profileImageSize?: "sm" | "md" | "lg" | "xl";
    showProfileImage?: boolean;
    documentType?: string;
    documentNumber?: string;
    showDocumentIdentity?: boolean;
    sidebarIntroMode?: "valueProposition" | "summary" | "none";
    references?: Array<{ id: string; isVisible?: boolean; hiddenFields?: string[]; type: "personal" | "laboral"; name: string; position?: string; company?: string; relationship?: string; phone?: string; email?: string }>;
    showReferences?: boolean;
    referencesAvailableOnRequest?: boolean;
    birthDate?: string;
    showBirthDate?: boolean;
    showAge?: boolean;
  };
  settings?: {
    sidebarBg?: string;
    developerBg?: string;
    creativeGradient?: string;
    creativeIntensity?: "soft" | "medium" | "strong";
    executiveTop?: string;
    executiveAccent?: string;
    extensaTop?: string;
    extensaAccent?: string;
    extensaDensity?: "normal" | "compact";
    // Personalización avanzada
    fontBody?: string;
    fontHeading?: string;
    density?: "compact" | "balanced" | "spacious";
    sectionSpacing?: number;
    showSectionIcons?: boolean;
    accentColor?: string;
    headingColor?: string;
    textColor?: string;
    mutedTextColor?: string;
    linkColor?: string;
    sidebarTextColor?: string;
    sidebarSectionTitleColor?: string;
  };
  experience?: Array<{
    id: string;
    company: string;
    role: string;
    from: string;
    to?: string;
    description?: string;
    city?: string;
    country?: string;
  }>;
  education?: Array<{
    id: string;
    institution: string;
    degree: string;
    from: string;
    to?: string;
    city?: string;
    country?: string;
  }>;
  skills?: Array<{ id: string; name: string; level?: number }>;
  languages?: Array<{ id: string; name: string; level?: string; certificateUrl?: string }>;
  certificates?: Array<{
    id: string;
    title: string;
    url?: string;
    verificationUrl?: string;
    issuingOrganization?: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  links?: Record<string, string>;
  application?: Record<string, string>;
}


// ATS-Optimized Power Verbs and Achievement Phrases Database
const POWER_VERBS = {
  quantitative: [
    "Increased revenue by {percentage}%",
    "Reduced costs by {percentage}%",
    "Improved efficiency by {percentage}%",
    "Grew user base by {number}%",
    "Boosted conversion rate by {percentage}%",
    "Generated {currency}{amount} in sales",
    "Saved {currency}{amount} annually",
    "Managed budget of {currency}{amount}"
  ],
  qualitative: [
    "Successfully led cross-functional team",
    "Implemented industry best practices",
    "Received recognition for excellence",
    "Mentored junior team members",
    "Established new processes and procedures",
    "Collaborated with stakeholders globally",
    "Delivered projects ahead of schedule",
    "Received positive feedback from clients"
  ],
  technical: [
    "Developed and deployed scalable solutions",
    "Optimized system performance by {percentage}%",
    "Implemented automated testing frameworks",
    "Designed and built RESTful APIs",
    "Architected microservices infrastructure",
    "Migrated legacy systems to modern platforms",
    "Enhanced security protocols and compliance",
    "Integrated third-party services seamlessly"
  ],
  general: [
    "Achieved project goals on time",
    "Demonstrated strong communication skills",
    "Adapted to new challenges quickly",
    "Contributed to team success",
    "Provided excellent customer service",
    "Resolved conflicts effectively",
    "Maintained high quality standards",
    "Supported organizational growth",
    "Improved internal processes",
    "Exceeded performance expectations"
  ]
};

const ACHIEVEMENT_PHRASES = {
  quantitative: [
    "Increased sales by {percentage}% in one year",
    "Reduced operational costs by {currency}{amount}",
    "Improved customer satisfaction scores by {number} points"
  ],
  qualitative: [
    "Recognized for outstanding leadership",
    "Awarded for innovative project delivery"
  ],
  technical: [
    "Implemented a new automation system that reduced errors by {percentage}%",
    "Migrated legacy systems to cloud infrastructure"
  ]
};

const EDUCATION_DEGREE_TRANSLATION_KEYS: Record<string, string> = {
  "high-school": "highSchool",
  associate: "associate",
  bachelor: "bachelor",
  master: "master",
  doctorate: "doctorate",
  "post-doctorate": "postDoctorate",
  certificate: "certificate",
  diploma: "diploma",
  other: "other",
};

function getLocalizedDegreeLabel(rawDegree?: string): string {
  const degree = String(rawDegree || "").trim();
  if (!degree) {
    return "Título";
  }

  const degreeKey = EDUCATION_DEGREE_TRANSLATION_KEYS[degree];
  if (!degreeKey) {
    return degree;
  }

  const translationKey = `editor.education.degreeTypes.${degreeKey}`;
  const translated = i18n.t(translationKey);
  return translated && translated !== translationKey ? translated : degree;
}

// Job Title Analysis for Contextual Suggestions
function analyzeJobTitle(title: string): string[] {
  const title_lower = title.toLowerCase();
  const categories: string[] = [];

  if (title_lower.includes('manager') || title_lower.includes('director') || title_lower.includes('lead') || title_lower.includes('supervisor')) {
    categories.push('management');
  }
  if (title_lower.includes('developer') || title_lower.includes('engineer') || title_lower.includes('programmer') || title_lower.includes('analyst')) {
    categories.push('technical');
  }
  if (title_lower.includes('sales') || title_lower.includes('account') || title_lower.includes('business development')) {
    categories.push('sales');
  }
  if (title_lower.includes('marketing') || title_lower.includes('brand') || title_lower.includes('content') || title_lower.includes('social')) {
    categories.push('marketing');
  }
  if (title_lower.includes('finance') || title_lower.includes('financial') || title_lower.includes('accountant') || title_lower.includes('analyst')) {
    categories.push('finance');
  }
  if (title_lower.includes('design') || title_lower.includes('creative') || title_lower.includes('artist') || title_lower.includes('ux')) {
    categories.push('creative');
  }

  return categories.length > 0 ? categories : ['general'];
}

function getSuggestedVerbs(jobTitle: string): string[] {
  const categories = analyzeJobTitle(jobTitle);
  const verbs: string[] = [];

  categories.forEach(category => {
    const categoryVerbs = POWER_VERBS[category as keyof typeof POWER_VERBS];
    if (categoryVerbs) {
      verbs.push(...categoryVerbs.slice(0, 5)); // Top 5 verbs per category
    }
  });

  // Add general verbs if we have less than 10
  if (verbs.length < 10) {
    verbs.push(...POWER_VERBS.general.slice(0, 10 - verbs.length));
  }

  return [...new Set(verbs)]; // Remove duplicates
}

function getSuggestedAchievements(jobTitle: string): string[] {
  const categories = analyzeJobTitle(jobTitle);
  const suggestions: string[] = [];

  // Add quantitative achievements
  suggestions.push(...ACHIEVEMENT_PHRASES.quantitative.slice(0, 3));

  // Add category-specific achievements
  if (categories.includes('technical')) {
    suggestions.push(...ACHIEVEMENT_PHRASES.technical.slice(0, 2));
  } else {
    suggestions.push(...ACHIEVEMENT_PHRASES.qualitative.slice(0, 2));
  }

  return suggestions;
}

interface Props {
  template: string;
  data: CVData;
}

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function parseMonthYear(value?: string) {
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

function formatMonthYear(value?: string) {
  if (!value) return "";
  if (value === "Actualmente") return "Actualmente";

  const isoDate = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (isoDate) {
    const [, year, month] = isoDate;
    const idx = Number(month) - 1;
    return `${monthNames[idx] ?? month} de ${year}`;
  }

  const isoDateTime = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T/.exec(value);
  if (isoDateTime) {
    const [, year, month] = isoDateTime;
    const idx = Number(month) - 1;
    return `${monthNames[idx] ?? month} de ${year}`;
  }

  const { month, year } = parseMonthYear(value);
  if (!month || !year) return value;
  const idx = Number(month) - 1;
  return `${monthNames[idx] ?? month} de ${year}`;
}

function formatCertificatePeriod(issueDate?: string, expiryDate?: string) {
  const issued = formatMonthYear(issueDate);
  const expires = formatMonthYear(expiryDate);

  if (issued && expires) return `Expedición: ${issued} • Vence: ${expires}`;
  if (issued) return `Expedición: ${issued}`;
  if (expires) return `Vence: ${expires}`;
  return "";
}

function formatRange(from?: string, to?: string) {
  if (!from) return "";
  if (!to) return formatMonthYear(from);
  return `${formatMonthYear(from)} – ${formatMonthYear(to)}`;
}

function formatCountry(value?: string) {
  const country = String(value || "").trim();
  if (!country) return "";
  if (/^[A-Z]{2}$/.test(country)) {
    try {
      return new Intl.DisplayNames([i18n.language || "es"], { type: "region" }).of(country) || country;
    } catch {
      // Keep the stored value if the runtime cannot format the region code.
    }
  }
  return country;
}

function formatLocation(city?: string, country?: string) {
  const parts = [city?.trim(), formatCountry(country)].filter(Boolean);
  return parts.join(", ");
}

function formatPersonalLocation(personal: CVData["personal"]) {
  const parts = [
    personal?.showAddress === false ? "" : personal?.address,
    personal?.showCity === false ? "" : personal?.city,
    personal?.showCountry === false ? "" : formatCountry(personal?.country),
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.join(", ");
}

function renderNationality(personal: CVData["personal"], textColor?: string) {
  const nationality = formatCountry(personal?.nationality);
  if (!nationality) return null;
  return (
    <p className="mt-1 text-xs text-slate-500" style={textColor ? { color: textColor } : undefined}>
      {i18n.t("editor.personal.fields.nationality", "Nationality")}: {nationality}
    </p>
  );
}

function formatBirthDate(value?: string) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : raw.match(/^(\d{4}-\d{2}-\d{2})T/)?.[1] ?? "";

  if (!normalized) return "";

  const [year, month, day] = normalized.split("-");
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return utcDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shouldRenderProfileImage(personal: CVData["personal"]) {
  return Boolean(personal?.profileImage) && personal?.showProfileImage !== false;
}

// [width, portrait height, square height] per base size and user-selected scale.
// Literal class names so Tailwind keeps them in the build.
const PROFILE_IMAGE_SIZES = {
  small: { sm: ["w-16", "h-[5.5rem]", "h-16"], md: ["w-20", "h-28", "h-20"], lg: ["w-24", "h-32", "h-24"], xl: ["w-28", "h-[9.5rem]", "h-28"] },
  medium: { sm: ["w-20", "h-28", "h-20"], md: ["w-24", "h-32", "h-24"], lg: ["w-28", "h-[9.5rem]", "h-28"], xl: ["w-32", "h-44", "h-32"] },
} as const;

function getProfileImageClass(personal: CVData["personal"], size: "small" | "medium" = "medium") {
  const style = personal?.profileImageStyle || "round";
  const scale = personal?.profileImageSize && personal.profileImageSize in PROFILE_IMAGE_SIZES[size] ? personal.profileImageSize : "md";
  const [width, portraitHeight, squareHeight] = PROFILE_IMAGE_SIZES[size][scale];
  const sizeClass = `${width} ${style === "portrait" ? portraitHeight : squareHeight} shrink-0`;
  const shapeClass = style === "round" ? "rounded-full" : "rounded-xl";
  return `${sizeClass} ${shapeClass} object-cover`;
}

function calculateAge(value?: string) {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : raw.match(/^(\d{4}-\d{2}-\d{2})T/)?.[1] ?? "";

  if (!normalized) return null;

  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function getPersonalMetaLines(personal: CVData["personal"]) {
  const lines: string[] = [];

  if (personal?.showBirthDate && personal?.birthDate) {
    const formatted = formatBirthDate(personal.birthDate);
    if (formatted) {
      lines.push(`Fecha de nacimiento: ${formatted}`);
    }
  }

  if (personal?.showAge && personal?.birthDate) {
    const age = calculateAge(personal.birthDate);
    if (age !== null) {
      lines.push(`Edad: ${age} años`);
    }
  }

  return lines;
}

interface ValuePropositionBlockOptions {
  personal: CVData["personal"];
  containerClassName: string;
  titleClassName: string;
  textClassName: string;
  titleText?: string;
}

function renderValuePropositionBlock({
  personal,
  containerClassName,
  titleClassName,
  textClassName,
  titleText = "Propuesta de valor",
}: ValuePropositionBlockOptions) {
  const content = String(personal?.valueProposition || "").trim();
  if (!content || personal?.showValuePropositionContent === false) return null;

  const showTitle = personal?.showValuePropositionTitle !== false;

  return (
    <section className={containerClassName}>
      {showTitle ? <h2 className={titleClassName}>{titleText}</h2> : null}
      <p className={textClassName}>{content}</p>
    </section>
  );
}

function normalizeSkills(value: any) {
  if (!value) return [] as Array<{ id: string; name: string; level?: number }>;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item) return { id: crypto?.randomUUID?.() ?? `${Math.random()}`, name: "", level: 0 };
      if (typeof item === "string") return { id: item, name: item, level: 0 };
      return {
        id: (item.id as string) ?? crypto?.randomUUID?.() ?? `${Math.random()}`,
        name: (item.name as string) ?? "",
        level: typeof item.level === "number" ? item.level : 0,
      };
    });
  }
  return [];
}

function normalizeLanguages(value: any) {
  if (!value) return [] as Array<{ id: string; name: string; level?: string; certificateUrl?: string }>;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item) return { id: crypto?.randomUUID?.() ?? `${Math.random()}`, name: "", level: "", certificateUrl: "" };
      if (typeof item === "string") return { id: item, name: item, level: "", certificateUrl: "" };
      return {
        id: (item.id as string) ?? crypto?.randomUUID?.() ?? `${Math.random()}`,
        name: (item.name as string) ?? "",
        level: (item.level as string) ?? "",
        certificateUrl: (item.certificateUrl as string) ?? "",
      };
    });
  }
  return [];
}

function normalizeCertificates(value: any) {
  if (!value) {
    return [] as Array<{
      id: string;
      title: string;
      url: string;
      issuingOrganization?: string;
      issueDate?: string;
      expiryDate?: string;
      credentialId?: string;
    }>;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item) {
        return {
          id: crypto?.randomUUID?.() ?? `${Math.random()}`,
          title: "",
          url: "",
          issuingOrganization: "",
          issueDate: "",
          expiryDate: "",
          credentialId: "",
        };
      }
      return {
        id: (item.id as string) ?? crypto?.randomUUID?.() ?? `${Math.random()}`,
        title: (item.title as string) ?? (item.name as string) ?? "",
        url: (item.url as string) ?? (item.verificationUrl as string) ?? "",
        issuingOrganization: (item.issuingOrganization as string) ?? "",
        issueDate: (item.issueDate as string) ?? "",
        expiryDate: (item.expiryDate as string) ?? "",
        credentialId: (item.credentialId as string) ?? "",
      };
    });
  }
  return [];
}

function skillLevelPercent(level?: number) {
  if (!level || level <= 0) return 0;
  return Math.min(100, Math.max(0, (level / 5) * 100));
}

function cefrLevelPercent(level?: string) {
  const map: Record<string, number> = { A1: 20, A2: 35, B1: 50, B2: 70, C1: 85, C2: 100 };
  return map[level as keyof typeof map] ?? 0;
}

function hexToRgb(hexColor: string) {
  const value = String(hexColor || "").trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value)) {
    return null;
  }

  const normalized = value.length === 3
    ? value.split("").map((char) => `${char}${char}`).join("")
    : value;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function getContrastMode(hexColor: string): "light" | "dark" {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return "light";
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;
  return darkContrast >= whiteContrast ? "dark" : "light";
}

function getGradientStartColor(gradient: string): string {
  return String(gradient || "").match(/#([0-9a-fA-F]{6})/)?.[0] || "#3730a3";
}

function rgbaFromHex(hexColor: string, alpha: number): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return `rgba(255,255,255,${alpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className="h-full bg-brand-700 transition-all duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}

function normalizeContactItems(value: unknown): ContactItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item) return { value: "", type: "Personal" as ContactType };
      if (typeof item === "string") return { value: item, type: "Personal" as ContactType };
      if (typeof item === "object" && "value" in item) {
        const typed = item as any;
        return {
          value: String(typed.value ?? ""),
          type: (typed.type as ContactType) ?? "Personal",
        };
      }
      return { value: String(item), type: "Personal" as ContactType };
    });
  }
  if (typeof value === "string") return [{ value: value, type: "Personal" }];
  return [];
}

function TemplateMinimal({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const links = data.links ?? {};
  const personalMetaLines = getPersonalMetaLines(personal);
  const personalLocation = formatPersonalLocation(personal);

  return (
    <article
      className="max-w-2xl mx-auto bg-white p-8 text-slate-900 font-ats border border-slate-200 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal"
      itemScope
      itemType="https://schema.org/Person"
    >
      {/* ATS-Friendly Header with Semantic HTML */}
      <header className="mb-7">

        <h1
          className="text-4xl font-bold tracking-tight ats-name"
          itemProp="name"
        >
          {personal.name}
        </h1>
        <p
          className="text-lg text-slate-700 ats-title"
          itemProp="jobTitle"
        >
          {personal.role}
        </p>
        {renderNationality(personal)}
        {personalLocation && (
          <p
            className="text-sm text-slate-600 ats-location"
            itemProp="address"
            itemScope
            itemType="https://schema.org/PostalAddress"
          >
            {personal.showAddress !== false && personal.address ? <span itemProp="streetAddress">{personal.address}</span> : null}
            {personal.showAddress !== false && personal.address && (personal.showCity !== false && personal.city || personal.showCountry !== false && personal.country) ? ", " : null}
            {personal.showCity !== false && personal.city ? <span itemProp="addressLocality">{personal.city}</span> : null}
            {personal.showCity !== false && personal.city && personal.showCountry !== false && personal.country ? ", " : null}
            {personal.showCountry !== false && personal.country ? <span itemProp="addressCountry">{formatCountry(personal.country)}</span> : null}
          </p>
        )}

        {/* Contact Information - ATS Optimized */}
        <div className="mt-3 space-y-1">
          {emails.map((email, idx) => (
            <div key={`email-${idx}`} className="ats-contact">
              <span className="font-medium">{email.type}:</span>{" "}
              <a
                href={`mailto:${email.value}`}
                className="text-slate-700 ats-email"
                itemProp="email"
              >
                {email.value}
              </a>
            </div>
          ))}
          {phones.map((phone, idx) => (
            <div key={`phone-${idx}`} className="ats-contact">
              <span className="font-medium">{phone.type}:</span>{" "}
              <a
                href={`tel:${phone.value}`}
                className="text-slate-700 ats-phone"
                itemProp="telephone"
              >
                {phone.value}
              </a>
            </div>
          ))}
          {personalMetaLines.map((line) => (
            <div key={line} className="ats-contact">{line}</div>
          ))}
          {Object.keys(links).length > 0 && (
            <div className="mt-2 space-y-1">
              {Object.entries(links).map(([label, url]) => (
                <div key={label} className="ats-contact">
                  <span className="font-medium">{label}:</span>{" "}
                  <a
                    href={url}
                    className="text-slate-700 ats-link"
                    itemProp="url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {url}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {renderValuePropositionBlock({
        personal,
        containerClassName: "mb-6 rounded-lg border border-slate-200 bg-slate-50/70 p-4",
        titleClassName: "text-sm font-semibold uppercase tracking-[0.14em] text-slate-600",
        textClassName: "mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-line",
      })}

      {/* Professional Summary - ATS Critical */}
      {personal.summary && personal.showSummaryContent !== false && (
        <section className="mb-6" itemProp="description">
          {personal.showSummaryTitle !== false ? <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 ats-section-header">Resumen Profesional</h2> : null}
          <p className="mt-2 text-sm leading-relaxed text-slate-700 ats-summary whitespace-pre-line">
            {personal.summary}
          </p>
        </section>
      )}

      {/* Work Experience - ATS Priority Section */}
      {data.experience?.length ? (
        <section className="mb-6" itemProp="workExperience" itemScope itemType="https://schema.org/WorkExperience">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 ats-section-header">Experiencia Laboral</h2>
          <div className="mt-3 space-y-4">
            {data.experience.map((item, index) => (
              <div
                key={item.id}
                className="ats-experience-item"
                itemProp="hasOccupation"
                itemScope
                itemType="https://schema.org/Occupation"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3
                      className="text-base font-semibold text-slate-800 ats-job-title"
                      itemProp="name"
                    >
                      {item.role || "Rol"}
                    </h3>
                    <p
                      className="text-sm text-slate-600 ats-company"
                      itemProp="worksFor"
                      itemScope
                      itemType="https://schema.org/Organization"
                    >
                      <span itemProp="name">{item.company || "Empresa"}</span>
                      {formatLocation(item.city, item.country) && (
                        <span className="ats-location">
                          {" • "}{item.city}
                          {item.city && item.country && ", "}
                          {formatCountry(item.country)}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 ats-date-range">
                    {formatRange(item.from, item.to)}
                  </p>
                </div>
                {item.description && (
                  <p
                    className="mt-2 text-sm text-slate-700 ats-description leading-relaxed whitespace-pre-line"
                    itemProp="description"
                  >
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Education - ATS Important Section */}
      {data.education?.length ? (
        <section className="mb-6" itemProp="alumniOf">
          <h2 className="text-lg font-semibold text-slate-800 ats-section-header">Educación</h2>
          <div className="mt-3 space-y-4">
            {data.education.map((item) => (
              <div
                key={item.id}
                className="ats-education-item"
                itemScope
                itemType="https://schema.org/EducationalOrganization"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3
                      className="text-base font-semibold text-slate-800 ats-degree"
                      itemProp="educationalCredentialAwarded"
                    >
                      {getLocalizedDegreeLabel(item.degree)}
                    </h3>
                    <p
                      className="text-sm text-slate-600 ats-institution"
                      itemProp="name"
                    >
                      {item.institution || "Institución"}
                      {formatLocation(item.city, item.country) && (
                        <span className="ats-location">
                          {" • "}{item.city}
                          {item.city && item.country && ", "}
                          {item.country}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 ats-date-range">
                    {formatRange(item.from, item.to)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(() => {
        const skills = normalizeSkills(data.skills);
        const languages = normalizeLanguages(data.languages);
        const certificates = normalizeCertificates(data.certificates);
        const links = Object.keys(data.links || {}).length;

        if (!skills.length && !languages.length && !certificates.length && !links) {
          return null;
        }

        return (
          <>
            {/* Skills Section - ATS Optimized */}
            {skills.length ? (
              <section className="mb-6" itemProp="knowsAbout">
                <h2 className="text-lg font-semibold text-slate-800 ats-section-header">Habilidades Técnicas</h2>
                <div className="mt-3 space-y-2">
                  {skills.map((skill) => (
                    <div key={skill.id} className="ats-skill-item">
                      <span className="text-sm font-medium text-slate-700 ats-skill-name">
                        {skill.name}
                      </span>
                      {skill.level && (
                        <span className="text-xs text-slate-600 ats-skill-level ml-2">
                          • Nivel {skill.level}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Languages Section - ATS Optimized */}
            {(() => {
              const languages = normalizeLanguages(data.languages);
              return languages.length ? (
                <section className="mb-6" itemProp="knowsLanguage">
                  <h2 className="text-lg font-semibold text-slate-800 ats-section-header">Idiomas</h2>
                  <div className="mt-3 space-y-2">
                    {languages.map((lang) => (
                      <div key={lang.id} className="ats-language-item">
                        <span className="text-sm font-medium text-slate-700 ats-language-name">
                          {lang.name}
                        </span>
                        {lang.level && (
                          <span className="text-xs text-slate-600 ats-language-level ml-2">
                            • {lang.level.toUpperCase()}
                          </span>
                        )}
                        {lang.certificateUrl && (
                          <span className="text-xs text-slate-600 ats-certificate ml-2">
                            • Certificado disponible
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}

            {/* Certificates Section - ATS Optimized */}
            {(() => {
              const certificates = normalizeCertificates(data.certificates);
              return certificates.length ? (
                <section className="mb-6" itemProp="hasCredential">
                  <h2 className="text-lg font-semibold text-slate-800 ats-section-header">Certificaciones</h2>
                  <div className="mt-3 space-y-3">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="ats-certificate-item">
                        <h3 className="text-sm font-semibold text-slate-800 ats-certificate-title">
                          {cert.title}
                        </h3>
                        {cert.issuingOrganization ? (
                          <p className="text-xs text-slate-600 mt-1">{cert.issuingOrganization}</p>
                        ) : null}
                        {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                          <p className="text-xs text-slate-600 mt-1">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                        ) : null}
                        {cert.credentialId ? (
                          <p className="text-xs text-slate-600 mt-1">Credential ID: {cert.credentialId}</p>
                        ) : null}
                        {cert.url && (
                          <p className="text-xs text-slate-600 ats-certificate-url mt-1 break-all">
                            {cert.url}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}

            {/* Links Section - ATS Optimized */}
            {(() => {
              const links = Object.keys(data.links || {});
              return links.length ? (
                <section className="mb-6" itemProp="sameAs">
                  <h2 className="text-lg font-semibold text-slate-800 ats-section-header">Enlaces Profesionales</h2>
                  <div className="mt-3 space-y-2">
                    {Object.entries(data.links || {}).map(([label, url]) => (
                      <div key={label} className="ats-link-item">
                        <span className="text-sm font-medium text-slate-700 ats-link-label">
                          {label}
                        </span>
                        <a
                          href={url}
                          className="text-sm text-slate-600 ats-link-url ml-2 hover:text-slate-800"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {url}
                        </a>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}
          </>
        );
      })()}
    </article>
  );
}

function TemplateCorporate({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const personalMetaLines = getPersonalMetaLines(personal);
  const certificates = normalizeCertificates(data.certificates);

  return (
    <div className="max-w-2xl mx-auto bg-white p-9 text-slate-900 border border-slate-200 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{personal.name || ""}</h1>
          <p className="text-sm text-slate-500">{personal.role || ""}</p>
          {renderNationality(personal)}
        </div>
        {shouldRenderProfileImage(personal) && (
          <div className="flex-shrink-0">
            <img
              src={personal.profileImage}
              alt="Profile"
              className={`${getProfileImageClass(personal, "medium")} border-2 border-slate-200`}
            />
          </div>
        )}
        <div className="text-xs text-slate-500 space-y-1">
          {emails.map((email, idx) => (
            <div key={`email-${idx}`} className="flex items-center gap-1">
              <span className="font-semibold">{email.type}:</span> {email.value}
            </div>
          ))}
          {phones.map((phone, idx) => (
            <div key={`phone-${idx}`} className="flex items-center gap-1">
              <span className="font-semibold">{phone.type}:</span> {phone.value}
            </div>
          ))}
          {personalMetaLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>

      {renderValuePropositionBlock({
        personal,
        containerClassName: "mt-6 rounded-r-lg border-l-4 border-brand-700 bg-slate-50/70 pl-4 pr-3 py-2",
        titleClassName: "text-sm font-semibold uppercase tracking-wide text-slate-500",
        textClassName: "mt-2 text-sm text-slate-700 whitespace-pre-line",
      })}

      {personal.summary && personal.showSummaryContent !== false && (
        <section className="mt-6 border-l-4 border-brand-700 pl-4 py-1">
          {personal.showSummaryTitle !== false ? <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Perfil</h2> : null}
          <p className="mt-2 text-sm text-slate-700">{personal.summary}</p>
        </section>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.experience?.length ? (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Experiencia</h2>
            <div className="mt-3 space-y-4">
              {data.experience.map((item) => (
                <div key={item.id} className="">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.role || "Rol"}</p>
                      <p className="text-xs text-slate-500">{item.company || "Empresa"}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatRange(item.from, item.to)}</p>
                  </div>
                  {item.description && <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {data.education?.length ? (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Educación</h2>
            <div className="mt-3 space-y-4">
              {data.education.map((item) => (
                <div key={item.id} className="">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{getLocalizedDegreeLabel(item.degree)}</p>
                      <p className="text-xs text-slate-500">{item.institution || "Institución"}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatRange(item.from, item.to)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {(data.skills?.length || data.languages?.length) && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.skills?.length ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Habilidades</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.skills.map((skill) => (
                  <span key={skill.id} className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg">
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {data.languages?.length ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Idiomas</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.languages.map((lang) => (
                  <span key={lang.id} className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg">
                    {lang.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {certificates.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Certificaciones</h2>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            {certificates.map((cert) => (
              <div key={cert.id}>
                <p className="font-semibold">{cert.title}</p>
                {cert.issuingOrganization ? <p className="text-xs text-slate-500">{cert.issuingOrganization}</p> : null}
                {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                  <p className="text-xs text-slate-500">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                ) : null}
                {cert.credentialId ? <p className="text-xs text-slate-500">Credential ID: {cert.credentialId}</p> : null}
                {cert.url ? (
                  <a href={cert.url} target="_blank" rel="noreferrer" className="text-xs text-brand-800 hover:underline">
                    {cert.url}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {Object.keys(data.links || {}).length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Enlaces</h2>
          <div className="mt-2 text-xs text-slate-700 space-y-1">
            {Object.entries(data.links || {}).map(([label, url]) => (
              <div key={label}>
                <span className="font-semibold">{label}:</span>{" "}
                <a href={url} target="_blank" rel="noreferrer" className="text-brand-800 hover:underline">
                  {url}
                </a>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TemplateDeveloper({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const personalMetaLines = getPersonalMetaLines(personal);
  const developerBg = data.settings?.developerBg ?? "#0f172a";
  const contrast = getContrastMode(developerBg);
  const isLight = contrast === "dark";
  const textStrong = isLight ? "#0f172a" : "#f8fafc";
  const textMuted = isLight ? "#334155" : "#cbd5e1";
  const chipBackground = isLight ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.52)";
  const chipBorder = isLight ? "rgba(148,163,184,0.45)" : "rgba(148,163,184,0.35)";
  const certificates = normalizeCertificates(data.certificates);

  return (
    <div
      className="max-w-2xl mx-auto text-slate-100 p-9 font-sans border border-slate-700 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal"
      style={{ backgroundColor: developerBg }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {shouldRenderProfileImage(personal) && (
            <img
              src={personal.profileImage}
              alt="Foto de perfil"
              className={`${getProfileImageClass(personal, "medium")} border-2 border-slate-700 mb-3`}
            />
          )}
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: textStrong }}>{personal.name || ""}</h1>
          <p className="mt-1 text-sm" style={{ color: textMuted }}>{personal.role || ""}</p>
        </div>
        <div className="space-y-1 text-xs" style={{ color: textMuted }}>
          {emails.map((email, idx) => (
            <div key={`email-${idx}`} className="px-2 py-1 rounded-md border" style={{ backgroundColor: chipBackground, borderColor: chipBorder }}>
              <span className="font-semibold">{email.type}:</span> {email.value}
            </div>
          ))}
          {phones.map((phone, idx) => (
            <div key={`phone-${idx}`} className="px-2 py-1 rounded-md border" style={{ backgroundColor: chipBackground, borderColor: chipBorder }}>
              <span className="font-semibold">{phone.type}:</span> {phone.value}
            </div>
          ))}
          {personalMetaLines.map((line) => (
            <div key={line} className="px-2 py-1 rounded-md border" style={{ backgroundColor: chipBackground, borderColor: chipBorder }}>{line}</div>
          ))}
          {Object.keys(data.links || {}).map((label) => (
            <div key={label} className="px-2 py-1 rounded-md border" style={{ backgroundColor: chipBackground, borderColor: chipBorder }}>{label}</div>
          ))}
        </div>
      </div>

      {renderValuePropositionBlock({
        personal,
        containerClassName: "mt-8 rounded-lg border border-slate-700 bg-slate-900/60 p-4",
        titleClassName: "text-sm font-semibold uppercase tracking-wide text-slate-400",
        textClassName: "mt-2 text-sm leading-relaxed text-slate-200 whitespace-pre-line",
      })}

      {personal.summary && personal.showSummaryContent !== false && (
        <section className="mt-8">
          {personal.showSummaryTitle !== false ? <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Acerca de mí</h2> : null}
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{personal.summary}</p>
        </section>
      )}

      {data.experience?.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Experiencia</h2>
          <div className="mt-4 space-y-4">
            {data.experience.map((item) => (
              <div key={item.id} className="bg-slate-900 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.role || "Rol"}</p>
                    <p className="text-xs text-slate-400">{item.company || "Empresa"}</p>
                  </div>
                  <p className="text-xs text-slate-400">{formatRange(item.from, item.to)}</p>
                </div>
                {item.description && <p className="mt-2 text-sm text-slate-300 whitespace-pre-line">{item.description}</p>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.skills?.length ? (
          <div className="bg-slate-900 p-4 rounded-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Habilidades</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <span key={skill.id} className="px-2 py-1 text-xs font-semibold bg-slate-800 text-slate-200 rounded-lg">
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {data.languages?.length ? (
          <div className="bg-slate-900 p-4 rounded-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Idiomas</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.languages.map((lang) => (
                <span key={lang.id} className="px-2 py-1 text-xs font-semibold bg-slate-800 text-slate-200 rounded-lg">
                  {lang.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {certificates.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Certificaciones</h2>
          <div className="mt-3 space-y-2">
            {certificates.map((cert) => (
              <div key={cert.id} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                <p className="text-sm font-semibold text-slate-100">{cert.title}</p>
                {cert.issuingOrganization ? <p className="text-xs text-slate-400">{cert.issuingOrganization}</p> : null}
                {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                  <p className="text-xs text-slate-400">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                ) : null}
                {cert.credentialId ? <p className="text-xs text-slate-400">Credential ID: {cert.credentialId}</p> : null}
                {cert.url ? (
                  <a href={cert.url} target="_blank" rel="noreferrer" className="text-xs text-brand-300 hover:underline">
                    {cert.url}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {Object.keys(data.links || {}).length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Enlaces</h2>
          <div className="mt-2 text-xs text-slate-200 space-y-1">
            {Object.entries(data.links || {}).map(([label, url]) => (
              <div key={label}>
                <span className="font-semibold">{label}:</span>{" "}
                <a href={url} target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">
                  {url}
                </a>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TemplateCreative({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const personalMetaLines = getPersonalMetaLines(personal);
  const creativeGradient = data.settings?.creativeGradient ?? "linear-gradient(135deg, #3730a3 0%, #0f172a 55%, #1e293b 100%)";
  const creativeContrast = getContrastMode(getGradientStartColor(creativeGradient));
  const creativeTextColor = creativeContrast === "dark" ? "#0f172a" : "#ffffff";
  const creativeMutedColor = creativeContrast === "dark" ? "#334155" : "#f1f5f9";
  const creativeIntensity = data.settings?.creativeIntensity ?? "medium";
  const intensityOverlay: Record<"soft" | "medium" | "strong", number> = {
    soft: 0.08,
    medium: 0.18,
    strong: 0.30,
  };
  const overlay = intensityOverlay[creativeIntensity] ?? intensityOverlay.medium;
  const certificates = normalizeCertificates(data.certificates);

  return (
    <div
      className={`max-w-2xl mx-auto p-9 rounded-2xl shadow-lg border border-white/10 [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal ${creativeContrast === "dark" ? "[&_.text-white]:!text-slate-900 [&_.text-slate-100]:!text-slate-800 [&_.text-slate-200]:!text-slate-700 [&_.text-slate-300]:!text-slate-700 [&_.text-slate-400]:!text-slate-600" : ""}`}
      style={{ backgroundImage: `linear-gradient(rgba(2, 6, 23, ${overlay}), rgba(2, 6, 23, ${overlay})), ${creativeGradient}` }}
    >
      <header className="space-y-2">
        {shouldRenderProfileImage(personal) && (
          <img
            src={personal.profileImage}
            alt="Foto de perfil"
            className={`${getProfileImageClass(personal, "medium")} border-2 border-white/30 mb-3`}
          />
        )}
        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: creativeTextColor }}>{personal.name || ""}</h1>
        <p className="text-sm" style={{ color: creativeMutedColor }}>{personal.role || "Profesional Creativo"}</p>
        <div className="flex flex-wrap gap-2 text-xs" style={{ color: creativeMutedColor }}>
          {emails.map((email, idx) => (
            <span key={`email-${idx}`} className="px-2 py-1 bg-white/10 rounded-full">
              <span className="font-semibold">{email.type}:</span> {email.value}
            </span>
          ))}
          {phones.map((phone, idx) => (
            <span key={`phone-${idx}`} className="px-2 py-1 bg-white/10 rounded-full">
              <span className="font-semibold">{phone.type}:</span> {phone.value}
            </span>
          ))}
          {personalMetaLines.map((line) => (
            <span key={line} className="px-2 py-1 bg-white/10 rounded-full">{line}</span>
          ))}
          {Object.entries(data.links || {}).map(([label, url]) => (
            <span key={label} className="px-2 py-1 bg-white/10 rounded-full">
              {label}: <span className="underline">{url}</span>
            </span>
          ))}
        </div>
      </header>

      {renderValuePropositionBlock({
        personal,
        containerClassName: "mt-8 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-[1px]",
        titleClassName: `text-sm font-semibold uppercase tracking-wide ${creativeContrast === "dark" ? "text-slate-700" : "text-slate-200"}`,
        textClassName: `mt-2 text-sm whitespace-pre-line ${creativeContrast === "dark" ? "text-slate-800" : "text-slate-100"}`,
      })}

      {personal.summary && personal.showSummaryContent !== false && (
        <section className="mt-8">
          {personal.showSummaryTitle !== false ? <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: creativeMutedColor }}>Sobre mí</h2> : null}
          <p className="mt-2 text-sm" style={{ color: creativeTextColor }}>{personal.summary}</p>
        </section>
      )}

      {data.experience?.length ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Experiencia</h2>
          <div className="mt-4 space-y-4">
            {data.experience.map((item) => (
              <div key={item.id} className="bg-white/10 p-4 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.role || "Rol"}</p>
                    <p className="text-xs text-slate-300">{item.company || "Empresa"}</p>
                  </div>
                  <p className="text-xs text-slate-300">{formatRange(item.from, item.to)}</p>
                </div>
                {item.description && <p className="mt-2 text-sm text-slate-200 whitespace-pre-line">{item.description}</p>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.education?.length ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Educación</h2>
          <div className="mt-4 space-y-4">
            {data.education.map((item) => (
              <div key={item.id} className="bg-white/10 p-4 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{getLocalizedDegreeLabel(item.degree)}</p>
                    <p className="text-xs text-slate-300">{item.institution || "Institución"}</p>
                  </div>
                  <p className="text-xs text-slate-300">{formatRange(item.from, item.to)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(data.skills?.length || data.languages?.length) && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Habilidades</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.skills?.map((skill) => (
              <span key={skill.id} className="px-3 py-1 text-xs font-semibold bg-white/15 rounded-full">
                {skill.name}
              </span>
            ))}
            {data.languages?.map((lang) => (
              <span key={lang.id} className="px-3 py-1 text-xs font-semibold bg-white/15 rounded-full">
                {lang.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {certificates.length ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Certificaciones</h2>
          <div className="mt-3 space-y-2">
            {certificates.map((cert) => (
              <div key={cert.id} className="rounded-xl bg-white/10 px-3 py-2">
                <p className="text-sm font-semibold text-white">{cert.title}</p>
                {cert.issuingOrganization ? <p className="text-xs text-slate-200">{cert.issuingOrganization}</p> : null}
                {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                  <p className="text-xs text-slate-200">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                ) : null}
                {cert.credentialId ? <p className="text-xs text-slate-200">Credential ID: {cert.credentialId}</p> : null}
                {cert.url ? <p className="text-xs text-slate-200 underline break-all">{cert.url}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TemplateClassic({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const contacts = [...emails, ...phones];
  const personalMetaLines = getPersonalMetaLines(personal);
  const certificates = normalizeCertificates(data.certificates);

  return (
    <div className="max-w-2xl mx-auto bg-white p-9 text-slate-900 font-serif border border-slate-200 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal">
      <header className="border-b border-slate-200 pb-6">
        {shouldRenderProfileImage(personal) && (
          <img
            src={personal.profileImage}
            alt="Foto de perfil"
            className={`${getProfileImageClass(personal, "small")} border border-slate-200 mb-3`}
          />
        )}
        <h1 className="text-4xl font-bold tracking-tight">{personal.name || ""}</h1>
        <p className="mt-2 text-sm text-slate-500">{personal.role || ""}</p>
        {renderNationality(personal)}
        <p className="mt-3 text-xs text-slate-500">
          {contacts.map((contact, idx) => (
            <span key={idx}>
              <span className="font-semibold">{contact.type}:</span> {contact.value}
              {idx < contacts.length - 1 && <span className="mx-2">•</span>}
            </span>
          ))}
        </p>
        {personalMetaLines.map((line) => (
          <p key={line} className="mt-2 text-xs text-slate-500">{line}</p>
        ))}
        {Object.keys(data.links || {}).length ? (
          <div className="mt-3 text-xs text-slate-500">
            {Object.entries(data.links || {}).map(([label, url]) => (
              <div key={label}>
                <span className="font-semibold">{label}:</span>{" "}
                <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2 text-slate-700">
                  {url}
                </a>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      {renderValuePropositionBlock({
        personal,
        containerClassName: "mt-8 rounded-md border border-slate-200 bg-slate-50 p-4",
        titleClassName: "text-sm font-semibold uppercase tracking-wide text-slate-600",
        textClassName: "mt-2 text-sm text-slate-700 whitespace-pre-line",
      })}

      {personal.summary && personal.showSummaryContent !== false && (
        <section className="mt-8">
          {personal.showSummaryTitle !== false ? <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Resumen</h2> : null}
          <p className="mt-2 text-sm text-slate-700">{personal.summary}</p>
        </section>
      )}

      {data.experience?.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Experiencia</h2>
          <div className="mt-4 space-y-4">
            {data.experience.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-semibold text-slate-900">{item.role || "Rol"}</p>
                    <p className="text-xs text-slate-500">
                      {item.company || "Empresa"}
                      {formatLocation(item.city, item.country) ? ` • ${formatLocation(item.city, item.country)}` : ""}
                      {' • '}{formatRange(item.from, item.to)}
                    </p>
                {item.description && <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{item.description}</p>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.education?.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Educación</h2>
          <div className="mt-4 space-y-4">
            {data.education.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-semibold text-slate-900">{getLocalizedDegreeLabel(item.degree)}</p>
                <p className="text-xs text-slate-500">{item.institution || "Institución"} • {formatRange(item.from, item.to)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(data.skills?.length || data.languages?.length) && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Habilidades</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.skills?.map((skill) => (
              <span key={skill.id} className="px-3 py-1 text-xs font-semibold bg-slate-100 rounded-full">
                {skill.name}
              </span>
            ))}
            {data.languages?.map((lang) => (
              <span key={lang.id} className="px-3 py-1 text-xs font-semibold bg-slate-100 rounded-full">
                {lang.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {certificates.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Certificaciones</h2>
          <div className="mt-3 space-y-2">
            {certificates.map((cert) => (
              <div key={cert.id}>
                <p className="text-sm font-semibold text-slate-900">{cert.title}</p>
                {cert.issuingOrganization ? <p className="text-xs text-slate-500">{cert.issuingOrganization}</p> : null}
                {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                  <p className="text-xs text-slate-500">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                ) : null}
                {cert.credentialId ? <p className="text-xs text-slate-500">Credential ID: {cert.credentialId}</p> : null}
                {cert.url ? (
                  <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-700 underline decoration-slate-300 underline-offset-2">
                    {cert.url}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TemplateSidebar({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const links = data.links ?? {};
  const certificates = normalizeCertificates(data.certificates);
  const sidebarBg = data.settings?.sidebarBg ?? "#0f172a";
  const personalMetaLines = getPersonalMetaLines(personal);
  const personalLocation = formatPersonalLocation(personal);
  const contrast = getContrastMode(sidebarBg);
  const isLight = contrast === "dark";
  const headingColor = isLight ? "#0f172a" : "#ffffff";
  const mutedColor = isLight ? "#334155" : rgbaFromHex("#ffffff", 0.82);
  const softColor = isLight ? "#475569" : rgbaFromHex("#ffffff", 0.72);
  const linkColor = isLight ? "#0f172a" : "#ffffff";
  const linkDecoration = isLight ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.5)";

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal">
      <div className="grid grid-cols-1 lg:grid-cols-3">
        <aside className="relative px-7 py-9 text-white" style={{ backgroundColor: sidebarBg }}>
          <div className="space-y-4">
            {shouldRenderProfileImage(personal) ? <img src={personal.profileImage} alt="Foto de perfil" className={`${getProfileImageClass(personal, "medium")} border border-white/30`} /> : null}
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: headingColor }}>{personal.name || ""}</h1>
            <p className="text-sm" style={{ color: mutedColor }}>{personal.role || ""}</p>
            {renderNationality(personal, mutedColor)}
            {personalLocation ? (
              <p className="text-sm" style={{ color: mutedColor }}>{personalLocation}</p>
            ) : null}

            <div className="mt-6 space-y-3 text-sm" style={{ color: mutedColor }}>
              {emails.map((email, idx) => (
                <div key={`email-${idx}`}>
                  <span className="font-semibold">{email.type}:</span> {email.value}
                </div>
              ))}
              {phones.map((phone, idx) => (
                <div key={`phone-${idx}`}>
                  <span className="font-semibold">{phone.type}:</span> {phone.value}
                </div>
              ))}
              {personalMetaLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              {Object.keys(links).length ? (
                <div className="pt-2">
                  {Object.entries(links).map(([label, url]) => (
                    <div key={label}>
                      <span className="font-semibold">{label}:</span>{" "}
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                          style={{ color: linkColor, textDecorationColor: linkDecoration }}
                        >
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {renderValuePropositionBlock({
            personal,
            containerClassName: "mt-8 rounded-lg border px-3 py-3",
            titleClassName: "text-xs font-semibold uppercase tracking-wide",
            textClassName: "mt-2 text-sm whitespace-pre-line",
            titleText: "Propuesta de valor",
          })}
        </aside>

        <main className="col-span-2 p-8">
          {personal.showDocumentIdentity && (personal.documentType || personal.documentNumber) ? <section className="mb-6"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Documento de identidad</h2><p className="mt-2 text-sm text-slate-700">{[personal.documentType, personal.documentNumber].filter(Boolean).join(" · ")}</p></section> : null}
          {personal.summary?.trim() && personal.showSummaryContent !== false ? (
            <section className="mb-8">
              {personal.showSummaryTitle !== false ? <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Perfil profesional</h2> : null}
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{personal.summary}</p>
            </section>
          ) : null}
          {data.experience?.length ? (
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Experiencia</h2>
              <div className="mt-3 space-y-4">
                {data.experience.map((item) => (
                  <div key={item.id} className="">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.role || "Rol"}</p>
                        <p className="text-xs text-slate-500">
                          {item.company || "Empresa"}
                          {formatLocation(item.city, item.country) ? ` • ${formatLocation(item.city, item.country)}` : ""}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{formatRange(item.from, item.to)}</p>
                    </div>
                    {item.description && <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{item.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {data.education?.length ? (
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Educación</h2>
              <div className="mt-3 space-y-4">
                {data.education.map((item) => (
                  <div key={item.id} className="">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{getLocalizedDegreeLabel(item.degree)}</p>
                        <p className="text-xs text-slate-500">{item.institution || "Institución"}</p>
                      </div>
                      <p className="text-xs text-slate-500">{formatRange(item.from, item.to)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {(data.skills?.length || data.languages?.length) && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.skills?.length ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Habilidades</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.skills.map((skill) => (
                      <span key={skill.id} className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {data.languages?.length ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Idiomas</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.languages.map((lang) => (
                      <span key={lang.id} className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg">
                        {lang.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {certificates.length ? (
            <section className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Certificaciones</h3>
              <div className="mt-2 space-y-2">
                {certificates.map((cert) => (
                  <div key={cert.id}>
                    <p className="text-sm font-semibold text-slate-800">{cert.title}</p>
                    {cert.issuingOrganization ? <p className="text-xs text-slate-500">{cert.issuingOrganization}</p> : null}
                    {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                      <p className="text-xs text-slate-500">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                    ) : null}
                    {cert.credentialId ? <p className="text-xs text-slate-500">Credential ID: {cert.credentialId}</p> : null}
                    {cert.url ? (
                      <a href={cert.url} target="_blank" rel="noreferrer" className="text-xs text-brand-800 hover:underline">
                        {cert.url}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {Object.keys(data.links || {}).length ? (
            <section className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Enlaces</h3>
              <div className="mt-2 text-xs text-slate-700 space-y-1">
                {Object.entries(data.links || {}).map(([label, url]) => (
                  <div key={label}>
                    <span className="font-semibold">{label}:</span>{" "}
                    <a href={url} target="_blank" rel="noreferrer" className="text-brand-800 hover:underline">
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {(personal.showReferences !== false && (personal.references || []).some((item) => item && (item.name || item.phone || item.email || item.position || item.company || item.relationship))) || personal.referencesAvailableOnRequest ? (
            <section className="mt-8 border-t border-slate-200 pt-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Referencias laborales y personales</h3>
              {personal.showReferences !== false ? <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{(personal.references || []).filter((item) => item && item.isVisible !== false && (item.name || item.phone || item.email || item.position || item.company || item.relationship)).map((item) => <div key={item.id} className="text-sm"><p className="font-semibold text-slate-800">{item.name}</p><p className="text-xs text-slate-500">{item.type === "laboral" ? "Laboral" : "Familiar / personal"}{item.type === "laboral" && item.position ? " · " + item.position : ""}{item.type === "laboral" && item.company ? " · " + item.company : ""}{item.type === "personal" && (item.relationship || item.position) ? " · " + (item.relationship || item.position) : ""}</p>{item.phone ? <p className="text-xs text-slate-600">{item.phone}</p> : null}{item.email ? <p className="text-xs text-slate-600">{item.email}</p> : null}</div>)}</div> : null}
              {personal.referencesAvailableOnRequest ? <p className="mt-2 text-sm text-slate-700">Referencias laborales y personales: Disponibles a solicitud.</p> : null}
            </section>
          ) : null}
                </main>
      </div>
    </div>
  );
}

function TemplateExecutive({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const links = data.links ?? {};
  const certificates = normalizeCertificates(data.certificates);
  const personalMetaLines = getPersonalMetaLines(personal);
  const personalLocation = formatPersonalLocation(personal);
  const executiveTop = data.settings?.executiveTop ?? "#0f172a";
  const executiveAccent = data.settings?.executiveAccent ?? "#3b82f6";
  const contrast = getContrastMode(executiveTop);
  const isLight = contrast === "dark";
  const headingColor = isLight ? "#0f172a" : "#ffffff";
  const subtitleColor = isLight ? "#334155" : rgbaFromHex("#ffffff", 0.82);
  const metaColor = isLight ? "#475569" : rgbaFromHex("#ffffff", 0.75);

  return (
    <article className="max-w-3xl mx-auto bg-white border border-slate-200 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal">
      <header className="relative px-8 py-8 border-b border-slate-200 text-white" style={{ backgroundColor: executiveTop }}>
        <span className="absolute left-8 top-0 h-1 w-16" style={{ backgroundColor: executiveAccent }} aria-hidden="true" />
        {shouldRenderProfileImage(personal) ? <img src={personal.profileImage} alt="Foto de perfil" className={`float-right ml-5 ${getProfileImageClass(personal, "medium")} border border-white/30`} /> : null}
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: headingColor }}>{personal.name || ""}</h1>
        <p className="mt-1" style={{ color: subtitleColor }}>{personal.role || ""}</p>
        {renderNationality(personal, subtitleColor)}
        <div className="mt-4 flex flex-wrap gap-2 text-sm" style={{ color: metaColor }}>
          {personalLocation ? <span>{personalLocation}</span> : null}
          {emails[0]?.value ? <span>{emails[0].value}</span> : null}
          {phones[0]?.value ? <span>{phones[0].value}</span> : null}
          {personalMetaLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </header>

      <div className="px-8 py-8 space-y-8">
        {renderValuePropositionBlock({
          personal,
          containerClassName: "rounded-lg border border-slate-200 bg-slate-50 p-4",
          titleClassName: "text-xs font-semibold tracking-[0.14em] uppercase text-slate-500",
          textClassName: "mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line",
        })}

        {personal.summary && personal.showSummaryContent !== false ? (
          <section>
            {personal.showSummaryTitle !== false ? <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Perfil Profesional</h2> : null}
            <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{personal.summary}</p>
          </section>
        ) : null}

        {data.experience?.length ? (
          <section>
            <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Experiencia</h2>
            <div className="mt-3 space-y-4">
              {data.experience.map((item) => (
                <div key={item.id} className="border-l-2 border-slate-300 pl-4 py-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.role || "Rol"}</p>
                      <p className="text-xs text-slate-600">
                        {item.company || "Empresa"}
                        {formatLocation(item.city, item.country) ? ` • ${formatLocation(item.city, item.country)}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 whitespace-nowrap">{formatRange(item.from, item.to)}</p>
                  </div>
                  {item.description ? <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{item.description}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {data.education?.length ? (
            <section>
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Educación</h3>
              <div className="mt-3 space-y-3">
                {data.education.map((item) => (
                  <div key={item.id}>
                    <p className="text-sm font-semibold text-slate-900">{getLocalizedDegreeLabel(item.degree)}</p>
                    <p className="text-xs text-slate-600">{item.institution || "Institución"}</p>
                    <p className="text-xs text-slate-500">{formatRange(item.from, item.to)}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-5">
            {data.skills?.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Habilidades</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.skills.map((skill) => (
                    <span key={skill.id} className="px-2 py-1 rounded bg-slate-100 text-xs text-slate-700">
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {data.languages?.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Idiomas</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.languages.map((lang) => (
                    <span key={lang.id} className="px-2 py-1 rounded bg-slate-100 text-xs text-slate-700">
                      {lang.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {certificates.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Certificaciones</h3>
                <div className="mt-2 space-y-2 text-xs text-slate-700">
                  {certificates.map((cert) => (
                    <div key={cert.id}>
                      <p className="font-semibold text-slate-800">{cert.title}</p>
                      {cert.issuingOrganization ? <p className="text-slate-600">{cert.issuingOrganization}</p> : null}
                      {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                        <p className="text-slate-600">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                      ) : null}
                      {cert.credentialId ? <p className="text-slate-600">Credential ID: {cert.credentialId}</p> : null}
                      {cert.url ? (
                        <a href={cert.url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2">
                          {cert.url}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {Object.keys(links).length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Enlaces</h3>
                <div className="mt-2 space-y-1 text-xs text-slate-700">
                  {Object.entries(links).map(([label, url]) => (
                    <div key={label}>
                      <span className="font-semibold">{label}:</span>{" "}
                      <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2">
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </article>
  );
}

function TemplateTimeline({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const links = data.links ?? {};
  const certificates = normalizeCertificates(data.certificates);
  const personalMetaLines = getPersonalMetaLines(personal);
  const personalLocation = formatPersonalLocation(personal);

  return (
    <article className="max-w-3xl mx-auto bg-white border border-slate-200 shadow-sm p-8 [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal">
      <header className="pb-6 border-b border-slate-200">
        {shouldRenderProfileImage(personal) ? <img src={personal.profileImage} alt="Foto de perfil" className={`float-right ml-5 ${getProfileImageClass(personal, "medium")} border border-slate-200`} /> : null}
        <h1 className="text-3xl font-bold text-slate-900">{personal.name || ""}</h1>
        <p className="text-slate-600 mt-1">{personal.role || ""}</p>
        {renderNationality(personal)}
        <p className="text-sm text-slate-500 mt-2">
          {personalLocation}
          {emails[0]?.value ? ` • ${emails[0].value}` : ""}
          {phones[0]?.value ? ` • ${phones[0].value}` : ""}
        </p>
        {personalMetaLines.length ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {personalMetaLines.map((line) => (
              <span key={line} className="px-2 py-0.5 rounded bg-slate-100">{line}</span>
            ))}
          </div>
        ) : null}
      </header>

      {renderValuePropositionBlock({
        personal,
        containerClassName: "mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4",
        titleClassName: "text-xs font-semibold tracking-[0.14em] uppercase text-slate-500",
        textClassName: "mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line",
      })}

      {personal.summary && personal.showSummaryContent !== false ? <p className="mt-5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{personal.summary}</p> : null}

      {data.experience?.length ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Experiencia</h2>
          <div className="mt-4 space-y-5">
            {data.experience.map((item, index) => (
              <div key={item.id} className="relative pl-6">
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-700" />
                {index < data.experience!.length - 1 ? (
                  <span className="absolute left-[4px] top-5 bottom-[-22px] w-px bg-slate-200" />
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.role || "Rol"}</p>
                    <p className="text-xs text-slate-600">{item.company || "Empresa"}</p>
                    {formatLocation(item.city, item.country) ? <p className="text-xs text-slate-500">{formatLocation(item.city, item.country)}</p> : null}
                  </div>
                  <p className="text-xs text-slate-500 whitespace-nowrap">{formatRange(item.from, item.to)}</p>
                </div>
                {item.description ? <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{item.description}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {data.education?.length ? (
          <section>
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Educación</h3>
            <div className="mt-3 space-y-3">
              {data.education.map((item) => (
                <div key={item.id}>
                  <p className="text-sm font-semibold text-slate-900">{getLocalizedDegreeLabel(item.degree)}</p>
                  <p className="text-xs text-slate-600">{item.institution || "Institución"}</p>
                  <p className="text-xs text-slate-500">{formatRange(item.from, item.to)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {data.skills?.length ? (
          <section>
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Habilidades</h3>
            <div className="mt-3 space-y-2">
              {data.skills.map((skill) => (
                <div key={skill.id}>
                  <div className="flex justify-between text-xs text-slate-700 mb-1">
                    <span>{skill.name}</span>
                    <span>{Math.round(skillLevelPercent(skill.level))}%</span>
                  </div>
                  <ProgressBar percent={skillLevelPercent(skill.level)} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {certificates.length ? (
          <section>
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Certificaciones</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-700">
              {certificates.map((cert) => (
                <div key={cert.id}>
                  <p className="font-semibold text-slate-800">{cert.title}</p>
                  {cert.issuingOrganization ? <p className="text-slate-600">{cert.issuingOrganization}</p> : null}
                  {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                    <p className="text-slate-600">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                  ) : null}
                  {cert.credentialId ? <p className="text-slate-600">Credential ID: {cert.credentialId}</p> : null}
                  {cert.url ? (
                    <a href={cert.url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2">
                      {cert.url}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {Object.keys(links).length ? (
          <section>
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Enlaces</h3>
            <div className="mt-3 space-y-1 text-xs text-slate-700">
              {Object.entries(links).map(([label, url]) => (
                <p key={label}>
                  <span className="font-semibold">{label}:</span>{" "}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2">
                    {url}
                  </a>
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}

function TemplateCompact({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const links = data.links ?? {};
  const certificates = normalizeCertificates(data.certificates);
  const personalLocation = formatPersonalLocation(personal);

  return (
    <article className="max-w-2xl mx-auto bg-white border border-slate-200 p-8 text-slate-900 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal">
      <header className="text-center pb-4 border-b border-slate-200">
        {shouldRenderProfileImage(personal) ? <img src={personal.profileImage} alt="Foto de perfil" className={`mx-auto mb-3 ${getProfileImageClass(personal, "medium")} border border-slate-200`} /> : null}
        <h1 className="text-2xl font-bold">{personal.name || ""}</h1>
        <p className="text-sm text-slate-600">{personal.role || ""}</p>
        {renderNationality(personal)}
        <p className="text-xs text-slate-500 mt-1">
          {personalLocation}
          {emails[0]?.value ? ` • ${emails[0].value}` : ""}
          {phones[0]?.value ? ` • ${phones[0].value}` : ""}
        </p>
      </header>

      {renderValuePropositionBlock({
        personal,
        containerClassName: "mt-4 rounded-md border border-slate-200 bg-slate-50 p-3.5",
        titleClassName: "text-sm font-semibold uppercase tracking-wide text-slate-600",
        textClassName: "mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line",
      })}

      {personal.summary && personal.showSummaryContent !== false ? <p className="mt-4 text-sm text-slate-700 leading-relaxed">{personal.summary}</p> : null}

      {data.experience?.length ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Experiencia</h2>
          <div className="mt-2 space-y-3">
            {data.experience.map((item) => (
              <div key={item.id} className="text-sm">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.role || "Rol"}</p>
                  <p className="text-xs text-slate-500 whitespace-nowrap">{formatRange(item.from, item.to)}</p>
                </div>
                <p className="text-xs text-slate-600">{item.company || "Empresa"}</p>
                {item.description ? <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{item.description}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {data.education?.length ? (
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Educación</h3>
            <div className="mt-2 space-y-2 text-sm">
              {data.education.map((item) => (
                <div key={item.id}>
                  <p className="font-semibold text-slate-900">{getLocalizedDegreeLabel(item.degree)}</p>
                  <p className="text-xs text-slate-600">{item.institution || "Institución"}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          {data.skills?.length ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Habilidades</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.skills.map((skill) => (
                  <span key={skill.id} className="px-2 py-0.5 rounded border border-slate-300 text-xs">
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {data.languages?.length ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Idiomas</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.languages.map((lang) => (
                  <span key={lang.id} className="px-2 py-0.5 rounded border border-slate-300 text-xs">
                    {lang.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {certificates.length ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Certificaciones</h3>
              <div className="mt-2 space-y-1 text-xs text-slate-700">
                {certificates.map((cert) => (
                  <div key={cert.id}>
                    <p className="font-semibold text-slate-800">{cert.title}</p>
                    {cert.issuingOrganization ? <p className="text-slate-600">{cert.issuingOrganization}</p> : null}
                    {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                      <p className="text-slate-600">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                    ) : null}
                    {cert.credentialId ? <p className="text-slate-600">Credential ID: {cert.credentialId}</p> : null}
                    {cert.url ? (
                      <a href={cert.url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2">
                        {cert.url}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {Object.keys(links).length ? (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Enlaces</h3>
              <div className="mt-1 text-xs text-slate-700 space-y-1">
                {Object.entries(links).map(([label, url]) => (
                  <p key={label}>
                    <span className="font-semibold">{label}:</span>{" "}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2">
                      {url}
                    </a>
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}

function TemplateExtensa({ data }: { data: CVData }) {
  const personal = data.personal ?? {};
  const emails = normalizeContactItems(personal.emails ?? personal.email);
  const phones = normalizeContactItems(personal.phones ?? personal.phone);
  const personalMetaLines = getPersonalMetaLines(personal);
  const links = data.links ?? {};
  const skills = normalizeSkills(data.skills);
  const languages = normalizeLanguages(data.languages);
  const certificates = normalizeCertificates(data.certificates);
  const topColor = data.settings?.extensaTop ?? data.settings?.executiveTop ?? "#0f172a";
  const accentColor = data.settings?.extensaAccent ?? data.settings?.executiveAccent ?? "#22c55e";
  const dense = data.settings?.extensaDensity === "compact";
  const contrast = getContrastMode(topColor);
  const isLight = contrast === "dark";
  const headingColor = isLight ? "#0f172a" : "#ffffff";
  const subtitleColor = isLight ? "#334155" : rgbaFromHex("#ffffff", 0.84);
  const badgeBg = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.14)";

  return (
    <article className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal">
      <header className={`${dense ? "px-6 py-5" : "px-8 py-7"} border-b border-slate-200`} style={{ backgroundColor: topColor }}>
        <div className={`flex flex-col md:flex-row md:items-start md:justify-between ${dense ? "gap-3" : "gap-5"}`}>
          <div className="flex-1 min-w-0">
            <h1 className={`${dense ? "text-2xl" : "text-3xl"} font-bold tracking-tight`} style={{ color: headingColor }}>{personal.name || ""}</h1>
            <p className="mt-1 text-sm" style={{ color: subtitleColor }}>{personal.role || ""}</p>
            {renderNationality(personal, subtitleColor)}
            {formatPersonalLocation(personal) ? (
              <p className={`${dense ? "mt-1" : "mt-2"} text-sm`} style={{ color: subtitleColor }}>{formatPersonalLocation(personal)}</p>
            ) : null}
          </div>

          {shouldRenderProfileImage(personal) ? (
            <img
              src={personal.profileImage}
              alt="Foto de perfil"
              className={`${getProfileImageClass(personal, "medium")} border-2 border-white/40`}
            />
          ) : null}
        </div>

        <div className={`${dense ? "mt-3" : "mt-4"} flex flex-wrap gap-2 text-xs`} style={{ color: subtitleColor }}>
          {emails.map((email, idx) => (
            <span key={`email-${idx}`} className="rounded-full px-2 py-1" style={{ backgroundColor: badgeBg }}>
              <span className="font-semibold">{email.type}:</span> {email.value}
            </span>
          ))}
          {phones.map((phone, idx) => (
            <span key={`phone-${idx}`} className="rounded-full px-2 py-1" style={{ backgroundColor: badgeBg }}>
              <span className="font-semibold">{phone.type}:</span> {phone.value}
            </span>
          ))}
          {personalMetaLines.map((line) => (
            <span key={line} className="rounded-full px-2 py-1" style={{ backgroundColor: badgeBg }}>{line}</span>
          ))}
        </div>
        <div className={`${dense ? "mt-3 w-20" : "mt-4 w-24"} h-1.5 rounded-full`} style={{ backgroundColor: accentColor }} />
      </header>

      <div className={`${dense ? "px-6 py-5 space-y-6" : "px-8 py-7 space-y-8"}`}>
        {renderValuePropositionBlock({
          personal,
          containerClassName: `rounded-lg border border-slate-200 bg-slate-50 ${dense ? "p-3" : "p-4"}`,
          titleClassName: "text-xs font-semibold tracking-[0.14em] uppercase text-slate-500",
          textClassName: `${dense ? "mt-1" : "mt-2"} text-sm text-slate-700 leading-relaxed whitespace-pre-line`,
        })}

        {personal.summary && personal.showSummaryContent !== false ? (
          <section>
            {personal.showSummaryTitle !== false ? <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Perfil profesional</h2> : null}
            <p className={`${dense ? "mt-1" : "mt-2"} text-sm text-slate-700 leading-relaxed whitespace-pre-line`}>{personal.summary}</p>
          </section>
        ) : null}

        {data.experience?.length ? (
          <section>
            <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Experiencia</h2>
            <div className={`${dense ? "mt-2 space-y-3" : "mt-3 space-y-4"}`}>
              {data.experience.map((item) => (
                <div key={item.id} className={`rounded-lg border border-slate-200 ${dense ? "p-3" : "p-4"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.role || "Rol"}</p>
                      <p className="text-xs text-slate-600">
                        {item.company || "Empresa"}
                        {formatLocation(item.city, item.country) ? ` • ${formatLocation(item.city, item.country)}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 whitespace-nowrap">{formatRange(item.from, item.to)}</p>
                  </div>
                  {item.description ? <p className={`${dense ? "mt-1.5" : "mt-2"} text-sm text-slate-700 whitespace-pre-line`}>{item.description}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className={`grid grid-cols-1 lg:grid-cols-2 ${dense ? "gap-5" : "gap-8"}`}>
          {data.education?.length ? (
            <section>
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Educación</h3>
              <div className={`${dense ? "mt-2 space-y-2" : "mt-3 space-y-3"}`}>
                {data.education.map((item) => (
                  <div key={item.id} className={`rounded-lg border border-slate-200 ${dense ? "p-2.5" : "p-3"}`}>
                    <p className="text-sm font-semibold text-slate-900">{getLocalizedDegreeLabel(item.degree)}</p>
                    <p className="text-xs text-slate-600">{item.institution || "Institución"}</p>
                    <p className="text-xs text-slate-500">{formatRange(item.from, item.to)}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={dense ? "space-y-4" : "space-y-6"}>
            {skills.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Habilidades</h3>
                <div className={`${dense ? "mt-2 space-y-1.5" : "mt-3 space-y-2"}`}>
                  {skills.map((skill) => (
                    <div key={skill.id}>
                      <div className="mb-1 flex justify-between text-xs text-slate-700">
                        <span>{skill.name}</span>
                        <span>{Math.round(skillLevelPercent(skill.level))}%</span>
                      </div>
                      <ProgressBar percent={skillLevelPercent(skill.level)} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {languages.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Idiomas</h3>
                <div className={`${dense ? "mt-2 space-y-1.5" : "mt-3 space-y-2"}`}>
                  {languages.map((lang) => (
                    <div key={lang.id} className={`rounded border border-slate-200 text-xs text-slate-700 ${dense ? "px-2 py-1" : "px-2.5 py-1.5"}`}>
                      <span className="font-semibold">{lang.name}</span>
                      {lang.level ? <span className="ml-2">• {lang.level.toUpperCase()}</span> : null}
                      {lang.certificateUrl ? (
                        <a href={lang.certificateUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-brand-800 hover:underline">
                          Certificado
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {certificates.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Certificaciones</h3>
                <div className={`${dense ? "mt-2 space-y-1.5" : "mt-3 space-y-2"} text-xs text-slate-700`}>
                  {certificates.map((cert) => (
                    <div key={cert.id} className={`rounded border border-slate-200 ${dense ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
                      <p className="font-semibold text-slate-800">{cert.title}</p>
                      {cert.issuingOrganization ? <p className="text-slate-600">{cert.issuingOrganization}</p> : null}
                      {formatCertificatePeriod(cert.issueDate, cert.expiryDate) ? (
                        <p className="text-slate-600">{formatCertificatePeriod(cert.issueDate, cert.expiryDate)}</p>
                      ) : null}
                      {cert.credentialId ? <p className="text-slate-600">Credential ID: {cert.credentialId}</p> : null}
                      {cert.url ? (
                        <a href={cert.url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2">
                          {cert.url}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {Object.keys(links).length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Enlaces</h3>
                <div className={`${dense ? "mt-1.5" : "mt-2"} space-y-1 text-xs text-slate-700`}>
                  {Object.entries(links).map(([label, url]) => (
                    <p key={label}>
                      <span className="font-semibold">{label}:</span>{" "}
                      <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2">
                        {url}
                      </a>
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </article>
  );
}

/**
 * Colombian "hoja de vida 1003" layout built from the regular CV form
 * (personal data, education, experience, skills, languages, references) plus
 * the few fields only this format asks for (data.application). Values saved by
 * the old standalone 1003 form are used only when the regular field is empty.
 */
function Format1003Row({ label, children, wide = false }: { label: string; children?: React.ReactNode; wide?: boolean }) {
  if (!children) return null;
  return (
    <div className={`border-b border-r border-slate-300 px-2 py-1.5 ${wide ? "col-span-2" : ""}`}>
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-4 text-slate-900">{children}</div>
    </div>
  );
}

function Format1003Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h2 className="border border-slate-400 bg-slate-200 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function Format1003Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 border-l border-slate-300">{children}</div>;
}

const CELL = "border border-slate-300 px-2 py-1";

function TemplateEmploymentApplication({ data }: { data: CVData }) {
  const app = data.application || {};
  const personal = data.personal || {};
  const value = (key: string) => String(app[key] || "").trim();
  const has = (...keys: string[]) => keys.some((key) => value(key));
  const emails = normalizeContactItems(personal.emails).map((item) => item.value).filter(Boolean);
  const phones = normalizeContactItems(personal.phones).map((item) => item.value).filter(Boolean);
  const experience = data.experience || [];
  const education = data.education || [];
  const skills = normalizeSkills(data.skills).filter((item) => item.name);
  const languages = normalizeLanguages(data.languages).filter((item) => item.name);
  const certificates = normalizeCertificates(data.certificates).filter((item) => item.title);
  const references = (personal.references || []).filter((item) => item && item.isVisible !== false && item.name);
  const age = calculateAge(personal.birthDate);
  const documentText = [personal.documentType, personal.documentNumber].filter(Boolean).join(" ");
  const Row = Format1003Row;
  const Grid = Format1003Grid;
  const Section = Format1003Section;

  const generalRows = [
    ["Nombres y apellidos", personal.name || [value("givenNames"), value("surnames")].filter(Boolean).join(" ")],
    ["Documento de identidad", documentText || value("documentTypeNumber")],
    ["Fecha de nacimiento", personal.birthDate ? `${formatBirthDate(personal.birthDate)}${age ? ` (${age} años)` : ""}` : ""],
    ["Nacionalidad", formatCountry(personal.nationality)],
    ["Estado civil", value("civilStatus")],
    ["Profesión u oficio", personal.role || value("occupation")],
    ["Dirección", personal.address || value("address")],
    ["Ciudad", formatLocation(personal.city, personal.country) || value("city")],
    ["Teléfonos", phones.join(" · ") || value("phone")],
    ["Correo electrónico", emails.join(" · ") || value("email")],
    ["Cargo al que aspira", value("positionRequested")],
    ["Código de la vacante", value("vacancyCode")],
    ["Aspiración salarial", value("salaryExpectation")],
    ["Disponibilidad para trasladarse", value("relocationAvailability")],
    ["Vivienda", value("housingType")],
    ["¿Cómo se enteró de la vacante?", value("vacancySource")],
  ].filter(([, text]) => text);

  return (
    <article className="mx-auto max-w-[794px] bg-white p-7 text-slate-900 shadow-sm" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <header className="flex items-start gap-5 border-b-2 border-slate-800 pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Hoja de vida · Formato 1003</p>
          <h1 className="mt-1 text-2xl font-bold uppercase leading-tight">{personal.name}</h1>
          {personal.role ? <p className="text-sm text-slate-600">{personal.role}</p> : null}
          {value("applicationDate") ? <p className="mt-1 text-[11px] text-slate-500">Fecha de diligenciamiento: {value("applicationDate")}</p> : null}
        </div>
        {shouldRenderProfileImage(personal) ? (
          <img src={personal.profileImage} alt="Foto de perfil" className={`${getProfileImageClass(personal, "medium")} border border-slate-400`} />
        ) : null}
      </header>

      {generalRows.length ? (
        <Section title="I. Información general">
          <Grid>{generalRows.map(([label, text]) => <Row key={label} label={label}>{text}</Row>)}</Grid>
        </Section>
      ) : null}

      {personal.summary || value("careerObjective") ? (
        <Section title="Perfil profesional">
          <p className="border-x border-b border-slate-300 px-2 py-2 text-[11px] leading-5">{personal.summary || value("careerObjective")}</p>
        </Section>
      ) : null}

      {education.length || has("primaryEducation", "secondaryEducation", "technicalEducation", "universityEducation", "otherCourses", "currentStudies") ? (
        <Section title="II. Formación académica">
          {education.length ? (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[9px] uppercase text-slate-500">
                  <th className={CELL}>Título</th><th className={CELL}>Institución</th><th className={CELL}>Ciudad</th><th className={CELL}>Periodo</th>
                </tr>
              </thead>
              <tbody>
                {education.map((item) => (
                  <tr key={item.id}>
                    <td className={`${CELL} font-semibold`}>{getLocalizedDegreeLabel(item.degree)}</td>
                    <td className={CELL}>{item.institution}</td>
                    <td className={CELL}>{formatLocation(item.city, item.country)}</td>
                    <td className={`${CELL} whitespace-nowrap`}>{formatRange(item.from, item.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Grid>
              <Row label="Primaria">{value("primaryEducation")}</Row>
              <Row label="Secundaria">{value("secondaryEducation")}</Row>
              <Row label="Técnica / tecnológica">{value("technicalEducation")}</Row>
              <Row label="Universitaria">{value("universityEducation")}</Row>
              <Row label="Cursos" wide>{value("otherCourses")}</Row>
              <Row label="Estudios actuales" wide>{value("currentStudies")}</Row>
            </Grid>
          )}
        </Section>
      ) : null}

      {experience.length || has("job1", "job2", "job3", "economicSectors", "workAreas") ? (
        <Section title="III. Experiencia laboral">
          {experience.length
            ? experience.map((item, index) => (
                <div key={item.id} className="break-inside-avoid border-x border-b border-slate-300">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 bg-slate-50 px-2 py-1 text-[11px]">
                    <span className="font-bold">{index + 1}. {item.company}</span>
                    <span className="text-slate-600">
                      {formatRange(item.from, item.to)}
                      {item.city ? ` · ${formatLocation(item.city, item.country)}` : ""}
                    </span>
                  </div>
                  <div className="px-2 py-1 text-[11px]">
                    <span className="text-[9px] font-bold uppercase text-slate-500">Cargo: </span>
                    {item.role}
                  </div>
                  {item.description ? <p className="whitespace-pre-wrap break-words px-2 pb-2 text-[11px] leading-4 text-slate-700">{item.description}</p> : null}
                </div>
              ))
            : (["1", "2", "3"] as const)
                .filter((n) => value(`job${n}`))
                .map((n) => (
                  <Grid key={n}>
                    <Row label={`Empleo ${n}`} wide>{value(`job${n}`)}</Row>
                    <Row label="Cargo y salario">{value(`job${n}PositionSalary`)}</Row>
                    <Row label="Fechas">{value(`job${n}Dates`)}</Row>
                    <Row label="Jefe inmediato">{value(`job${n}Supervisor`)}</Row>
                    <Row label="Contrato y retiro">{value(`job${n}ContractExit`)}</Row>
                    <Row label="Funciones y logros" wide>{value(`job${n}Duties`)}</Row>
                  </Grid>
                ))}
          {has("economicSectors", "workAreas") ? (
            <Grid>
              <Row label="Sectores económicos">{value("economicSectors")}</Row>
              <Row label="Áreas de desempeño">{value("workAreas")}</Row>
            </Grid>
          ) : null}
        </Section>
      ) : null}

      {skills.length || languages.length || certificates.length || has("computerSkills", "languageSkills") ? (
        <Section title="IV. Conocimientos y aptitudes">
          <Grid>
            <Row label="Habilidades" wide>{skills.map((item) => item.name).join(" · ") || value("computerSkills")}</Row>
            <Row label="Idiomas" wide>{languages.map((item) => (item.level ? `${item.name} (${item.level})` : item.name)).join(" · ") || value("languageSkills")}</Row>
            <Row label="Cursos y certificaciones" wide>{certificates.map((item) => [item.title, item.issuingOrganization].filter(Boolean).join(" — ")).join(" · ")}</Row>
          </Grid>
        </Section>
      ) : null}

      {has("partnerName", "partnerOccupation", "partnerCompany", "partnerPhone", "dependants", "fatherDetails", "motherDetails", "siblings") ? (
        <Section title="V. Información familiar">
          <Grid>
            <Row label="Cónyuge o compañero(a)">{value("partnerName")}</Row>
            <Row label="Ocupación">{[value("partnerOccupation"), value("partnerCompany")].filter(Boolean).join(" · ")}</Row>
            <Row label="Teléfono del cónyuge">{value("partnerPhone")}</Row>
            <Row label="Personas a cargo">{value("dependants")}</Row>
            <Row label="Padre">{value("fatherDetails")}</Row>
            <Row label="Madre">{value("motherDetails")}</Row>
            <Row label="Hermanos" wide>{value("siblings")}</Row>
          </Grid>
        </Section>
      ) : null}

      {has("healthProvider", "pensionFund", "severanceFund", "currentEmployment", "previousCompanyRelation", "companyReferences", "additionalIncome", "financialObligations", "documentAvailability", "hobbies", "awards") ? (
        <Section title="VI. Información complementaria">
          <Grid>
            <Row label="EPS">{value("healthProvider")}</Row>
            <Row label="Fondo de pensiones">{value("pensionFund")}</Row>
            <Row label="Fondo de cesantías">{value("severanceFund")}</Row>
            <Row label="Situación laboral actual">{value("currentEmployment")}</Row>
            <Row label="¿Ha trabajado en la empresa?">{value("previousCompanyRelation")}</Row>
            <Row label="Conocidos en la empresa">{value("companyReferences")}</Row>
            <Row label="Otros ingresos">{value("additionalIncome")}</Row>
            <Row label="Obligaciones económicas">{value("financialObligations")}</Row>
            <Row label="Otros documentos" wide>{value("documentAvailability")}</Row>
            <Row label="Aficiones">{value("hobbies")}</Row>
            <Row label="Reconocimientos">{value("awards")}</Row>
          </Grid>
        </Section>
      ) : null}

      {references.length || personal.referencesAvailableOnRequest || has("reference1", "reference2", "emergencyContact") ? (
        <Section title="VII. Referencias">
          {references.length ? (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[9px] uppercase text-slate-500">
                  <th className={CELL}>Nombre</th><th className={CELL}>Tipo</th><th className={CELL}>Cargo / parentesco</th><th className={CELL}>Contacto</th>
                </tr>
              </thead>
              <tbody>
                {references.map((item) => {
                  const hidden = item.hiddenFields || [];
                  const show = (field: string) => !hidden.includes(field);
                  const detail = item.type === "laboral"
                    ? [show("position") ? item.position : "", show("company") ? item.company : ""].filter(Boolean).join(" · ")
                    : show("relationship") ? item.relationship || item.position : "";
                  return (
                    <tr key={item.id}>
                      <td className={`${CELL} font-semibold`}>{show("name") ? item.name : ""}</td>
                      <td className={CELL}>{item.type === "laboral" ? "Laboral" : "Personal"}</td>
                      <td className={CELL}>{detail}</td>
                      <td className={`${CELL} break-words`}>{[show("phone") ? item.phone : "", show("email") ? item.email : ""].filter(Boolean).join(" · ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : has("reference1", "reference2") ? (
            <Grid>
              <Row label="Referencia 1">{value("reference1")}</Row>
              <Row label="Referencia 2">{value("reference2")}</Row>
            </Grid>
          ) : null}
          {personal.referencesAvailableOnRequest ? (
            <p className="border-x border-b border-slate-300 px-2 py-1.5 text-[11px]">Referencias laborales y personales: disponibles a solicitud.</p>
          ) : null}
          {value("emergencyContact") ? (
            <Grid>
              <Row label="Contacto de emergencia" wide>{value("emergencyContact")}</Row>
            </Grid>
          ) : null}
        </Section>
      ) : null}

      <footer className="mt-10 grid grid-cols-2 gap-10 text-[11px]">
        <div className="border-t border-slate-800 pt-1">Firma</div>
        <div className="border-t border-slate-800 pt-1">{documentText ? `Documento: ${documentText}` : "Documento de identidad"}</div>
      </footer>
    </article>
  );
}

/** Width of each template's page, so the supplemental block lines up with it. */
const TEMPLATE_PAGE_WIDTH: Record<string, string> = {
  executive: "max-w-3xl",
  timeline: "max-w-3xl",
  extensa: "max-w-4xl",
  "photo-professional": "max-w-3xl",
  "modern-sidebar": "max-w-3xl",
  extensive: "max-w-4xl",
};

/** Background and text colours of the dark templates, so the block continues the page. */
function supplementalSurface(template: string, data: CVData): { style?: React.CSSProperties; dark: boolean } {
  if (template === "developer") {
    const bg = data.settings?.developerBg ?? "#0f172a";
    const dark = getContrastMode(bg) !== "dark";
    return { style: { backgroundColor: bg, color: dark ? "#f1f5f9" : "#0f172a" }, dark };
  }
  if (template === "creative") {
    const gradient = data.settings?.creativeGradient ?? "linear-gradient(135deg, #3730a3 0%, #0f172a 55%, #1e293b 100%)";
    const start = getGradientStartColor(gradient);
    const dark = getContrastMode(start) !== "dark";
    return { style: { backgroundColor: start, color: dark ? "#ffffff" : "#0f172a" }, dark };
  }
  return { dark: false };
}

function SupplementalPersonalSections({ data, template, includeReferences = true, includeRequestText = true, includeDocument = true }: { data: CVData; template: string; includeReferences?: boolean; includeRequestText?: boolean; includeDocument?: boolean }) {
  const personal = data.personal ?? {};
  const references = !includeReferences || personal.showReferences === false ? [] : (personal.references || []).filter((item) => { if (!item || item.isVisible === false) return false; const hidden = item.hiddenFields || []; return (item.name && !hidden.includes("name")) || (item.phone && !hidden.includes("phone")) || (item.email && !hidden.includes("email")) || (item.company && !hidden.includes("company")) || (item.position && !hidden.includes("position")) || (item.relationship && !hidden.includes("relationship")); });
  const showRequestText = includeRequestText && Boolean(personal.referencesAvailableOnRequest);
  const showDocument = Boolean(includeDocument && personal.showDocumentIdentity && (personal.documentType || personal.documentNumber));
  if (!showDocument && references.length === 0 && !showRequestText) return null;
  const width = TEMPLATE_PAGE_WIDTH[template] ?? "max-w-2xl";
  const surface = supplementalSurface(template, data);
  const border = surface.dark ? "border-white/10" : "border-slate-200 bg-white text-slate-800";
  const label = surface.dark ? "opacity-70" : "text-slate-600";
  const meta = surface.dark ? "opacity-70" : "text-slate-500";
  return (
    <section className={`mx-auto -mt-px w-full ${width} break-words border-x border-b ${border} px-8 pb-7 pt-5 shadow-sm`} style={surface.style}>
      {showDocument ? (
        <div className="mb-4">
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${label}`}>Documento de identidad</h2>
          <p className="mt-1 text-sm">{[personal.documentType, personal.documentNumber].filter(Boolean).join(" · ")}</p>
        </div>
      ) : null}
      {references.length ? (
        <div>
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${label}`}>Referencias laborales y personales</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {references.map((reference) => {
              const hidden = reference.hiddenFields || [];
              const show = (field: string) => !hidden.includes(field);
              const details = [reference.type === "laboral" && show("position") ? reference.position : "", reference.type === "laboral" && show("company") ? reference.company : "", reference.type === "personal" && show("relationship") ? (reference.relationship || reference.position) : ""].filter(Boolean);
              return (
                <div key={reference.id} className="min-w-0 text-sm">
                  {show("name") && reference.name ? <p className="font-semibold">{reference.name}</p> : null}
                  {details.length ? <p className={`text-xs ${meta}`}>{reference.type === "laboral" ? "Laboral" : "Familiar / personal"} · {details.join(" · ")}</p> : null}
                  {show("phone") && reference.phone ? <p className={`text-xs ${meta}`}>{reference.phone}</p> : null}
                  {show("email") && reference.email ? <p className={`text-xs ${meta}`}>{reference.email}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {showRequestText ? <p className={`text-sm ${references.length ? "mt-3" : ""}`}>Referencias laborales y personales: disponibles a solicitud.</p> : null}
    </section>
  );
}

const TEMPLATE_COMPONENTS: Record<string, (props: { data: CVData }) => JSX.Element> = {
  sidebar: TemplateSidebar,
  corporate: TemplateCorporate,
  developer: TemplateDeveloper,
  creative: TemplateCreative,
  classic: TemplateClassic,
  executive: TemplateExecutive,
  extensa: TemplateExtensa,
  timeline: TemplateTimeline,
  compact: TemplateCompact,
  ats: TemplateMinimal,
  minimal: TemplateMinimal,
  employment: TemplateEmploymentApplication,
  // Legacy aliases kept for backward compatibility with existing CVs
  "ats-optimized": TemplateMinimal,
  "photo-professional": TemplateExecutive,
  "modern-sidebar": TemplateTimeline,
  elegant: TemplateCompact,
  extensive: TemplateExtensa,
};

const TEMPLATE_ALIASES: Record<string, string> = {
  "ats-optimized": "ats",
  "photo-professional": "executive",
  "modern-sidebar": "timeline",
  elegant: "compact",
  extensive: "extensa",
};

export function TemplateRenderer({ template, data }: Props) {
  const key = TEMPLATE_COMPONENTS[template] ? template : "minimal";
  const Template = TEMPLATE_COMPONENTS[key];
  const canonical = TEMPLATE_ALIASES[key] ?? key;
  return (
    <>
      <Template data={data} />
      {canonical === "employment" ? null : (
        <SupplementalPersonalSections
          data={data}
          template={canonical}
          // The sidebar template already prints references and the document in its own column.
          includeReferences={canonical !== "sidebar"}
          includeRequestText={canonical !== "sidebar"}
          includeDocument={canonical !== "sidebar"}
        />
      )}
    </>
  );
}
