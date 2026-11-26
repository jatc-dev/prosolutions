import React from "react";
import { sectionTitle, type SectionTitleKey } from "../sectionTitles";
import {
  ContactPrefix,
  formatCertificatePeriod,
  formatLocation,
  formatPersonalLocation,
  formatRange,
  getLocalizedDegreeLabel,
  getPersonalMetaLines,
  normalizeCertificates,
  normalizeContactItems,
  normalizeLanguages,
  normalizeSkills,
  ProfilePhoto,
  renderNationality,
  renderValuePropositionBlock,
  shouldRenderProfileImage,
  type CVData,
} from "./TemplateRenderer";

/*
 * Templates added in the 2026-11 catalog expansion. They are built from the
 * shared pieces below, so every one keeps what makes a CV readable by an
 * applicant tracking system (ATS): one reading order (the HTML order, also
 * used for the PDF text layer), standard section titles, real text (no text
 * in images, no skill bars) and contact details in the body.
 *
 * Layout families follow the most common CV formats: Harvard (academic,
 * education first), the European label-column layout, functional
 * (skills first), modern, elegant, first job (studies first), two columns
 * and the date-column chronological layout.
 */

type SectionKey = "summary" | "value" | "experience" | "education" | "skills" | "languages" | "certificates" | "links";

interface Look {
  /** Classes of each section block. */
  section: string;
  /** Classes of the section title (h2). */
  title: string;
  /** Optional style of the section title. */
  titleStyle?: React.CSSProperties;
  /** Title with a background, bar or borders: the room above it is a margin, not padding. */
  boxedTitle?: boolean;
  itemTitle: string;
  itemMeta: string;
  body: string;
  /** Date column (left) instead of dates next to the title. */
  dateColumn?: boolean;
  /** Harvard-style items: organisation and place on the first line. */
  orgFirst?: boolean;
  /** Skills as a bulleted list (functional) instead of one line. */
  skillsList?: boolean;
  /** Extra classes around the skills list (a highlighted box). */
  skillsBox?: string;
}

function prepare(data: CVData) {
  const personal = data.personal ?? {};
  const contacts = [...normalizeContactItems(personal.emails ?? personal.email), ...normalizeContactItems(personal.phones ?? personal.phone)];
  return {
    personal,
    contacts,
    location: formatPersonalLocation(personal),
    meta: getPersonalMetaLines(personal),
    links: Object.entries(data.links || {}),
    skills: normalizeSkills(data.skills).filter((item) => item.name),
    languages: normalizeLanguages(data.languages).filter((item) => item.name),
    certificates: normalizeCertificates(data.certificates).filter((item) => item.title),
  };
}

type Prepared = ReturnType<typeof prepare>;

function SectionBlock({ data, look, keyName, children }: { data: CVData; look: Look; keyName: SectionTitleKey; children: React.ReactNode }) {
  return (
    <section className={look.section}>
      <h2 data-cv-section-title={look.boxedTitle ? "box" : ""} className={look.title} style={look.titleStyle}>{sectionTitle(data.settings, keyName)}</h2>
      {children}
    </section>
  );
}

function ContactLine({ prepared, className, separator = " · " }: { prepared: Prepared; className: string; separator?: string }) {
  const parts: React.ReactNode[] = [];
  if (prepared.location) parts.push(<span key="loc">{prepared.location}</span>);
  prepared.contacts.forEach((contact, index) => parts.push(<span key={`c${index}`}><ContactPrefix item={contact} /> {contact.value}</span>));
  if (!parts.length) return null;
  return (
    <p className={className}>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {index ? <span aria-hidden="true">{separator}</span> : null}
          {part}
        </React.Fragment>
      ))}
    </p>
  );
}

function MetaLines({ prepared, className }: { prepared: Prepared; className: string }) {
  return (
    <>
      {renderNationality(prepared.personal)}
      {prepared.meta.map((line) => <p key={line} className={className}>{line}</p>)}
    </>
  );
}

function DatedItem({ look, dates, title, meta, children }: { look: Look; dates: string; title: string; meta: string; children?: React.ReactNode }) {
  if (look.dateColumn) {
    return (
      <div data-cv-item className="grid grid-cols-[7.5rem_1fr] gap-x-5">
        <p className="text-xs font-semibold text-brand-800 pt-0.5">{dates}</p>
        <div className="min-w-0">
          <p className={look.itemTitle}>{title}</p>
          {meta ? <p className={look.itemMeta}>{meta}</p> : null}
          {children}
        </div>
      </div>
    );
  }
  return (
    <div data-cv-item>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className={look.itemTitle}>{title}</p>
        {dates ? <p className={`shrink-0 ${look.itemMeta}`}>{dates}</p> : null}
      </div>
      {meta ? <p className={look.itemMeta}>{meta}</p> : null}
      {children}
    </div>
  );
}

/** Harvard: organisation and place, then role (italic) and dates. */
function OrgFirstItem({ look, org, place, role, dates, children }: { look: Look; org: string; place: string; role: string; dates: string; children?: React.ReactNode }) {
  return (
    <div data-cv-item>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className={look.itemTitle}>{org}</p>
        {place ? <p className={`shrink-0 ${look.itemMeta}`}>{place}</p> : null}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className={`italic ${look.itemMeta}`}>{role}</p>
        {dates ? <p className={`shrink-0 ${look.itemMeta}`}>{dates}</p> : null}
      </div>
      {children}
    </div>
  );
}

function renderSection(key: SectionKey, data: CVData, prepared: Prepared, look: Look): React.ReactNode {
  const { personal } = prepared;
  switch (key) {
    case "value":
      return renderValuePropositionBlock({
        personal,
        containerClassName: `${look.section} rounded-md border border-slate-200 bg-slate-50 p-4`,
        titleClassName: look.title,
        textClassName: `mt-2 whitespace-pre-line ${look.body}`,
      });
    case "summary":
      if (!personal.summary || personal.showSummaryContent === false) return null;
      return (
        <section className={look.section}>
          {personal.showSummaryTitle !== false ? <h2 data-cv-section-title={look.boxedTitle ? "box" : ""} className={look.title} style={look.titleStyle}>{sectionTitle(data.settings, "summary")}</h2> : null}
          <p className={`mt-2 whitespace-pre-line ${look.body}`}>{personal.summary}</p>
        </section>
      );
    case "experience":
      if (!data.experience?.length) return null;
      return (
        <SectionBlock data={data} look={look} keyName="experience">
          <div className="mt-3 space-y-4">
            {data.experience.map((item) => {
              const place = formatLocation(item.city, item.country);
              const dates = formatRange(item.from, item.to);
              const description = item.description ? <p className={`mt-1 whitespace-pre-line ${look.body}`}>{item.description}</p> : null;
              return look.orgFirst ? (
                <OrgFirstItem key={item.id} look={look} org={item.company || ""} place={place} role={item.role || ""} dates={dates}>{description}</OrgFirstItem>
              ) : (
                <DatedItem key={item.id} look={look} dates={dates} title={item.role || ""} meta={[item.company, place].filter(Boolean).join(" · ")}>{description}</DatedItem>
              );
            })}
          </div>
        </SectionBlock>
      );
    case "education":
      if (!data.education?.length) return null;
      return (
        <SectionBlock data={data} look={look} keyName="education">
          <div className="mt-3 space-y-3">
            {data.education.map((item) => {
              const place = formatLocation(item.city, item.country);
              const dates = formatRange(item.from, item.to);
              const degree = getLocalizedDegreeLabel(item.degree);
              return look.orgFirst ? (
                <OrgFirstItem key={item.id} look={look} org={item.institution || ""} place={place} role={degree} dates={dates} />
              ) : (
                <DatedItem key={item.id} look={look} dates={dates} title={degree} meta={[item.institution, place].filter(Boolean).join(" · ")} />
              );
            })}
          </div>
        </SectionBlock>
      );
    case "skills":
      if (!prepared.skills.length) return null;
      return (
        <SectionBlock data={data} look={look} keyName="skills">
          {look.skillsList ? (
            <ul className={`mt-2 grid list-disc grid-cols-2 gap-x-8 gap-y-1 pl-5 ${look.skillsBox ?? ""} ${look.body}`}>
              {prepared.skills.map((skill) => <li key={skill.id}>{skill.name}</li>)}
            </ul>
          ) : (
            <p className={`mt-2 ${look.body}`}>{prepared.skills.map((skill) => skill.name).join(" · ")}</p>
          )}
        </SectionBlock>
      );
    case "languages":
      if (!prepared.languages.length) return null;
      return (
        <SectionBlock data={data} look={look} keyName="languages">
          <p className={`mt-2 ${look.body}`}>
            {prepared.languages.map((lang) => (lang.level ? `${lang.name} (${String(lang.level).toUpperCase()})` : lang.name)).join(" · ")}
          </p>
        </SectionBlock>
      );
    case "certificates":
      if (!prepared.certificates.length) return null;
      return (
        <SectionBlock data={data} look={look} keyName="certificates">
          <div className="mt-3 space-y-2">
            {prepared.certificates.map((cert) => (
              <div key={cert.id} data-cv-item>
                <p className={look.itemTitle}>{cert.title}</p>
                {[cert.issuingOrganization, formatCertificatePeriod(cert.issueDate, cert.expiryDate)].filter(Boolean).length ? (
                  <p className={look.itemMeta}>{[cert.issuingOrganization, formatCertificatePeriod(cert.issueDate, cert.expiryDate)].filter(Boolean).join(" · ")}</p>
                ) : null}
                {cert.url ? <a href={cert.url} target="_blank" rel="noreferrer" className="text-xs text-brand-800 underline underline-offset-2">{cert.url}</a> : null}
              </div>
            ))}
          </div>
        </SectionBlock>
      );
    case "links":
      if (!prepared.links.length) return null;
      return (
        <SectionBlock data={data} look={look} keyName="links">
          <div className={`mt-2 space-y-1 ${look.body}`}>
            {prepared.links.map(([label, url]) => (
              <p key={label}>
                <span className="font-semibold">{label}:</span>{" "}
                <a href={url} target="_blank" rel="noreferrer" className="text-brand-800 underline underline-offset-2">{url}</a>
              </p>
            ))}
          </div>
        </SectionBlock>
      );
    default:
      return null;
  }
}

function Sections({ order, data, prepared, look }: { order: SectionKey[]; data: CVData; prepared: Prepared; look: Look }) {
  return <>{order.map((key) => <React.Fragment key={key}>{renderSection(key, data, prepared, look)}</React.Fragment>)}</>;
}

const PAGE = "max-w-2xl mx-auto bg-white text-slate-900 border border-slate-200 shadow-sm [&_a]:inline-block [&_a]:max-w-full [&_a]:break-all [&_a]:whitespace-normal";
const SERIF = { fontFamily: "'Merriweather Variable', Merriweather, Georgia, serif" };
const DISPLAY_SERIF = { fontFamily: "'Playfair Display Variable', 'Playfair Display', Georgia, serif" };
const STANDARD_ORDER: SectionKey[] = ["value", "summary", "experience", "education", "skills", "languages", "certificates", "links"];

/** Harvard: academic one-column, serif, education first, organisation-first items. */
export function TemplateHarvard({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-6",
    title: "border-b border-slate-800 pb-0.5 text-sm font-bold uppercase tracking-wider text-slate-900",
    itemTitle: "text-sm font-bold text-slate-900",
    itemMeta: "text-sm text-slate-700",
    body: "text-sm leading-relaxed text-slate-800",
    orgFirst: true,
  };
  return (
    <div className={`${PAGE} px-10 py-9`} style={SERIF}>
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-wide text-slate-900">{personal.name || ""}</h1>
        {personal.role ? <p className="mt-1 text-sm text-slate-700">{personal.role}</p> : null}
        <ContactLine prepared={prepared} className="mt-2 text-xs text-slate-700" />
        <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-600" />
      </header>
      <Sections order={["value", "summary", "education", "experience", "skills", "languages", "certificates", "links"]} data={data} prepared={prepared} look={look} />
    </div>
  );
}

/** Europea: section titles in a left label column, details on the right. */
export function TemplateEuropean({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-6 grid grid-cols-[8.5rem_1fr] gap-x-6 [&>h2]:col-start-1 [&>h2]:text-right [&>*:not(h2)]:col-start-2 [&>*:not(h2)]:row-start-1 [&>*:not(h2)]:mt-0",
    title: "pt-0.5 text-xs font-bold uppercase tracking-wide text-brand-800",
    itemTitle: "text-sm font-semibold text-slate-900",
    itemMeta: "text-xs text-slate-600",
    body: "text-sm leading-relaxed text-slate-700",
  };
  return (
    <div className={`${PAGE} p-9`}>
      <header className="grid grid-cols-[8.5rem_1fr] items-center gap-x-6 border-b-2 border-brand-700 pb-6">
        <div className="flex justify-end">
          {shouldRenderProfileImage(personal) ? <ProfilePhoto personal={personal} size="medium" alt="Foto de perfil" className="border border-slate-200" /> : null}
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-slate-900">{personal.name || ""}</h1>
          {personal.role ? <p className="mt-1 text-sm font-medium text-brand-800">{personal.role}</p> : null}
          <div className="mt-3 space-y-0.5 text-xs text-slate-700">
            {prepared.location ? <p>{prepared.location}</p> : null}
            {prepared.contacts.map((contact, index) => <p key={index}><ContactPrefix item={contact} /> {contact.value}</p>)}
          </div>
          <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-600" />
        </div>
      </header>
      <Sections order={STANDARD_ORDER} data={data} prepared={prepared} look={look} />
    </div>
  );
}

/** Por competencias (functional): skills first, then a compact history. */
export function TemplateFunctional({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-6",
    title: "text-sm font-bold uppercase tracking-wide text-brand-800",
    itemTitle: "text-sm font-semibold text-slate-900",
    itemMeta: "text-xs text-slate-500",
    body: "text-sm leading-relaxed text-slate-700",
    skillsList: true,
    // The key skills are the core of this format: a highlighted box.
    skillsBox: "rounded-md border border-brand-200 bg-brand-50 py-3 pl-8 pr-4",
  };
  return (
    <div className={`${PAGE} p-9`}>
      <header className="flex items-start justify-between gap-6 border-l-4 border-brand-700 pl-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-slate-900">{personal.name || ""}</h1>
          {personal.role ? <p className="mt-1 text-base text-slate-700">{personal.role}</p> : null}
          <ContactLine prepared={prepared} className="mt-3 text-xs text-slate-600" />
          <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-500" />
        </div>
        {shouldRenderProfileImage(personal) ? <ProfilePhoto personal={personal} size="small" alt="Foto de perfil" className="border border-slate-200" /> : null}
      </header>
      <Sections order={["value", "summary", "skills", "languages", "experience", "education", "certificates", "links"]} data={data} prepared={prepared} look={look} />
    </div>
  );
}

/** Moderna: bold name, accent bar before each title, one column. */
export function TemplateModern({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-7",
    title: "border-l-4 border-brand-700 pl-2.5 text-sm font-bold uppercase tracking-wide text-slate-800",
    boxedTitle: true,
    itemTitle: "text-sm font-semibold text-slate-900",
    itemMeta: "text-xs text-slate-500",
    body: "text-sm leading-relaxed text-slate-700",
  };
  return (
    <div className={`${PAGE} p-9`}>
      <header className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{personal.name || ""}</h1>
          {personal.role ? <p className="mt-1 text-lg font-medium text-brand-800">{personal.role}</p> : null}
          <ContactLine prepared={prepared} className="mt-3 text-xs text-slate-600" separator="  |  " />
          <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-500" />
        </div>
        {shouldRenderProfileImage(personal) ? <ProfilePhoto personal={personal} size="medium" alt="Foto de perfil" /> : null}
      </header>
      <Sections order={STANDARD_ORDER} data={data} prepared={prepared} look={look} />
    </div>
  );
}

/** Elegante: centred header, display serif, centred spaced titles. */
export function TemplateElegant({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-7",
    title: "border-y border-slate-300 py-1 text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-700",
    boxedTitle: true,
    itemTitle: "text-sm font-semibold text-slate-900",
    itemMeta: "text-xs italic text-slate-500",
    body: "text-sm leading-relaxed text-slate-700",
  };
  return (
    <div className={`${PAGE} px-10 py-10`}>
      <header className="text-center">
        {shouldRenderProfileImage(personal) ? <div className="mb-3 flex justify-center"><ProfilePhoto personal={personal} size="medium" alt="Foto de perfil" /></div> : null}
        <h1 className="text-4xl font-semibold text-slate-900" style={DISPLAY_SERIF}>{personal.name || ""}</h1>
        {personal.role ? <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-500">{personal.role}</p> : null}
        <ContactLine prepared={prepared} className="mt-3 text-xs text-slate-600" />
        <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-500" />
      </header>
      <Sections order={STANDARD_ORDER} data={data} prepared={prepared} look={look} />
    </div>
  );
}

/** Primer empleo: profile highlighted, then studies, skills and languages before experience. */
export function TemplateFirstJob({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-6",
    title: "text-sm font-bold uppercase tracking-wide text-brand-800",
    itemTitle: "text-sm font-semibold text-slate-900",
    itemMeta: "text-xs text-slate-500",
    body: "text-sm leading-relaxed text-slate-700",
    skillsList: true,
  };
  return (
    <div className={`${PAGE} p-9`}>
      <header className="flex items-center gap-5 rounded-lg bg-brand-50 p-5">
        {shouldRenderProfileImage(personal) ? <ProfilePhoto personal={personal} size="medium" alt="Foto de perfil" /> : null}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-slate-900">{personal.name || ""}</h1>
          {personal.role ? <p className="mt-1 text-sm font-medium text-brand-800">{personal.role}</p> : null}
          <ContactLine prepared={prepared} className="mt-2 text-xs text-slate-600" />
          <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-500" />
        </div>
      </header>
      <Sections order={["value", "summary", "education", "skills", "languages", "experience", "certificates", "links"]} data={data} prepared={prepared} look={look} />
    </div>
  );
}

/** Dos columnas: experience and education first, then a light column with skills and more. */
export function TemplateTwoColumn({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-6 first:mt-0",
    title: "border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wider text-brand-800",
    itemTitle: "text-sm font-semibold text-slate-900",
    itemMeta: "text-xs text-slate-500",
    body: "text-sm leading-relaxed text-slate-700",
  };
  const asideLook: Look = { ...look, skillsList: false, body: "text-xs leading-relaxed text-slate-700", itemTitle: "text-xs font-semibold text-slate-900" };
  return (
    <div className={`${PAGE} p-9`}>
      <header className="flex items-center justify-between gap-6 border-b-2 border-brand-700 pb-5">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-slate-900">{personal.name || ""}</h1>
          {personal.role ? <p className="mt-1 text-sm font-medium text-brand-800">{personal.role}</p> : null}
          <ContactLine prepared={prepared} className="mt-2 text-xs text-slate-600" />
          <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-500" />
        </div>
        {shouldRenderProfileImage(personal) ? <ProfilePhoto personal={personal} size="small" alt="Foto de perfil" /> : null}
      </header>
      {/* Main column first in the HTML: it is also the reading order of the PDF text. */}
      <div className="mt-6 grid grid-cols-[1fr_13rem] gap-7">
        <main className="min-w-0">
          <Sections order={["value", "summary", "experience", "education"]} data={data} prepared={prepared} look={look} />
        </main>
        <aside className="min-w-0 rounded-md bg-slate-50 p-4">
          <Sections order={["skills", "languages", "certificates", "links"]} data={data} prepared={prepared} look={asideLook} />
        </aside>
      </div>
    </div>
  );
}

/** Cronológica: dates in their own column, the classic reverse-chronological layout. */
export function TemplateChronological({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-7",
    title: "border-b-2 border-slate-800 pb-1 text-sm font-bold uppercase tracking-wide text-slate-900",
    itemTitle: "text-sm font-semibold text-slate-900",
    itemMeta: "text-xs text-slate-500",
    body: "text-sm leading-relaxed text-slate-700",
    dateColumn: true,
  };
  return (
    <div className={`${PAGE} p-9`}>
      <header className="flex items-center gap-6">
        {shouldRenderProfileImage(personal) ? <ProfilePhoto personal={personal} size="medium" alt="Foto de perfil" /> : null}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-slate-900">{personal.name || ""}</h1>
          {personal.role ? <p className="mt-1 text-base text-slate-600">{personal.role}</p> : null}
          <ContactLine prepared={prepared} className="mt-2 text-xs text-slate-600" />
          <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-500" />
        </div>
      </header>
      <Sections order={STANDARD_ORDER} data={data} prepared={prepared} look={look} />
    </div>
  );
}

/** Estándar: the classic word-processor CV. Photo on the left, contact in two columns, titles on a grey band. */
export function TemplateStandard({ data }: { data: CVData }) {
  const prepared = prepare(data);
  const { personal } = prepared;
  const look: Look = {
    section: "mt-6",
    title: "bg-slate-100 px-2 py-1 text-sm font-bold uppercase tracking-wide text-slate-800",
    boxedTitle: true,
    itemTitle: "text-sm font-bold text-slate-900",
    itemMeta: "text-xs text-slate-600",
    body: "text-sm leading-relaxed text-slate-700",
  };
  const contactRows: React.ReactNode[] = [
    ...(prepared.location ? [<span key="loc">{prepared.location}</span>] : []),
    ...prepared.contacts.map((contact, index) => <span key={`c${index}`}><ContactPrefix item={contact} /> {contact.value}</span>),
  ];
  return (
    <div className={`${PAGE} p-9`}>
      <header className="flex items-start gap-6">
        {shouldRenderProfileImage(personal) ? <ProfilePhoto personal={personal} size="medium" alt="Foto de perfil" className="border border-slate-300" /> : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900">{personal.name || ""}</h1>
          {personal.role ? <p className="mt-1 text-base font-medium text-slate-700">{personal.role}</p> : null}
          {contactRows.length ? (
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-slate-700">
              {contactRows.map((row, index) => <p key={index} className="min-w-0 break-words">{row}</p>)}
            </div>
          ) : null}
          <MetaLines prepared={prepared} className="mt-1 text-xs text-slate-600" />
        </div>
      </header>
      <Sections order={STANDARD_ORDER} data={data} prepared={prepared} look={look} />
    </div>
  );
}
