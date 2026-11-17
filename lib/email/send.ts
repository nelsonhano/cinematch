import { createElement } from 'react';
import nodemailer from 'nodemailer';
import { render } from '@react-email/components';
import { z } from 'zod';
import { readEmailConfig } from './config';
import { logInvalidRecipient, logNotConfigured, logSendFailed, logSent, maskEmail } from './log';
import { templates, type PropsMap, type TemplateDefinition, type TemplateName } from './registry';

// No `server-only` import here so scripts/ can load this file with tsx.
// App code must import from `@/lib/email`, which adds the guard.

export interface SendEmailInput<N extends TemplateName> {
  to: string;
  template: N;
  props: PropsMap[N];
}

export type SendEmailError = 'EMAIL_NOT_CONFIGURED' | 'INVALID_RECIPIENT' | 'SEND_FAILED';

export type SendEmailResult = { ok: true; messageId: string } | { ok: false; error: SendEmailError };

const SMTP_TIMEOUT_MS = 10_000;
const OVERALL_TIMEOUT_MS = 15_000;

const recipientSchema = z.email().max(254);

class SendTimeoutError extends Error {
  code = 'TIMEOUT';
  constructor() {
    super(`send exceeded ${OVERALL_TIMEOUT_MS} ms`);
  }
}

/**
 * Renders a registered template and sends it over SMTP. Never throws: every
 * failure comes back as `{ ok: false, error }` with one log line.
 * Always await it (or schedule it with `after()`); never fire and forget.
 */
export async function sendEmail<N extends TemplateName>(input: SendEmailInput<N>): Promise<SendEmailResult> {
  const templateName = String(input?.template);
  let maskedTo = '<invalid>';

  try {
    // 1. Recipient first, before config.
    const to = typeof input?.to === 'string' ? input.to.trim() : '';
    if (!recipientSchema.safeParse(to).success) {
      logInvalidRecipient(templateName);
      return { ok: false, error: 'INVALID_RECIPIENT' };
    }
    maskedTo = maskEmail(to);

    // 2. Config.
    const configResult = readEmailConfig();
    if (!configResult.ok) {
      logNotConfigured(templateName, configResult.missing);
      return { ok: false, error: 'EMAIL_NOT_CONFIGURED' };
    }
    const config = configResult.config;

    // 3. Render, 4. send, all under one overall cap.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });

    try {
      const work = (async () => {
        const def = templates[input.template] as TemplateDefinition<PropsMap[N]>;
        const element = createElement(def.component, input.props);
        const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
        const info = await transporter.sendMail({
          from: config.from,
          to,
          subject: def.subject(input.props),
          html,
          text,
        });
        return info.messageId as string;
      })();
      // Keep a late rejection from becoming an unhandled rejection after the cap wins.
      work.catch(() => {});

      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SendTimeoutError()), OVERALL_TIMEOUT_MS);
      });

      const messageId = await Promise.race([work, timeout]);
      logSent(templateName, maskedTo, messageId);
      return { ok: true, messageId };
    } finally {
      clearTimeout(timer);
      transporter.close();
    }
  } catch (err) {
    logSendFailed(templateName, maskedTo, err);
    return { ok: false, error: 'SEND_FAILED' };
  }
}
