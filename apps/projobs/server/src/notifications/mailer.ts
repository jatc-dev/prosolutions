import nodemailer from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  readonly enabled: boolean;
  send(message: MailMessage): Promise<void>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function readSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  return {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM || 'ProJobs <no-reply@prosolutions.page>',
  };
}

/** SMTP mailer, or a log-only mailer when SMTP is not configured (dev/tests). */
export function createMailer(
  smtp: SmtpConfig | null,
  log: (message: string, meta?: Record<string, unknown>) => void,
): Mailer {
  if (!smtp) {
    return {
      enabled: false,
      async send(message) {
        log('email not sent (SMTP not configured)', { subject: message.subject });
      },
    };
  }
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  return {
    enabled: true,
    async send(message) {
      await transport.sendMail({ from: smtp.from, ...message });
    },
  };
}

/** In-memory mailer used by tests. */
export function createMemoryMailer(): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    enabled: true,
    sent,
    async send(message) {
      sent.push(message);
    },
  };
}
