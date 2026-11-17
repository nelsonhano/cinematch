export interface EmailConfig {
  host: string;
  port: number;
  /** true only for port 465 (implicit TLS); other ports use STARTTLS with requireTLS. */
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export type EmailConfigResult =
  | { ok: true; config: EmailConfig }
  | { ok: false; missing: string[] };

const REQUIRED_VARS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'] as const;

/**
 * Reads SMTP settings from process.env at call time (never at module load),
 * so the test script can load .env.local first and serverless envs are read fresh.
 */
export function readEmailConfig(): EmailConfigResult {
  const values: Record<string, string> = {};
  const missing: string[] = [];

  for (const name of REQUIRED_VARS) {
    const value = process.env[name]?.trim() ?? '';
    if (!value) missing.push(name);
    values[name] = value;
  }

  const port = Number(values.SMTP_PORT);
  if (values.SMTP_PORT && !(/^\d+$/.test(values.SMTP_PORT) && Number.isInteger(port) && port > 0)) {
    missing.push('SMTP_PORT');
  }

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    config: {
      host: values.SMTP_HOST,
      port,
      secure: port === 465,
      user: values.SMTP_USER,
      pass: values.SMTP_PASS,
      from: values.EMAIL_FROM,
    },
  };
}
