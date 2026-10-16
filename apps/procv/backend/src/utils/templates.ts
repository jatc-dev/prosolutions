import { CV } from '@prisma/client';

type ContactItem = { value: string; type: string };

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function parseMonthYear(value?: string) {
  if (!value) return { month: '', year: '' };
  if (value === 'Actualmente') return { month: '', year: '' };

  const iso = /^([0-9]{4})-([0-9]{2})$/.exec(value);
  if (iso) return { year: iso[1], month: iso[2] };

  const slash = /^([0-9]{2})\/([0-9]{4})$/.exec(value);
  if (slash) return { month: slash[1], year: slash[2] };

  const named = /^([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+(\d{4})$/.exec(value);
  if (named) {
    const idx = monthNames.findIndex(m => m.toLowerCase() === named[1].toLowerCase());
    if (idx >= 0) return { month: String(idx + 1).padStart(2, '0'), year: named[2] };
  }

  return { month: '', year: '' };
}

function formatMonthYear(value?: string) {
  if (!value) return '';
  if (value === 'Actualmente') return 'Actualmente';
  const { month, year } = parseMonthYear(value);
  if (!month || !year) return value;
  const idx = Number(month) - 1;
  return `${monthNames[idx] ?? month} de ${year}`;
}

function formatLocation(city?: string, country?: string) {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.join(', ');
}

function normalizeContactItems(value: any, defaultType = 'Personal'): ContactItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return { value: item, type: defaultType };
      if (item && typeof item === 'object') {
        return { value: String(item.value ?? ''), type: String(item.type ?? defaultType) };
      }
      return { value: String(item), type: defaultType };
    });
  }
  if (typeof value === 'string') return [{ value, type: defaultType }];
  return [];
}

function normalizeSkills(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => {
      if (!item) return { id: '', name: '', level: 1 };
      if (typeof item === 'string') return { id: item, name: item, level: 1 };
      return {
        id: String((item as any).id ?? item.name ?? Math.random().toString(16).slice(2)),
        name: String((item as any).name ?? ''),
        level: typeof (item as any).level === 'number' ? (item as any).level : 1,
      };
    });
  }
  return [];
}

function normalizeLanguages(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => {
      if (!item) return { id: '', name: '', level: '', certificateUrl: '' };
      if (typeof item === 'string') return { id: item, name: item, level: '', certificateUrl: '' };
      return {
        id: String((item as any).id ?? item.name ?? Math.random().toString(16).slice(2)),
        name: String((item as any).name ?? ''),
        level: String((item as any).level ?? ''),
        certificateUrl: String((item as any).certificateUrl ?? ''),
      };
    });
  }
  return [];
}

function normalizeCertificates(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => {
      if (!item) return { id: '', title: '', url: '' };
      return {
        id: String((item as any).id ?? item.title ?? Math.random().toString(16).slice(2)),
        title: String((item as any).title ?? ''),
        url: String((item as any).url ?? ''),
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

const SHARED_TEMPLATE_UTILS_CSS = `
      .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
      .text-sm { font-size: 0.85rem; }
      .text-xs { font-size: 0.75rem; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .inline-flex { display: inline-flex; }
      .flex { display: flex; }
      .grid { display: grid; }
      .grid-cols-1 { grid-template-columns: 1fr; }
      .flex-wrap { flex-wrap: wrap; }
      .items-start { align-items: flex-start; }
      .items-center { align-items: center; }
      .justify-between { justify-content: space-between; }
      .gap-1 { gap: 0.25rem; }
      .gap-2 { gap: 0.5rem; }
      .space-y-1 > * + * { margin-top: 0.25rem; }
      .space-y-2 > * + * { margin-top: 0.5rem; }
      .space-y-3 > * + * { margin-top: 0.75rem; }
      .mb-3 { margin-bottom: 0.75rem; }
      .mt-1 { margin-top: 0.25rem; }
      .mt-2 { margin-top: 0.5rem; }
      .mt-3 { margin-top: 0.75rem; }
      .mt-4 { margin-top: 1rem; }
      .p-4 { padding: 1rem; }

      @media (min-width: 768px) {
        .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
`;

function renderValuePropositionHtml(
  personal: any,
  escapeHtml: (value: string | undefined) => string,
  options?: {
    containerClass?: string;
    titleClass?: string;
    textClass?: string;
    titleText?: string;
  },
) {
  const content = String(personal?.valueProposition ?? '').trim();
  if (!content) return '';

  const showTitle = personal?.showValuePropositionTitle !== false;
  const containerClass = options?.containerClass ?? 'blk';
  const titleClass = options?.titleClass ?? 'blk-title';
  const textClass = options?.textClass ?? 'text';
  const titleText = options?.titleText ?? 'Propuesta de valor';

  return `<div class="${containerClass}">${showTitle ? `<div class="${titleClass}">${escapeHtml(titleText)}</div>` : ''}<p class="${textClass}">${escapeHtml(content)}</p></div>`;
}

export function buildPdfHtml(cv: CV): string {
  const template = (cv.template ?? 'minimal').toLowerCase();

  switch (template) {
    case 'sidebar':
      return buildSidebarTemplate(cv);
    case 'corporate':
    case 'executive':
      return buildCorporateTemplate(cv);
    case 'developer':
      return buildDeveloperTemplate(cv);
    case 'creative':
    case 'timeline':
      return buildCreativeTemplate(cv);
    case 'classic':
    case 'compact':
      return buildClassicTemplate(cv);

    // Legacy aliases for existing CVs
    case 'ats-optimized':
      return buildMinimalTemplate(cv);
    case 'photo-professional':
      return buildCorporateTemplate(cv);
    case 'modern-sidebar':
      return buildCreativeTemplate(cv);
    case 'elegant':
      return buildClassicTemplate(cv);
    default:
      return buildMinimalTemplate(cv);
  }
}

function buildSidebarTemplate(cv: CV) {
  const data = cv.data as any;
  const personal = data.personal ?? {};
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = normalizeSkills(data.skills);
  const languages = normalizeLanguages(data.languages);
  const certificates = normalizeCertificates(data.certificates);
  const links: Record<string, string> = (data.links ?? {}) as Record<string, string>;
  const emails: ContactItem[] = normalizeContactItems(personal.emails ?? personal.email);
  const phones: ContactItem[] = normalizeContactItems(personal.phones ?? personal.phone);
  const sidebarBg = (data.settings?.sidebarBg as string) ?? '#0f172a';

  const formatRange = (from?: string, to?: string) => {
    if (!from) return '';
    if (!to) return formatMonthYear(from);
    return `${formatMonthYear(from)} – ${formatMonthYear(to)}`;
  };

  const escapeHtml = (value: string | undefined) =>
    (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(cv.title)} - ProCV</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 0; }
      ${SHARED_TEMPLATE_UTILS_CSS}
      .container { width: 100%; max-width: 900px; margin: 0 auto; background: white; display: grid; grid-template-columns: 1fr 2fr; align-items: start; }
      .sidebar { padding: 0; background: transparent; color: white; align-self: start; }
      .sidebar-content { padding: 24px 28px; background: ${sidebarBg}; color: white; }
      .sidebar-content .blk { margin-bottom: 16px; }
      .main { padding: 32px 28px; }
      .blk { margin-bottom: 24px; }
      .blk-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.8); margin-bottom: 8px; }
      .heading { font-size: 2rem; font-weight: 700; margin: 0; }
      .subheading { font-size: 1rem; margin: 4px 0 0; color: rgba(255,255,255,0.8); }
      .label { font-weight: 600; color: rgba(255,255,255,0.85); }
      .sidebar .text { color: rgba(255,255,255,0.9); }
      .entry { margin-bottom: 12px; }
      .title { color: #0f172a; font-weight: 700; margin: 0; }
      .subtitle { margin: 0; color: #334155; font-size: 0.9rem; }
      .meta { font-size: 0.8rem; color: #64748b; }
      .tag { display: inline-block; background: #e2e8f0; color: #0f172a; padding: 4px 8px; border-radius: 9999px; font-size: 0.75rem; margin-right: 6px; margin-bottom: 6px; }
      .link { font-size: 0.8rem; color: #2563eb; text-decoration: none; }
      .sidebar, .main, .blk, .entry { break-inside: avoid; page-break-inside: avoid; }
      .blk-title { break-after: avoid; page-break-after: avoid; }
      .blk > .entry:first-child { break-inside: avoid; page-break-inside: avoid; }
      .blk-title + .entry,
      .blk-title + .text,
      .blk-title + .meta { break-inside: avoid; page-break-inside: avoid; }
      p { orphans: 3; widows: 3; }
    </style>
  </head>
  <body>
    <div class="container">
      <aside class="sidebar">
        <div class="sidebar-content">
        <div>
          <h1 class="heading">${escapeHtml(personal.name || 'Tu Nombre')}</h1>
          <p class="subheading">${escapeHtml(personal.role || 'Tu título profesional')}</p>
          ${
            formatLocation(personal.city, personal.country)
              ? `<p class="subheading">${escapeHtml(formatLocation(personal.city, personal.country))}</p>`
              : ''
          }
        </div>

        <div class="blk">
          <div class="blk-title">Contacto</div>
          ${emails
            .map(
              (item: ContactItem) =>
                `<div class="entry"><span class="label">${escapeHtml(item.type)}:</span> <span class="text">${escapeHtml(item.value)}</span></div>`,
            )
            .join('')}
          ${phones
            .map(
              (item: ContactItem) =>
                `<div class="entry"><span class="label">${escapeHtml(item.type)}:</span> <span class="text">${escapeHtml(item.value)}</span></div>`,
            )
            .join('')}
        </div>

        ${renderValuePropositionHtml(personal, escapeHtml, {
          containerClass: 'blk',
          titleClass: 'blk-title',
          textClass: 'text',
        })}
        ${personal.summary ? `<div class="blk"><div class="blk-title">Resumen</div><div class="text">${escapeHtml(personal.summary)}</div></div>` : ''}
        ${
          Object.keys(links).length
            ? `<div class="blk"><div class="blk-title">Enlaces</div>${Object.entries(links)
                .map(
                  ([label, url]) =>
                    `<div class="entry"><span class="label">${escapeHtml(label)}:</span> <a class="link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a></div>`,
                )
                .join('')}</div>`
            : ''
        }
        </div>
      </aside>

      <main class="main">
        ${
          experience.length
            ? `<div class="blk"><div class="blk-title">Experiencia</div>${experience
                .map(
                  (item: any) =>
                    `<div class="entry"><div class="title">${escapeHtml(item.role || 'Rol')}</div><div class="meta">${escapeHtml(item.company || 'Empresa')}${
                      formatLocation(item.city, item.country)
                        ? ` · ${escapeHtml(formatLocation(item.city, item.country))}`
                        : ''
                    } · ${escapeHtml(formatRange(item.from, item.to))}</div>${item.description ? `<p class="text" style="margin: 8px 0 0;">${escapeHtml(item.description)}</p>` : ''}</div>`,
                )
                .join('')}</div>`
            : ''
        }

        ${
          education.length
            ? `<div class="blk"><div class="blk-title">Educación</div>${education
                .map(
                  (item: any) =>
                    `<div class="entry"><div class="title">${escapeHtml(item.degree || 'Título')}</div><div class="meta">${escapeHtml(item.institution || 'Institución')}${
                      formatLocation(item.city, item.country)
                        ? ` · ${escapeHtml(formatLocation(item.city, item.country))}`
                        : ''
                    } · ${escapeHtml(formatRange(item.from, item.to))}</div></div>`,
                )
                .join('')}</div>`
            : ''
        }

        ${
          skills.length
            ? `<div class="blk"><div class="blk-title">Aptitudes</div>${skills
                .map(
                  skill =>
                    `<div class="entry"><div class="title">${escapeHtml(skill.name)}</div><div class="meta">Nivel ${skill.level || 1}</div><div class="mt-1" style="height:6px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:${skillLevelPercent(skill.level)}%;height:100%;background:#4f46e5;"></div></div></div>`,
                )
                .join('')}</div>`
            : ''
        }

        ${
          languages.length
            ? `<div class="blk"><div class="blk-title">Idiomas</div>${languages
                .map(
                  lang =>
                    `<div class="entry"><div class="title">${escapeHtml(lang.name)}</div><div class="meta">${escapeHtml(lang.level || '')}</div><div class="mt-1" style="height:6px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:${cefrLevelPercent(lang.level)}%;height:100%;background:#4f46e5;"></div></div>${lang.certificateUrl ? `<div class="mt-1"><a class="link" href="${escapeHtml(lang.certificateUrl)}" target="_blank" rel="noreferrer">Certificado</a></div>` : ''}</div>`,
                )
                .join('')}</div>`
            : ''
        }

        ${
          certificates.length
            ? `<div class="blk"><div class="blk-title">Certificados</div>${certificates
                .map(
                  cert =>
                    `<div class="entry"><div class="title">${escapeHtml(cert.title)}</div><div class="meta"><a class="link" href="${escapeHtml(cert.url)}" target="_blank" rel="noreferrer">Ver</a></div></div>`,
                )
                .join('')}</div>`
            : ''
        }

      </main>
    </div>
  </body>
</html>`;
}

function buildMinimalTemplate(cv: CV) {
  const data = cv.data as any;
  const personal = data.personal ?? {};
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = normalizeSkills(data.skills);
  const languages = normalizeLanguages(data.languages);
  const certificates = normalizeCertificates(data.certificates);
  const links: Record<string, string> = (data.links ?? {}) as Record<string, string>;
  const emails: ContactItem[] = normalizeContactItems(personal.emails ?? personal.email);
  const phones: ContactItem[] = normalizeContactItems(personal.phones ?? personal.phone);

  const formatRange = (from?: string, to?: string) => {
    if (!from) return '';
    if (!to) return formatMonthYear(from);
    return `${formatMonthYear(from)} – ${formatMonthYear(to)}`;
  };

  const escapeHtml = (value: string | undefined) =>
    (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(cv.title)} - ProCV</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 0; }
      ${SHARED_TEMPLATE_UTILS_CSS}
      .container { width: 100%; max-width: 794px; margin: 0 auto; background: white; padding: 24px 28px; box-sizing: border-box; }
      .text-slate-500 { color: #64748b; }
      .text-slate-600 { color: #475569; }
      .text-slate-700 { color: #334155; }
      .text-slate-900 { color: #0f172a; }
      .border-l { border-left: 4px solid #6366f1; }
      .text-brand { color: #4f46e5; }
      .blk { margin-top: 1rem; }
      .blk-title { font-size: 0.85rem; font-weight: 600; color: #475569; margin: 0 0 0.5rem; }
      .cluster { margin-top: 0.75rem; }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1 class="text-3xl font-bold">${escapeHtml(personal.name || 'Tu Nombre')}</h1>
        <div class="mt-2 text-sm text-slate-600">${escapeHtml(personal.role || 'Tu título profesional')}</div>
        <div class="mt-2 text-xs text-slate-500 flex flex-wrap gap-2">
          ${emails
            .map(
              item =>
                `<span class="inline-flex items-center gap-1"><span class="font-semibold">${escapeHtml(
                  item.type,
                )}:</span> ${escapeHtml(item.value)}</span>`,
            )
            .join('')}
          ${phones
            .map(
              item =>
                `<span class="inline-flex items-center gap-1"><span class="font-semibold">${escapeHtml(
                  item.type,
                )}:</span> ${escapeHtml(item.value)}</span>`,
            )
            .join('')}
        </div>
      </header>

      ${renderValuePropositionHtml(personal, escapeHtml, {
        containerClass: 'blk border-l p-4',
        titleClass: 'blk-title',
        textClass: 'mt-2 text-slate-700',
      })}
      ${personal.summary ? `<div class="blk border-l p-4"><div class="blk-title">Resumen</div><p class="mt-2 text-slate-700">${escapeHtml(personal.summary)}</p></div>` : ''}

      ${
        experience.length
          ? `<div class="blk"><div class="blk-title">Experiencia</div><div class="cluster space-y-3">${experience
              .map((item: any) => {
                const location = formatLocation(item.city, item.country);
                return `<div class="entry"><div class="flex justify-between items-start"><div><p class="font-semibold text-slate-900">${escapeHtml(item.role || 'Rol')}</p><p class="text-xs text-slate-600">${escapeHtml(item.company || 'Empresa')}${location ? ` • ${escapeHtml(location)}` : ''}</p></div><p class="text-xs text-slate-600">${escapeHtml(formatRange(item.from, item.to))}</p></div>${item.description ? `<p class="mt-1 text-slate-700">${escapeHtml(item.description)}</p>` : ''}</div>`;
              })
              .join('')}</div></div>`
          : ''
      }

      ${
        education.length
          ? `<div class="blk"><div class="blk-title">Educación</div><div class="cluster space-y-3">${education
              .map((item: any) => {
                const location = formatLocation(item.city, item.country);
                return `<div><div class="flex justify-between items-start"><div><p class="font-semibold text-slate-900">${escapeHtml(item.degree || 'Título')}</p><p class="text-xs text-slate-600">${escapeHtml(item.institution || 'Institución')}${location ? ` • ${escapeHtml(location)}` : ''}</p></div><p class="text-xs text-slate-600">${escapeHtml(formatRange(item.from, item.to))}</p></div></div>`;
              })
              .join('')}</div></div>`
          : ''
      }

      ${
        skills.length || languages.length || certificates.length || Object.keys(links).length
          ? `<div class="blk grid grid-cols-1 md:grid-cols-3 gap-4">
        ${
          skills.length
            ? `<div><h3 class="text-sm font-semibold text-slate-600">Aptitudes</h3><div class="mt-2 space-y-2">${skills
                .map(
                  skill =>
                    `<div><p class="font-semibold text-slate-900">${escapeHtml(skill.name)}</p><p class="text-xs text-slate-600">Nivel ${skill.level}</p><div style="height:6px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:${skillLevelPercent(skill.level)}%;height:100%;background:#4f46e5;"></div></div></div>`,
                )
                .join('')}</div></div>`
            : ''
        }
        ${
          languages.length
            ? `<div><h3 class="text-sm font-semibold text-slate-600">Idiomas</h3><div class="mt-2 space-y-2">${languages
                .map(
                  lang =>
                    `<div><p class="font-semibold text-slate-900">${escapeHtml(lang.name)}</p><p class="text-xs text-slate-600">${escapeHtml(lang.level)}</p><div style="height:6px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:${cefrLevelPercent(lang.level)}%;height:100%;background:#4f46e5;"></div></div>${lang.certificateUrl ? `<p class="mt-1"><a class="text-brand" href="${escapeHtml(lang.certificateUrl)}">Certificado</a></p>` : ''}</div>`,
                )
                .join('')}</div></div>`
            : ''
        }
        ${
          Object.keys(links).length || certificates.length
            ? `<div><h3 class="text-sm font-semibold text-slate-600">Enlaces</h3><div class="mt-2 text-xs text-slate-700 space-y-1">${Object.entries(
                links,
              )
                .map(
                  ([label, url]) =>
                    `<div><span class="font-semibold">${escapeHtml(label)}:</span> <span class="text-brand">${escapeHtml(url)}</span></div>`,
                )
                .join('')}${
                certificates.length
                  ? `<div class="mt-3"><h4 class="font-semibold text-slate-900">Certificados</h4>${certificates
                      .map(
                        cert =>
                          `<div><a class="text-brand" href="${escapeHtml(cert.url)}">${escapeHtml(cert.title)}</a></div>`,
                      )
                      .join('')}</div>`
                  : ''
              }</div></div>`
            : ''
        }
      </div>`
          : ''
      }
    </div>
  </body>
</html>`;
}

function buildCorporateTemplate(cv: CV) {
  const data = cv.data as any;
  const personal = data.personal ?? {};
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = normalizeSkills(data.skills);
  const languages = normalizeLanguages(data.languages);
  const certificates = normalizeCertificates(data.certificates);
  const links: Record<string, string> = (data.links ?? {}) as Record<string, string>;
  const emails: ContactItem[] = normalizeContactItems(personal.emails ?? personal.email);
  const phones: ContactItem[] = normalizeContactItems(personal.phones ?? personal.phone);

  const formatRange = (from?: string, to?: string) => {
    if (!from) return '';
    if (!to) return formatMonthYear(from);
    return `${formatMonthYear(from)} – ${formatMonthYear(to)}`;
  };

  const escapeHtml = (value: string | undefined) =>
    (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(cv.title)} - ProCV</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; background: #f1f5f9; margin: 0; padding: 0; }
      ${SHARED_TEMPLATE_UTILS_CSS}
      .container { width: 100%; max-width: 794px; margin: 0 auto; background: white; padding: 28px; box-sizing: border-box; border: 1px solid #e2e8f0; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
      .title { font-size: 2.4rem; font-weight: 700; margin: 0; }
      .subtitle { font-size: 1rem; color: #475569; margin: 0.25rem 0 0; }
      .info { text-align: right; font-size: 0.85rem; color: #64748b; }
      .blk { margin-top: 1.5rem; }
      .blk-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 0.5rem; }
      .panel { background: #f8fafc; padding: 14px 16px; border-radius: 0.75rem; border: 1px solid #e2e8f0; }
      .item-title { font-weight: 700; color: #0f172a; margin: 0; }
      .item-subtitle { font-size: 0.85rem; color: #475569; margin: 0.15rem 0 0; }
      .item-duration { font-size: 0.75rem; color: #64748b; }
      a { color: #4338ca; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="header">
        <div>
          <h1 class="title">${escapeHtml(personal.name || 'Tu Nombre')}</h1>
          <p class="subtitle">${escapeHtml(personal.role || 'Tu título profesional')}</p>
          ${
            formatLocation(personal.city, personal.country)
              ? `<p class="subtitle">${escapeHtml(formatLocation(personal.city, personal.country))}</p>`
              : ''
          }
        </div>
        <div class="info">
          ${emails.map(item => `${escapeHtml(item.type)}: ${escapeHtml(item.value)}<br/>`).join('')}
          ${phones.map(item => `${escapeHtml(item.type)}: ${escapeHtml(item.value)}<br/>`).join('')}
          ${Object.entries(links)
            .map(
              ([label, url]) =>
                `${escapeHtml(label)}: <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`,
            )
            .join('<br/>')}
        </div>
      </header>

      ${renderValuePropositionHtml(personal, escapeHtml, {
        containerClass: 'blk',
        titleClass: 'blk-title',
        textClass: 'panel',
      })}
      ${personal.summary ? `<div class="blk"><div class="blk-title">Perfil</div><div class="panel"><p>${escapeHtml(personal.summary)}</p></div></div>` : ''}

      ${
        experience.length
          ? `<div class="blk"><div class="blk-title">Experiencia</div><div class="space-y-3">${experience
              .map((item: any) => {
                return `<div class="panel"><div class="flex justify-between items-start"><div><p class="item-title">${escapeHtml(item.role || 'Rol')}</p><p class="item-subtitle">${escapeHtml(item.company || 'Empresa')}${formatLocation(item.city, item.country) ? ` • ${escapeHtml(formatLocation(item.city, item.country))}` : ''}</p></div><p class="item-duration">${escapeHtml(formatRange(item.from, item.to))}</p></div>${item.description ? `<p class="mt-2">${escapeHtml(item.description)}</p>` : ''}</div>`;
              })
              .join('')}</div></div>`
          : ''
      }

      ${
        education.length
          ? `<div class="blk"><div class="blk-title">Educación</div><div class="space-y-3">${education
              .map((item: any) => {
                return `<div class="panel"><div class="flex justify-between items-start"><div><p class="item-title">${escapeHtml(item.degree || 'Título')}</p><p class="item-subtitle">${escapeHtml(item.institution || 'Institución')}${formatLocation(item.city, item.country) ? ` • ${escapeHtml(formatLocation(item.city, item.country))}` : ''}</p></div><p class="item-duration">${escapeHtml(formatRange(item.from, item.to))}</p></div></div>`;
              })
              .join('')}</div></div>`
          : ''
      }

      ${
        skills.length || languages.length || certificates.length
          ? `<div class="blk"><div class="blk-title">Habilidades & Idiomas</div><div class="panel">${skills
              .map(
                skill =>
                  `<div class="mb-3"><p class="item-title">${escapeHtml(skill.name)}</p><p class="item-subtitle">Nivel ${skill.level}</p><div style="height:6px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:${skillLevelPercent(skill.level)}%;height:100%;background:#4338ca;"></div></div></div>`,
              )
              .join('')}${languages
              .map(
                lang =>
                  `<div class="mb-3"><p class="item-title">${escapeHtml(lang.name)}</p><p class="item-subtitle">${escapeHtml(lang.level)}</p><div style="height:6px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:${cefrLevelPercent(lang.level)}%;height:100%;background:#4338ca;"></div></div>${lang.certificateUrl ? `<p class="mt-1"><a href="${escapeHtml(lang.certificateUrl)}">Certificado</a></p>` : ''}</div>`,
              )
              .join('')}${
              certificates.length
                ? `<div class="mt-4"><h3 class="item-title">Certificados</h3>${certificates
                    .map(
                      cert =>
                        `<p class="item-subtitle"><a href="${escapeHtml(cert.url)}">${escapeHtml(cert.title)}</a></p>`,
                    )
                    .join('')}</div>`
                : ''
            }</div></div>`
          : ''
      }
    </div>
  </body>
</html>`;
}

function buildDeveloperTemplate(cv: CV) {
  const data = cv.data as any;
  const personal = data.personal ?? {};
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = normalizeSkills(data.skills);
  const languages = normalizeLanguages(data.languages);
  const certificates = normalizeCertificates(data.certificates);
  const links: Record<string, string> = (data.links ?? {}) as Record<string, string>;
  const emails: ContactItem[] = normalizeContactItems(personal.emails ?? personal.email);
  const phones: ContactItem[] = normalizeContactItems(personal.phones ?? personal.phone);

  const formatRange = (from?: string, to?: string) => {
    if (!from) return '';
    if (!to) return formatMonthYear(from);
    return `${formatMonthYear(from)} – ${formatMonthYear(to)}`;
  };

  const escapeHtml = (value: string | undefined) =>
    (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(cv.title)} - ProCV</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
      ${SHARED_TEMPLATE_UTILS_CSS}
      .container { width: 100%; max-width: 794px; margin: 0 auto; padding: 32px; box-sizing: border-box; }
      .header { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
      .name { font-size: 2.5rem; font-weight: 700; margin: 0; }
      .role { font-size: 1.1rem; color: #94a3b8; margin: 0.25rem 0 0; }
      .contact { font-size: 0.85rem; color: #cbd5e1; line-height: 1.5; }
      .blk { margin-top: 2rem; }
      .blk-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin: 0 0 0.75rem; }
      .panel { background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 0.75rem; padding: 1rem; }
      .item-title { font-weight: 700; color: #f8fafc; margin: 0; }
      .item-subtitle { font-size: 0.85rem; color: #cbd5e1; margin: 0.15rem 0 0; }
      .item-duration { font-size: 0.75rem; color: #94a3b8; }
      .pill { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 999px; background: rgba(99, 102, 241, 0.25); color: #e0e7ff; font-size: 0.75rem; margin: 0.15rem 0.15rem 0 0; }
      a { color: #60a5fa; text-decoration: none; }
      .header, .blk, .panel { break-inside: avoid; page-break-inside: avoid; }
      .blk-title { break-after: avoid; page-break-after: avoid; }
      .blk > .panel { margin-bottom: 10px; }
      .blk-title + .panel,
      .blk-title + p { break-inside: avoid; page-break-inside: avoid; }
      p { orphans: 3; widows: 3; }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="header">
        <div>
          <h1 class="name">${escapeHtml(personal.name || 'Tu Nombre')}</h1>
          <p class="role">${escapeHtml(personal.role || 'Desarrollador')}</p>
          ${
            formatLocation(personal.city, personal.country)
              ? `<p class="role">${escapeHtml(formatLocation(personal.city, personal.country))}</p>`
              : ''
          }
        </div>
        <div class="contact">
          ${emails.map(item => `${escapeHtml(item.type)}: ${escapeHtml(item.value)}<br/>`).join('')}
          ${phones.map(item => `${escapeHtml(item.type)}: ${escapeHtml(item.value)}<br/>`).join('')}
          ${Object.entries(links)
            .map(
              ([label, url]) =>
                `${escapeHtml(label)}: <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`,
            )
            .join('<br/>')}
        </div>
      </header>

      ${renderValuePropositionHtml(personal, escapeHtml, {
        containerClass: 'blk',
        titleClass: 'blk-title',
        textClass: 'panel',
      })}
      ${personal.summary ? `<div class="blk"><div class="blk-title">Acerca de mí</div><div class="panel"><p>${escapeHtml(personal.summary)}</p></div></div>` : ''}

      ${
        experience.length
          ? `<div class="blk"><div class="blk-title">Experiencia</div>${experience
              .map((item: any) => {
                return `<div class="panel"><div class="flex justify-between"><div><p class="item-title">${escapeHtml(item.role || 'Rol')}</p><p class="item-subtitle">${escapeHtml(item.company || 'Empresa')}${formatLocation(item.city, item.country) ? ` • ${escapeHtml(formatLocation(item.city, item.country))}` : ''}</p></div><p class="item-duration">${escapeHtml(formatRange(item.from, item.to))}</p></div>${item.description ? `<p class="mt-2">${escapeHtml(item.description)}</p>` : ''}</div>`;
              })
              .join('')}</div>`
          : ''
      }

      ${
        education.length
          ? `<div class="blk"><div class="blk-title">Educación</div>${education
              .map((item: any) => {
                return `<div class="panel"><div class="flex justify-between"><div><p class="item-title">${escapeHtml(item.degree || 'Título')}</p><p class="item-subtitle">${escapeHtml(item.institution || 'Institución')}${formatLocation(item.city, item.country) ? ` • ${escapeHtml(formatLocation(item.city, item.country))}` : ''}</p></div><p class="item-duration">${escapeHtml(formatRange(item.from, item.to))}</p></div></div>`;
              })
              .join('')}</div>`
          : ''
      }

      ${
        skills.length
          ? `<div class="blk"><div class="blk-title">Habilidades</div><div class="panel">${skills
              .map(
                skill =>
                  `<div class="mb-3"><p class="item-title">${escapeHtml(skill.name)}</p><p class="item-subtitle">Nivel ${skill.level}</p><div style="height:6px;background:rgba(99,102,241,0.25);border-radius:999px;overflow:hidden;"><div style="width:${skillLevelPercent(skill.level)}%;height:100%;background:rgba(99,102,241,0.7);"></div></div></div>`,
              )
              .join('')}</div></div>`
          : ''
      }

      ${
        languages.length
          ? `<div class="blk"><div class="blk-title">Idiomas</div><div class="panel">${languages
              .map(
                lang =>
                  `<div class="mb-3"><p class="item-title">${escapeHtml(lang.name)}</p><p class="item-subtitle">${escapeHtml(lang.level)}</p><div style="height:6px;background:rgba(99,102,241,0.25);border-radius:999px;overflow:hidden;"><div style="width:${cefrLevelPercent(lang.level)}%;height:100%;background:rgba(99,102,241,0.7);"></div></div>${lang.certificateUrl ? `<p class="mt-1"><a href="${escapeHtml(lang.certificateUrl)}">Certificado</a></p>` : ''}</div>`,
              )
              .join('')}</div></div>`
          : ''
      }

      ${
        certificates.length
          ? `<div class="blk"><div class="blk-title">Certificados</div><div class="panel">${certificates
              .map(
                cert =>
                  `<p class="item-subtitle"><a href="${escapeHtml(cert.url)}">${escapeHtml(cert.title)}</a></p>`,
              )
              .join('')}</div></div>`
          : ''
      }
    </div>
  </body>
</html>`;
}

function buildCreativeTemplate(cv: CV) {
  const data = cv.data as any;
  const personal = data.personal ?? {};
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = normalizeSkills(data.skills);
  const languages = normalizeLanguages(data.languages);
  const certificates = normalizeCertificates(data.certificates);
  const links: Record<string, string> = (data.links ?? {}) as Record<string, string>;
  const emails: ContactItem[] = normalizeContactItems(personal.emails ?? personal.email);
  const phones: ContactItem[] = normalizeContactItems(personal.phones ?? personal.phone);

  const formatRange = (from?: string, to?: string) => {
    if (!from) return '';
    if (!to) return formatMonthYear(from);
    return `${formatMonthYear(from)} – ${formatMonthYear(to)}`;
  };

  const escapeHtml = (value: string | undefined) =>
    (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(cv.title)} - ProCV</title>
    <style>
      body { font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: radial-gradient(circle at top, #3b82f6 0%, #8b5cf6 60%, #0f172a 100%); color: white; margin: 0; padding: 0; }
      ${SHARED_TEMPLATE_UTILS_CSS}
      .container { width: 100%; max-width: 794px; margin: 0 auto; padding: 32px; box-sizing: border-box; }
      .header { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; }
      .name { font-size: 2.8rem; font-weight: 800; margin: 0; text-shadow: 0 2px 10px rgba(0,0,0,0.35); }
      .role { font-size: 1.1rem; color: rgba(255,255,255,0.85); margin: 0; }
      .badge { display: inline-block; background: rgba(255,255,255,0.12); padding: 0.35rem 0.6rem; border-radius: 999px; font-size: 0.75rem; margin: 0.2rem 0.2rem 0 0; }
      .blk { margin-top: 2.5rem; }
      .blk-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 0.8rem; color: rgba(255,255,255,0.85); }
      .panel { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.12); border-radius: 1rem; padding: 1rem; }
      .item-title { font-weight: 700; margin: 0; }
      .item-subtitle { font-size: 0.85rem; color: rgba(255,255,255,0.75); margin: 0.15rem 0 0; }
      a { color: #63b3ed; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="header">
        <h1 class="name">${escapeHtml(personal.name || 'Tu Nombre')}</h1>
        <p class="role">${escapeHtml(personal.role || 'Profesional Creativo')}</p>
        ${
          formatLocation(personal.city, personal.country)
            ? `<p class="role">${escapeHtml(formatLocation(personal.city, personal.country))}</p>`
            : ''
        }
        <div>
          ${emails
            .map(
              item =>
                `<span class="badge">✉️ <span class="font-semibold">${escapeHtml(item.type)}:</span> ${escapeHtml(item.value)}</span>`,
            )
            .join('')}
          ${phones
            .map(
              item =>
                `<span class="badge">📞 <span class="font-semibold">${escapeHtml(item.type)}:</span> ${escapeHtml(item.value)}</span>`,
            )
            .join('')}
          ${Object.entries(links)
            .map(
              ([label, url]) =>
                `<span class="badge">🔗 <a href="${escapeHtml(url)}">${escapeHtml(label)}</a></span>`,
            )
            .join('')}
        </div>
      </header>

      ${renderValuePropositionHtml(personal, escapeHtml, {
        containerClass: 'blk',
        titleClass: 'blk-title',
        textClass: 'panel',
      })}
      ${personal.summary ? `<div class="blk"><div class="blk-title">Sobre mí</div><div class="panel"><p>${escapeHtml(personal.summary)}</p></div></div>` : ''}

      ${
        experience.length
          ? `<div class="blk"><div class="blk-title">Experiencia</div>${experience
              .map((item: any) => {
                return `<div class="panel"><p class="item-title">${escapeHtml(item.role || 'Rol')}</p><p class="item-subtitle">${escapeHtml(item.company || 'Empresa')}${formatLocation(item.city, item.country) ? ` • ${escapeHtml(formatLocation(item.city, item.country))}` : ''} • ${escapeHtml(formatRange(item.from, item.to))}</p>${item.description ? `<p class="mt-2">${escapeHtml(item.description)}</p>` : ''}</div>`;
              })
              .join('')}</div>`
          : ''
      }

      ${
        education.length
          ? `<div class="blk"><div class="blk-title">Formación</div>${education
              .map((item: any) => {
                return `<div class="panel"><p class="item-title">${escapeHtml(item.degree || 'Título')}</p><p class="item-subtitle">${escapeHtml(item.institution || 'Institución')}${formatLocation(item.city, item.country) ? ` • ${escapeHtml(formatLocation(item.city, item.country))}` : ''} • ${escapeHtml(formatRange(item.from, item.to))}</p></div>`;
              })
              .join('')}</div>`
          : ''
      }

      ${
        skills.length || languages.length || certificates.length
          ? `<div class="blk"><div class="blk-title">Habilidades</div><div class="panel">${skills
              .map(
                skill =>
                  `<div class="mb-3"><p class="item-title">${escapeHtml(skill.name)}</p><p class="item-subtitle">Nivel ${skill.level}</p><div style="height:6px;background:rgba(255,255,255,0.15);border-radius:999px;overflow:hidden;"><div style="width:${skillLevelPercent(skill.level)}%;height:100%;background:rgba(255,255,255,0.35);"></div></div></div>`,
              )
              .join('')}${languages
              .map(
                lang =>
                  `<div class="mb-3"><p class="item-title">${escapeHtml(lang.name)}</p><p class="item-subtitle">${escapeHtml(lang.level)}</p><div style="height:6px;background:rgba(255,255,255,0.15);border-radius:999px;overflow:hidden;"><div style="width:${cefrLevelPercent(lang.level)}%;height:100%;background:rgba(255,255,255,0.35);"></div></div>${lang.certificateUrl ? `<p class="mt-1"><a href="${escapeHtml(lang.certificateUrl)}">Certificado</a></p>` : ''}</div>`,
              )
              .join('')}${
              certificates.length
                ? `<div class="mt-4"><h3 class="item-title">Certificados</h3>${certificates
                    .map(
                      cert =>
                        `<p class="item-subtitle"><a href="${escapeHtml(cert.url)}">${escapeHtml(cert.title)}</a></p>`,
                    )
                    .join('')}</div>`
                : ''
            }</div></div>`
          : ''
      }
    </div>
  </body>
</html>`;
}

function buildClassicTemplate(cv: CV) {
  const data = cv.data as any;
  const personal = data.personal ?? {};
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const skills = normalizeSkills(data.skills);
  const languages = normalizeLanguages(data.languages);
  const certificates = normalizeCertificates(data.certificates);
  const links: Record<string, string> = (data.links ?? {}) as Record<string, string>;
  const emails: ContactItem[] = normalizeContactItems(personal.emails ?? personal.email);
  const phones: ContactItem[] = normalizeContactItems(personal.phones ?? personal.phone);

  const formatRange = (from?: string, to?: string) => {
    if (!from) return '';
    if (!to) return formatMonthYear(from);
    return `${formatMonthYear(from)} – ${formatMonthYear(to)}`;
  };

  const escapeHtml = (value: string | undefined) =>
    (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(cv.title)} - ProCV</title>
    <style>
      body { font-family: 'Georgia', serif; color: #111827; background: #ffffff; margin: 0; padding: 0; }
      ${SHARED_TEMPLATE_UTILS_CSS}
      .container { width: 100%; max-width: 794px; margin: 0 auto; padding: 28px; box-sizing: border-box; }
      .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
      .name { font-size: 2.5rem; font-weight: 700; margin: 0; }
      .role { font-size: 1.1rem; color: #4b5563; margin: 4px 0 0; }
      .contact { font-size: 0.85rem; color: #6b7280; margin-top: 14px; }
      .blk { margin-top: 24px; }
      .section-title { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #374151; margin: 0 0 12px; }
      .entry { margin-bottom: 12px; }
      .item-title { font-weight: 700; margin: 0; }
      .item-subtitle { font-size: 0.9rem; color: #4b5563; margin: 2px 0 0; }
      .item-duration { font-size: 0.8rem; color: #6b7280; }
      .list { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
      .pill { font-size: 0.75rem; padding: 4px 10px; border: 1px solid #d1d5db; border-radius: 999px; background: #f9fafb; color: #1f2937; }
      .header, .blk, .entry, .card { break-inside: avoid; page-break-inside: avoid; }
      .section-title { break-after: avoid; page-break-after: avoid; }
      .section-title + p,
      .section-title + .entry,
      .section-title + .card { break-inside: avoid; page-break-inside: avoid; }
      .blk > .entry:first-child, .blk > .card:first-child { break-inside: avoid; page-break-inside: avoid; }
      p { orphans: 3; widows: 3; }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="header">
        <h1 class="name">${escapeHtml(personal.name || 'Tu Nombre')}</h1>
        <p class="role">${escapeHtml(personal.role || 'Tu título profesional')}</p>
        ${
          formatLocation(personal.city, personal.country)
            ? `<p class="role">${escapeHtml(formatLocation(personal.city, personal.country))}</p>`
            : ''
        }
        <p class="contact">
          ${[...emails, ...phones]
            .map(item => `${escapeHtml(item.type)}: ${escapeHtml(item.value)}`)
            .concat(
              Object.entries(links).map(
                ([label, url]) => `${escapeHtml(label)}: ${escapeHtml(url)}`,
              ),
            )
            .join(' • ')}
        </p>
      </header>

      ${renderValuePropositionHtml(personal, escapeHtml, {
        containerClass: 'blk',
        titleClass: 'section-title',
        textClass: '',
      })}
      ${personal.summary ? `<div class="blk"><div class="section-title">Resumen</div><p>${escapeHtml(personal.summary)}</p></div>` : ''}

      ${
        experience.length
          ? `<div class="blk"><div class="section-title">Experiencia</div>${experience
              .map((item: any) => {
                return `<div class="entry"><p class="item-title">${escapeHtml(item.role || 'Rol')}</p><p class="item-subtitle">${escapeHtml(item.company || 'Empresa')}${formatLocation(item.city, item.country) ? ` • ${escapeHtml(formatLocation(item.city, item.country))}` : ''} • ${escapeHtml(formatRange(item.from, item.to))}</p>${item.description ? `<p class="mt-1">${escapeHtml(item.description)}</p>` : ''}</div>`;
              })
              .join('')}</div>`
          : ''
      }

      ${
        education.length
          ? `<div class="blk"><div class="section-title">Educación</div>${education
              .map((item: any) => {
                return `<div class="entry"><p class="item-title">${escapeHtml(item.degree || 'Título')}</p><p class="item-subtitle">${escapeHtml(item.institution || 'Institución')}${formatLocation(item.city, item.country) ? ` • ${escapeHtml(formatLocation(item.city, item.country))}` : ''} • ${escapeHtml(formatRange(item.from, item.to))}</p></div>`;
              })
              .join('')}</div>`
          : ''
      }

      ${
        skills.length || languages.length || certificates.length
          ? `<div class="blk"><div class="section-title">Habilidades</div><div class="card">${skills
              .map(
                skill =>
                  `<div class="mb-2"><p class="item-title">${escapeHtml(skill.name)}</p><p class="item-subtitle">Nivel ${skill.level}</p><div style="height:6px;background:#f3f4f6;border-radius:999px;overflow:hidden;"><div style="width:${skillLevelPercent(skill.level)}%;height:100%;background:#6366f1;"></div></div></div>`,
              )
              .join('')}${languages
              .map(
                lang =>
                  `<div class="mb-2"><p class="item-title">${escapeHtml(lang.name)}</p><p class="item-subtitle">${escapeHtml(lang.level)}</p><div style="height:6px;background:#f3f4f6;border-radius:999px;overflow:hidden;"><div style="width:${cefrLevelPercent(lang.level)}%;height:100%;background:#6366f1;"></div></div>${lang.certificateUrl ? `<p class="mt-1"><a href="${escapeHtml(lang.certificateUrl)}">Certificado</a></p>` : ''}</div>`,
              )
              .join('')}${
              certificates.length
                ? `<div class="mt-4"><div class="item-title">Certificados</div>${certificates
                    .map(
                      cert =>
                        `<p class="item-subtitle"><a href="${escapeHtml(cert.url)}">${escapeHtml(cert.title)}</a></p>`,
                    )
                    .join('')}</div>`
                : ''
            }</div></div>`
          : ''
      }
    </div>
  </body>
</html>`;
}
