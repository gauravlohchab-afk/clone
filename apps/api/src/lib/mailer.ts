import nodemailer from 'nodemailer';
import type { Logger } from './logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
  readonly kind: 'smtp' | 'console' | 'memory';
}

export function createSmtpMailer(url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url);
  return {
    kind: 'smtp',
    async send(m) {
      await transport.sendMail({ from, ...m });
    },
  };
}

/** Development only: writes the email (including links) to the log instead of sending it. */
export function createConsoleMailer(logger: Logger): Mailer {
  return {
    kind: 'console',
    async send(m) {
      logger.info({ mail: { to: m.to, subject: m.subject } }, `\n--- DEV EMAIL ---\nTo: ${m.to}\nSubject: ${m.subject}\n\n${m.text}\n-----------------`);
    },
  };
}

/** Tests: keeps messages in memory so tests can follow real verification links. */
export function createMemoryMailer(): Mailer & { outbox: MailMessage[] } {
  const outbox: MailMessage[] = [];
  return { kind: 'memory', outbox, async send(m) { outbox.push(m); } };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function renderEmail(brand: string, heading: string, body: string, action?: { label: string; url: string }) {
  const text = [heading, '', body, action ? `\n${action.label}: ${action.url}` : '', '', `— ${brand}`].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#F4F3EF;font-family:Inter,Arial,sans-serif;color:#11131C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border-radius:12px;padding:32px">
<tr><td style="font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;font-size:20px;letter-spacing:1px">${esc(brand)}</td></tr>
<tr><td style="padding-top:24px;font-size:22px;font-weight:600">${esc(heading)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#3A3F54">${esc(body)}</td></tr>
${action ? `<tr><td style="padding-top:24px"><a href="${esc(action.url)}" style="display:inline-block;background:#B6FF4A;color:#11131C;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${esc(action.label)}</a></td></tr>
<tr><td style="padding-top:16px;font-size:12px;color:#5A6078;word-break:break-all">${esc(action.url)}</td></tr>` : ''}
</table></td></tr></table></body></html>`;
  return { text, html };
}
