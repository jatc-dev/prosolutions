import React from "react";
import i18n from "../i18n";

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
    showAddress?: boolean;
    showCity?: boolean;
    showCountry?: boolean;
    valueProposition?: string;
    showValuePropositionTitle?: boolean;
    summary?: string;
    profileImage?: string;
    profileImageStyle?: "round" | "square" | "portrait";
    showProfileImage?: boolean;
    website?: string;
    linkedin?: string;
    github?: string;
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

function formatLocation(city?: string, country?: string) {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.join(", ");
}

function formatPersonalLocation(personal: CVData["personal"]) {
  const parts = [
    personal?.showAddress === false ? "" : personal?.address,
    personal?.showCity === false ? "" : personal?.city,
    personal?.showCountry === false ? "" : personal?.country,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.join(", ");
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

function getProfileImageClass(personal: CVData["personal"], size: "small" | "medium" = "medium") {
  const style = personal?.profileImageStyle || "round";
  const sizeClass =
    size === "small"
      ? style === "portrait"
        ? "w-20 h-28"
        : "w-20 h-20"
      : style === "portrait"
        ? "w-24 h-32"
        : "w-24 h-24";
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
  if (!content) return null;

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
  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return blackContrast >= whiteContrast ? "dark" : "light";
}

function getCreativeOverlayOpacity(gradient: string, minimumOpacity: number): number {
  const stops = [...String(gradient).matchAll(/#([0-9a-fA-F]{6})\b/g)]
    .map((match) => hexToRgb(match[1]))
    .filter((rgb): rgb is NonNullable<typeof rgb> => Boolean(rgb));
  if (stops.length === 0) return minimumOpacity;

  // Use the brightest channel from all stops as a conservative bound for
  // intermediate gradient colors, then account for the template's white/10
  // contact chips and its slate-200 secondary text.
  const brightest = {
    r: Math.max(...stops.map((color) => color.r)),
    g: Math.max(...stops.map((color) => color.g)),
    b: Math.max(...stops.map((color) => color.b)),
  };
  const text = hexToRgb("#e2e8f0");
  if (!text) return minimumOpacity;
  const luminance = (color: { r: number; g: number; b: number }) => {
    const toLinear = (channel: number) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
  };
  const textLuminance = luminance(text);
  const hasAaContrast = (opacity: number) => {
    const darkened = {
      r: brightest.r * (1 - opacity),
      g: brightest.g * (1 - opacity),
      b: brightest.b * (1 - opacity),
    };
    const onContactChip = {
      r: darkened.r * 0.9 + 255 * 0.1,
      g: darkened.g * 0.9 + 255 * 0.1,
      b: darkened.b * 0.9 + 255 * 0.1,
    };
    const backgroundLuminance = luminance(onContactChip);
    return (textLuminance + 0.05) / (backgroundLuminance + 0.05) >= 4.5;
  };

  if (hasAaContrast(minimumOpacity)) return minimumOpacity;
  let lower = minimumOpacity;
  let upper = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (hasAaContrast(middle)) upper = middle;
    else lower = middle;
  }
  return upper;
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
      <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${percent}%` }} />
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
        {shouldRenderProfileImage(personal) && (
          <img
            src={personal.profileImage}
            alt="Foto de perfil"
            className={`${getProfileImageClass(personal, "small")} border border-slate-200 mb-3`}
          />
        )}
        <h1
          className="text-4xl font-bold tracking-tight ats-name"
          itemProp="name"
        >
          {personal.name || "Tu Nombre"}
        </h1>
        <p
          className="text-lg text-slate-700 ats-title"
          itemProp="jobTitle"
        >
          {personal.role || "Tu título profesional"}
        </p>
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
            {personal.showCountry !== false && personal.country ? <span itemProp="addressCountry">{personal.country}</span> : null}
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
      {personal.summary && (
        <section className="mb-6" itemProp="description">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 ats-section-header">Resumen Profesional</h2>
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
                          {item.country}
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
          <h1 className="text-3xl font-bold">{personal.name || "Tu Nombre"}</h1>
          <p className="text-sm text-slate-500">{personal.role || "Tu título profesional"}</p>
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
        containerClassName: "mt-6 rounded-r-lg border-l-4 border-brand-500 bg-slate-50/70 pl-4 pr-3 py-2",
        titleClassName: "text-sm font-semibold uppercase tracking-wide text-slate-500",
        textClassName: "mt-2 text-sm text-slate-700 whitespace-pre-line",
      })}

      {personal.summary && (
        <section className="mt-6 border-l-4 border-brand-500 pl-4 py-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Perfil</h2>
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
                  {item.description && <p className="mt-1 text-sm text-slate-700">{item.description}</p>}
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
                  <a href={cert.url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
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
                <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
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
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: textStrong }}>{personal.name || "Tu Nombre"}</h1>
          <p className="mt-1 text-sm" style={{ color: textMuted }}>{personal.role || "Desarrollador"}</p>
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

      {personal.summary && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Acerca de mí</h2>
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
                {item.description && <p className="mt-2 text-sm text-slate-300">{item.description}</p>}
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
  const creativeIntensity = data.settings?.creativeIntensity ?? "medium";
  const intensityOverlay: Record<"soft" | "medium" | "strong", number> = {
    soft: 0.08,
    medium: 0.18,
    strong: 0.30,
  };
  const requestedOverlay = intensityOverlay[creativeIntensity] ?? intensityOverlay.medium;
  const overlay = getCreativeOverlayOpacity(creativeGradient, requestedOverlay);
  const certificates = normalizeCertificates(data.certificates);

  return (
    <div
      className="max-w-2xl mx-auto text-white p-9 rounded-2xl shadow-lg border border-white/10 [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal"
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
        <h1 className="text-4xl font-extrabold tracking-tight">{personal.name || "Tu Nombre"}</h1>
        <p className="text-sm text-slate-200">{personal.role || "Profesional Creativo"}</p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-200">
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
        titleClassName: "text-sm font-semibold uppercase tracking-wide text-slate-300",
        textClassName: "mt-2 text-sm text-slate-100 whitespace-pre-line",
      })}

      {personal.summary && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Sobre mí</h2>
          <p className="mt-2 text-sm text-slate-100">{personal.summary}</p>
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
                {item.description && <p className="mt-2 text-sm text-slate-200">{item.description}</p>}
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
        <h1 className="text-4xl font-bold tracking-tight">{personal.name || "Tu Nombre"}</h1>
        <p className="mt-2 text-sm text-slate-500">{personal.role || "Tu título profesional"}</p>
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

      {personal.summary && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Resumen</h2>
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
                {item.description && <p className="mt-1 text-sm text-slate-700">{item.description}</p>}
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
            {shouldRenderProfileImage(personal) ? (
              <img
                src={personal.profileImage}
                alt="Foto de perfil"
                className={`${getProfileImageClass(personal, "medium")} border-2 border-white/40`}
              />
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: headingColor }}>{personal.name || "Tu Nombre"}</h1>
            <p className="text-sm" style={{ color: mutedColor }}>{personal.role || "Tu título profesional"}</p>
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

          {personal.summary ? (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: softColor }}>Resumen</h2>
              <p className="mt-2 text-sm" style={{ color: mutedColor }}>{personal.summary}</p>
            </div>
          ) : null}
        </aside>

        <main className="col-span-2 p-8">
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
                    {item.description && <p className="mt-1 text-sm text-slate-700">{item.description}</p>}
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
                      <a href={cert.url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
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
                    <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      {url}
                    </a>
                  </div>
                ))}
              </div>
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
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: headingColor }}>{personal.name || "Tu Nombre"}</h1>
        <p className="mt-1" style={{ color: subtitleColor }}>{personal.role || "Tu título profesional"}</p>
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

        {personal.summary ? (
          <section>
            <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Perfil Profesional</h2>
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
        <h1 className="text-3xl font-bold text-slate-900">{personal.name || "Tu Nombre"}</h1>
        <p className="text-slate-600 mt-1">{personal.role || "Tu título profesional"}</p>
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

      {personal.summary ? <p className="mt-5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{personal.summary}</p> : null}

      {data.experience?.length ? (
        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Experiencia</h2>
          <div className="mt-4 space-y-5">
            {data.experience.map((item, index) => (
              <div key={item.id} className="relative pl-6">
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
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
        <h1 className="text-2xl font-bold">{personal.name || "Tu Nombre"}</h1>
        <p className="text-sm text-slate-600">{personal.role || "Tu título profesional"}</p>
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

      {personal.summary ? <p className="mt-4 text-sm text-slate-700 leading-relaxed">{personal.summary}</p> : null}

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
                {item.description ? <p className="text-sm text-slate-700 mt-1">{item.description}</p> : null}
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
            <h1 className={`${dense ? "text-2xl" : "text-3xl"} font-bold tracking-tight`} style={{ color: headingColor }}>{personal.name || "Tu Nombre"}</h1>
            <p className="mt-1 text-sm" style={{ color: subtitleColor }}>{personal.role || "Tu título profesional"}</p>
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

        {personal.summary ? (
          <section>
            <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-500">Perfil profesional</h2>
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
                        <a href={lang.certificateUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-brand-600 hover:underline">
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

export function TemplateRenderer({ template, data }: Props) {
  switch (template) {
    case "sidebar":
      return <TemplateSidebar data={data} />;
    case "corporate":
      return <TemplateCorporate data={data} />;
    case "developer":
      return <TemplateDeveloper data={data} />;
    case "creative":
      return <TemplateCreative data={data} />;
    case "classic":
      return <TemplateClassic data={data} />;
    case "executive":
      return <TemplateExecutive data={data} />;
    case "extensa":
      return <TemplateExtensa data={data} />;
    case "timeline":
      return <TemplateTimeline data={data} />;
    case "compact":
      return <TemplateCompact data={data} />;

    // Legacy aliases kept for backward compatibility with existing CVs
    case "ats-optimized":
      return <TemplateMinimal data={data} />;
    case "photo-professional":
      return <TemplateExecutive data={data} />;
    case "modern-sidebar":
      return <TemplateTimeline data={data} />;
    case "elegant":
      return <TemplateCompact data={data} />;
    case "extensive":
      return <TemplateExtensa data={data} />;
    default:
      return <TemplateMinimal data={data} />;
  }
}
