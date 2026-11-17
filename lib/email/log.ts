const EMAIL_PATTERN = /[^\s<>"'(),;:@]+@[^\s<>"'(),;:@]+/g;

/** `alice@example.com` becomes `a***@example.com`. Call only on a validated address. */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf('@');
  if (at <= 0) return '<invalid>';
  return `${address[0]}***${address.slice(at)}`;
}

/** Replaces every `x@y` pattern in free text (for example an SMTP error) with `<redacted>`. */
export function redactEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, '<redacted>');
}

export function logSent(template: string, maskedTo: string, messageId: string): void {
  console.log(`[email] sent template=${template} to=${maskedTo} messageId=${messageId}`);
}

export function logSendFailed(template: string, maskedTo: string, err: unknown): void {
  const code =
    err && typeof err === 'object' && 'code' in err && err.code != null ? String(err.code) : 'UNKNOWN';
  const message = err instanceof Error ? err.message : String(err);
  console.error(
    `[email] send failed template=${template} to=${maskedTo} code=${code} error=${redactEmails(message).replace(/\s+/g, ' ')}`
  );
}

export function logInvalidRecipient(template: string): void {
  console.error(`[email] invalid recipient template=${template} to=<invalid>`);
}

export function logNotConfigured(template: string, missing: string[]): void {
  console.error(
    `[email] not configured template=${template} missing or invalid env: ${missing.join(', ')}`
  );
}
