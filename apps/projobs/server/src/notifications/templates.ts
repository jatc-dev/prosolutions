import type { JobSummary } from '../contracts.js';
import type { MailMessage } from './mailer.js';

const STAGE_LABEL: Record<string, string> = {
  applied: 'Postulación recibida',
  screening: 'En preselección',
  interview: 'Entrevista',
  offer: 'Oferta',
  hired: 'Contratado/a',
  rejected: 'Proceso cerrado',
  withdrawn: 'Retirada',
};

const STAGE_MESSAGE: Record<string, string> = {
  screening: 'La empresa está revisando tu perfil con más detalle.',
  interview: 'La empresa quiere conocerte: pronto te contactará para coordinar la entrevista.',
  offer: '¡Buenas noticias! La empresa avanzó a la etapa de oferta.',
  hired: '¡Felicitaciones! La empresa marcó tu proceso como contratado.',
  rejected:
    'La empresa decidió continuar con otros perfiles en esta vacante. Gracias por tu interés: sigue explorando vacantes que encajan contigo.',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, bodyHtml: string, footerHtml: string): string {
  return [
    '<!doctype html><html lang="es"><body style="margin:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">',
    '<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px">',
    '<tr><td style="padding:24px 28px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#047857">ProJobs · ProSolutions</td></tr>',
    `<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:20px;line-height:28px">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>`,
    `<tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">${footerHtml}</td></tr>`,
    '</table></td></tr></table></body></html>',
  ].join('');
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${escapeHtml(label)}</a></p>`;
}

const paragraph = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:24px">${html}</p>`;
const TRANSACTIONAL_FOOTER = 'Recibes este correo porque tienes un proceso activo en ProJobs.';
const greeting = (name: string | null) => (name ? `Hola ${name},` : 'Hola,');

export function applicationReceivedCandidate(input: {
  to: string;
  candidateName: string | null;
  jobTitle: string;
  companyName: string;
  webUrl: string;
}): MailMessage {
  const subject = `Recibimos tu postulación a ${input.jobTitle}`;
  const link = `${input.webUrl}/postulaciones`;
  return {
    to: input.to,
    subject,
    text: `${greeting(input.candidateName)}\n\nTu postulación a "${input.jobTitle}" en ${input.companyName} fue enviada. Te avisaremos cuando la empresa avance tu proceso.\n\nSigue tu proceso: ${link}`,
    html: layout(
      subject,
      paragraph(escapeHtml(greeting(input.candidateName))) +
        paragraph(
          `Tu postulación a <strong>${escapeHtml(input.jobTitle)}</strong> en <strong>${escapeHtml(input.companyName)}</strong> fue enviada. Te avisaremos cuando la empresa avance tu proceso.`,
        ) +
        button(link, 'Ver mis postulaciones'),
      TRANSACTIONAL_FOOTER,
    ),
  };
}

export function applicationReceivedRecruiter(input: {
  to: string;
  candidateName: string | null;
  jobTitle: string;
  matchScore: number | null;
  webUrl: string;
  jobId: string;
}): MailMessage {
  const subject = `Nueva postulación para ${input.jobTitle}`;
  const link = `${input.webUrl}/empresa/vacantes/${encodeURIComponent(input.jobId)}/candidatos`;
  const who = input.candidateName ?? 'Un candidato';
  const affinity = input.matchScore != null ? ` Afinidad con los requisitos: ${input.matchScore}%.` : '';
  return {
    to: input.to,
    subject,
    text: `${who} se postuló a "${input.jobTitle}".${affinity}\n\nRevisa el pipeline: ${link}`,
    html: layout(
      subject,
      paragraph(`<strong>${escapeHtml(who)}</strong> se postuló a <strong>${escapeHtml(input.jobTitle)}</strong>.${escapeHtml(affinity)}`) +
        button(link, 'Revisar candidatos'),
      'Recibes este correo porque eres miembro del equipo de selección de la empresa.',
    ),
  };
}

/** Candidate email for a pipeline move; null for stages that do not notify. */
export function stageChangedCandidate(input: {
  to: string;
  candidateName: string | null;
  jobTitle: string;
  companyName: string;
  toStage: string;
  webUrl: string;
}): MailMessage | null {
  const message = STAGE_MESSAGE[input.toStage];
  if (!message) return null;
  const label = STAGE_LABEL[input.toStage] ?? 'Actualización';
  const subject = `${label}: ${input.jobTitle}`;
  const link = `${input.webUrl}/postulaciones`;
  return {
    to: input.to,
    subject,
    text: `${greeting(input.candidateName)}\n\nTu proceso para "${input.jobTitle}" en ${input.companyName} cambió a: ${label}.\n${message}\n\nVer detalle: ${link}`,
    html: layout(
      subject,
      paragraph(escapeHtml(greeting(input.candidateName))) +
        paragraph(
          `Tu proceso para <strong>${escapeHtml(input.jobTitle)}</strong> en <strong>${escapeHtml(input.companyName)}</strong> cambió a <strong>${escapeHtml(label)}</strong>.`,
        ) +
        paragraph(escapeHtml(message)) +
        button(link, 'Ver mi postulación'),
      TRANSACTIONAL_FOOTER,
    ),
  };
}

export function jobAlertDigest(input: {
  to: string;
  label: string | null;
  jobs: JobSummary[];
  total: number;
  searchUrl: string;
  webUrl: string;
  unsubscribeUrl: string;
}): MailMessage {
  const noun = input.total === 1 ? 'vacante nueva' : 'vacantes nuevas';
  const subject = `${input.total} ${noun}${input.label ? ` para "${input.label}"` : ''}`;
  const items = input.jobs
    .map((job) => {
      const url = `${input.webUrl}/empleos/${encodeURIComponent(job.slug)}`;
      return `<li style="margin:0 0 12px"><a href="${escapeHtml(url)}" style="color:#047857;font-weight:600;text-decoration:none">${escapeHtml(job.title)}</a><br><span style="color:#475569;font-size:13px">${escapeHtml(job.company.name)}</span></li>`;
    })
    .join('');
  const text = input.jobs.map((job) => `- ${job.title} · ${job.company.name}: ${input.webUrl}/empleos/${job.slug}`).join('\n');
  const footer = `Recibes esta alerta porque la creaste en ProJobs. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#475569">Cancelar esta alerta</a>.`;
  return {
    to: input.to,
    subject,
    text: `${subject}\n\n${text}\n\nVer todas: ${input.searchUrl}\n\nCancelar esta alerta: ${input.unsubscribeUrl}`,
    html: layout(subject, `<ul style="padding-left:18px;margin:0">${items}</ul>` + button(input.searchUrl, 'Ver todas las vacantes'), footer),
  };
}
