# 0001. Send transactional email through one Nodemailer sender with React Email templates

**Date**: 2026-11-16
**Status**: In Progress

Decision history (context, options, rationale): [rationale.md](./rationale.md). Verify steps: [verify.md](./verify.md).

## Summary

CineMatch gets one shared, server only function, `sendEmail`, that every email goes through. It sends over SMTP (the standard mail sending protocol) with Nodemailer, using a Gmail account for now, and builds each email from a React Email template (emails written as React components). It never throws: it returns a simple success or failure result, so a broken email can never break sign in or a Stripe webhook. This slice also removes the unused Resend package and ships a test template plus a script that proves a real email arrives.

## Requirements

**User stories**:
- As a CineMatch developer, I want one function that sends a typed, branded email so that each new email is a template plus one call, not a new integration.
- As a CineMatch user, I want sign in and checkout to keep working even when email is down, so that a mail outage never locks me out.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: `resend` is gone from `package.json` dependencies, `RESEND_API_KEY` is gone from `.env.local.example`, and nothing in the repo imports `resend`.
- **AC-2**: All SMTP settings come from env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`), each documented in `.env.local.example` with a Gmail example.
- **AC-3**: App code sends mail only through `sendEmail` exported from `@/lib/email`. That entry starts with `import 'server-only'`, so importing it from a client component fails `npm run build`.
- **AC-4**: `sendEmail({ to, template, props })` renders the named React Email template to HTML and to plain text, sends one message over SMTP from `EMAIL_FROM`, and returns `{ ok: true, messageId }`.
- **AC-5**: `sendEmail` never throws, whatever fails (config, validation, render, SMTP). On any render error, SMTP error, or timeout it returns `{ ok: false, error: 'SEND_FAILED' }` and logs exactly one line, `[email] send failed template=<name> to=<masked> code=<err.code> error=<message>`, where every email address inside the message is redacted to `<redacted>`. The line never contains the password, the full recipient, or the email body. A success logs one line, `[email] sent template=<name> to=<masked> messageId=<id>`.
- **AC-6**: When any required SMTP env var is missing, empty, or whitespace (and when `SMTP_PORT` is not a positive integer), `sendEmail` returns `{ ok: false, error: 'EMAIL_NOT_CONFIGURED' }` without opening a connection, and `console.error` names every bad variable.
- **AC-7**: The recipient is checked first, before config. When `to`, after trimming, is not exactly one valid address (`z.email()`, at most 254 characters, so `Name <a@b.com>`, commas, and line breaks are all rejected), `sendEmail` returns `{ ok: false, error: 'INVALID_RECIPIENT' }` without opening a connection and logs `[email] invalid recipient template=<name> to=<invalid>`.
- **AC-8**: Each send makes exactly one attempt. Nodemailer's `connectionTimeout`, `greetingTimeout`, and `socketTimeout` are each 10000 ms, and a 15 second overall cap (`Promise.race`) bounds the whole send, so a hung SMTP server returns `SEND_FAILED` within about 15 seconds instead of holding the request open.
- **AC-9**: Templates live in a typed registry. TypeScript rejects an unknown template name or props that do not match that template.
- **AC-10**: `npx tsx scripts/send-test-email.ts <address>` loads `.env.local` itself, sends the `test` template to that address through `lib/email/send.ts`, prints the `messageId`, and sets exit code 1 on any failure result (printing the error code). Run with no address, it prints a usage line and exits 1.
- **AC-11**: `npm run email` starts the React Email preview server at `http://localhost:3001` listing every template (and only templates) with sample props.
- **AC-12**: Every template renders inside one shared light layout: a white card (`#ffffff`) on a light grey background (`#f4f4f5`), a "CineMatch" text wordmark, a shared `EmailButton` in the brand indigo `#6366F1` (the `test` template shows one, linking to `NEXT_PUBLIC_APP_URL`), and a one line footer: "You got this email because you have a CineMatch account."
- **AC-14**: The sender also works inside Next: `npm run build` succeeds with `@/lib/email` imported by a server route, and a render inside a route handler produces HTML (checked once during verify).
- **AC-13**: `npm run typecheck` passes and `npm run lint` reports no new errors in the files this feature adds.

## Decision

**Chosen option**: Option 1: Nodemailer with a typed React Email template registry

CineMatch sends every email through one server only `sendEmail` in `lib/email/`, which renders a registered React Email template and sends it over SMTP with Nodemailer, returning a result object and never throwing.

**Implementation skills**: `react-email` (`resend/react-email`, `.agents/skills/react-email/`, templates, components, rendering, preview; ignore its Resend sending parts, we send with Nodemailer) · `email-smtp-send` (`tiangong-ai/agent-skills`, `.agents/skills/email-smtp-send/`, general SMTP sending) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`, the recipient check)

## Feature design

**Data model sketch**:
No database tables. Sends are logged to the console only (the engineer chose console logging over an `email_log` table). Any "send once" bookkeeping (for example the welcome email) belongs to that email's own spec, on `profiles`, as `supabase/AGENTS.md` notes.

In code types:

| Type | Fields |
|---|---|
| `EmailConfig` | `host: string`, `port: number`, `secure: boolean` (derived, `port === 465`), `user: string`, `pass: string`, `from: string` |
| `PropsMap` | explicit map of template name to props type: `{ test: TestEmailProps }`, later emails add a line |
| `TemplateName` | `keyof PropsMap` |
| `TemplateDefinition<P>` | `component: ComponentType<P>`, `subject: (props: P) => string` |
| `templates` registry | `{ [N in TemplateName]: TemplateDefinition<PropsMap[N]> }`; imports each template's default export and holds its subject |
| `SendEmailInput<N>` | `to: string` (one address), `template: N`, `props: PropsMap[N]` |
| `SendEmailResult` | `{ ok: true, messageId: string }` or `{ ok: false, error: 'EMAIL_NOT_CONFIGURED' \| 'INVALID_RECIPIENT' \| 'SEND_FAILED' }` |
| `TestEmailProps` | `sentAt: string` (ISO time, shown in the email) |

Typing note: `sendEmail<N extends TemplateName>(input: SendEmailInput<N>)` reads the definition with one cast, `const def = templates[input.template] as TemplateDefinition<PropsMap[N]>`, because indexing a mapped type with a generic key otherwise yields a union `tsc` will not call. Render with `createElement(def.component, input.props)`, never by calling the component as a function.

File layout:

| File | Owns |
|---|---|
| `lib/email/index.ts` | `import 'server-only'`, then re exports `sendEmail` and the public types. The only entry app code imports. |
| `lib/email/send.ts` | Validation, config check, a new Nodemailer transporter per call (closed after), rendering, sending, the overall timeout, logging. No `server-only` import, so the tsx script can load it. |
| `lib/email/config.ts` | Reads `process.env` at call time (never at module top level) and returns `EmailConfig` or the list of bad names. |
| `lib/email/log.ts` | `maskEmail` and `redactEmails` helpers plus the two log line formats. |
| `lib/email/registry.ts` | `PropsMap`, `TemplateName`, `TemplateDefinition`, and the `templates` registry. |
| `lib/email/layout.tsx` | Named exports only: `EmailLayout` (wordmark, card, footer) and `EmailButton`. |
| `lib/email/templates/test.tsx` | The `test` template: default export component plus `PreviewProps`. This folder holds template files only, so the preview server lists nothing else. |
| `scripts/send-test-email.ts` | `async function main()`: loads `.env.local` with `process.loadEnvFile` (in try/catch), reads the address argument, calls `sendEmail` from `../lib/email/send`, prints the result, sets `process.exitCode`. |

Inside `lib/email/` and the script, import by relative path (`./layout`, `../registry`), not the `@/` alias, so tsx and the preview server both resolve them.

**State transitions**: none.

**API surface** (a server function, not an HTTP endpoint):

| Function | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `sendEmail` from `@/lib/email` | async server function | `to: string` (req), `template: TemplateName` (req), `props: TemplateProps<N>` (req) | `{ ok: true, messageId }` | server only, callers decide who may trigger a send | `{ ok: false, error: 'EMAIL_NOT_CONFIGURED' \| 'INVALID_RECIPIENT' \| 'SEND_FAILED' }` |
| `scripts/send-test-email.ts` | CLI | `argv[2]`: recipient address | prints `messageId`, exit 0 | local machine with `.env.local` loaded | prints the error code, exit 1 |
| `npm run email` | dev script | none | preview UI on port 3001 | local only | none |

Package scripts to add: `"email": "email dev --dir lib/email/templates --port 3001"`.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `sendEmail` | SMTP host, port, user, password | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars |
| `sendEmail` | TLS mode (`secure`, `requireTLS`) | derived: `secure: true` when `SMTP_PORT` is `465`; otherwise `secure: false` with `requireTLS: true`, so STARTTLS on 587 can never fall back to plain text |
| `sendEmail` | Timeouts | fixed in code: `connectionTimeout`, `greetingTimeout`, `socketTimeout` 10000 ms each, plus a 15000 ms overall cap |
| `sendEmail` | From header | `EMAIL_FROM` env var, e.g. `CineMatch <you@gmail.com>` |
| `sendEmail` | Subject | `templates[template].subject(props)` |
| `sendEmail` | HTML body | `await render(createElement(def.component, props))` from `@react-email/components` (render is async) |
| `sendEmail` | Plain text body | a second `await render(..., { plainText: true })` on the same element |
| `sendEmail` | `messageId` | Nodemailer's `sendMail` result `info.messageId` |
| `sendEmail` | Masked recipient in logs | derived from the trimmed `to`: first character, `***`, then `@domain` (`a@x.com` becomes `a***@x.com`); an invalid `to` logs as `<invalid>` |
| `sendEmail` | Error code and message in the log | `err.code` (for example `EAUTH`, `ETIMEDOUT`, or `TIMEOUT` for the overall cap) and `err.message` passed through `redactEmails` (any `x@y` pattern becomes `<redacted>`) |
| `sendEmail` | List of bad vars in the log | derived from `config.ts` checking the five names (empty, whitespace, or a non integer port counts as bad) |
| `test` template | Sent time shown in the email | `props.sentAt`, set by the script to `new Date().toISOString()` |
| `test` template | Button link | `NEXT_PUBLIC_APP_URL` (already in `.env.local.example`), falling back to `http://localhost:3000` |
| Layout | Brand color | `#6366F1`, the app's `--primary` in `app/globals.css`, inlined (email clients ignore CSS variables) |
| Preview | Sample props | each template's `PreviewProps` static |

**Key invariants**:
- `sendEmail` never throws: the whole body sits in one outer try/catch, and anything unexpected (including a render error) becomes `SEND_FAILED`.
- Check order: recipient, then config, then render, then send. No connection is opened unless `to` is one valid address and config is complete.
- One send call, one attempt, one recipient, one fresh transporter that is closed afterwards.
- Callers must `await sendEmail(...)` (or schedule it with `after()` from `next/server`); never fire and forget with `void`, because Vercel may freeze the function as soon as the response is sent and the email is lost.
- App code imports only `@/lib/email`; only `scripts/` may import `lib/email/send.ts` directly.
- Logs never contain `SMTP_PASS`, the full recipient address, or the email body.
- Every template renders inside `layout.tsx`.

**Security model**:
Server only. `SMTP_PASS` is a Gmail app password (a 16 character password Google issues for one app, which requires 2 step verification on the account); it lives only in env vars (`.env.local` locally, Vercel project env in deploys) and is never logged. `server-only` makes any client import a build error. `sendEmail` itself has no notion of users; each caller (welcome, invite, billing) owns who may trigger a send and any rate limit (the group invite spec must add one). Recipient validation with Zod plus the single recipient rule blocks header injection and accidental mass sends; React escapes all interpolated props in the HTML. Recipient addresses are personal data, which is why logs mask them.

**Configuration required**:
- `SMTP_HOST`: SMTP server, `smtp.gmail.com` for Gmail.
- `SMTP_PORT`: `465` (implicit TLS) or `587` (STARTTLS); Gmail supports both. Must be a positive integer.
- `SMTP_USER`: the Gmail address that owns the app password.
- `SMTP_PASS`: the Gmail app password.
- `EMAIL_FROM`: From header, e.g. `CineMatch <you@gmail.com>`. With Gmail this must be the same address as `SMTP_USER` (or a verified alias), or Gmail rewrites it.
- Prerequisite: turn on 2 step verification on the Gmail account and create an app password before the first send.
- Remove: `RESEND_API_KEY`.
- Add `.react-email` to `.gitignore` (the preview server's build folder).
- If `next build` rejects `react-dom/server` through React Email, add `@react-email/render` to `serverExternalPackages` in `next.config.ts`.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: the script sends the `test` template to your own inbox, it arrives with the light layout and a readable plain text part, and the script prints a `messageId`, verifies **AC-4**, **AC-10**, **AC-12**
- Failure case: with `SMTP_HOST` pointed at a host that accepts TCP but never answers, `sendEmail` returns `SEND_FAILED` within about 15 seconds and logs one masked line, verifies **AC-5**, **AC-8**
- Failure case: a wrong `SMTP_PASS` returns `SEND_FAILED` with `code=EAUTH`, and any address in Gmail's reply is redacted in the log, verifies **AC-5**
- Failure case: with `SMTP_PASS` unset (or `SMTP_PORT=abc`), it returns `EMAIL_NOT_CONFIGURED`, names the variable in the log, and opens no connection, verifies **AC-6**
- Failure case: `to: 'not-an-email'`, `to: 'a@x.com, b@x.com'`, and `to: 'Name <a@x.com>'` all return `INVALID_RECIPIENT`, even when config is also missing, verifies **AC-7**
- Failure case: the script run with no argument prints usage and exits 1, verifies **AC-10**
- Auth/permission: importing `@/lib/email` from a `'use client'` component makes `npm run build` fail, verifies **AC-3**
- In Next: a temporary route handler that renders the `test` template returns HTML, and `npm run build` passes (remove the route after), verifies **AC-14**
- Types: `sendEmail({ to, template: 'nope', props: {} })` and wrong props for `test` fail `npm run typecheck`, verifies **AC-9**

## Build plan

Tracer Bullet: get one real email into a real inbox through the final code path first, then thicken it with the contract, types, and tooling.

1. Swap dependencies: uninstall `resend`; install `nodemailer`, `@react-email/components`, `server-only`; install `@types/nodemailer` and `react-email` as dev dependencies; replace the Resend block in `.env.local.example` with the five SMTP vars and Gmail examples; add `.react-email` to `.gitignore`, satisfies **AC-1**, **AC-2**
2. Thin thread: write `config.ts`, a minimal `templates/test.tsx`, `registry.ts` with that one entry, and `send.ts` that renders and sends it; write `scripts/send-test-email.ts` (env loading, `main()`, usage line, exit code); send to your own Gmail and see it arrive, satisfies **AC-4**, **AC-10**
3. Add `lib/email/index.ts` with `import 'server-only'` as the single app entry, confirm a client import breaks the build, and confirm a render inside a temporary route handler works under `npm run build` (add `serverExternalPackages` only if needed), satisfies **AC-3**, **AC-14**
4. Thicken the contract: the outer try/catch, recipient check first, config edge cases, `requireTLS`, the three Nodemailer timeouts plus the 15 second cap, per call transporter with close, and `log.ts` (masking, redaction, the two log lines), satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**
5. Harden the registry types (`PropsMap`, the mapped `templates` type, the single cast in `sendEmail`) so wrong names and props fail typecheck, satisfies **AC-9**
6. Build `layout.tsx` (`EmailLayout` and `EmailButton`, light colors, wordmark, footer) and wrap the `test` template in it with a button to `NEXT_PUBLIC_APP_URL`, satisfies **AC-12**
7. Add the `email` package script and `PreviewProps` on the `test` template; confirm the preview at port 3001 lists only templates, satisfies **AC-11**
8. Run `npm run typecheck` and `npm run lint`, fixing anything new, satisfies **AC-13**

## Consequences

**Positive**:
- Every later email (welcome, invite, billing) is one template file, one registry line, and one `sendEmail` call.
- A mail outage or missing config degrades to "no email" with a clear log, never a broken sign in or webhook.
- Switching SMTP providers is an env change.

**Negative / tradeoffs**:
- Gmail limits you to roughly 500 recipients a day, mail comes from a personal Gmail address (lower trust, more likely to land in spam), and Google can revoke the app password. Fine for development and early users, not for launch.
- No send history: with console only logging, "did this user get their email" is answered from Vercel logs, which have short retention.
- Result objects can be silently ignored; callers that care must check `ok`.
- An awaited send can add up to 15 seconds to the caller's response. That matters for the Stripe webhook (Stripe gives up on slow endpoints), so the billing emails should send through `after()`.
- A failed send is not retried by anyone; the log line is the only trace.
- React Email rendering requires a route handler or server action context, not a Server Component render.
- Five new packages to keep updated.

**Neutral**:
- `lib/email/` becomes a new area with its own conventions; `/sync` should give it a nested `AGENTS.md` after the build.
- `.env.local` and the Vercel project env need the five new vars before anything sends.

## Follow-up

- [ ] Before launch, move SMTP to a transactional service with your own domain (SPF and DKIM set up) to lift Gmail's limits and improve deliverability; it should be an env change only.
- [ ] If "did this email send" becomes a support question, revisit an `email_log` table (was considered and deferred here).
- [ ] The group invite email spec (feature 5) must add its own rate limit; `sendEmail` deliberately has none.
- [ ] The billing emails spec (feature 6) should send through `after()` from `next/server` so the webhook answers Stripe fast, and needs its own idempotency per event since this sender has none.
- [ ] After the build, root `AGENTS.md` still says "Planned: Nodemailer replaces the unused `resend` package"; `/sync` should update that line.
- [ ] After the build, `/sync` should add `lib/email/AGENTS.md` and a root pointer recording the "import only `@/lib/email`" rule.
- [ ] The newly installed `react-email` and `email-smtp-send` skills are not yet in any `AGENTS.md`; they belong in `lib/email/AGENTS.md` under `## Agent skills`, with `Declined: React Email MCP, Nodemailer MCP (sendmail-mcp)` so they are not offered again.
