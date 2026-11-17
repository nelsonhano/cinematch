# 0001. Send transactional email through one Nodemailer sender with React Email templates · rationale

Build spec: [index.md](./index.md).

## Context

CineMatch has no working email of its own today. Supabase sends the signup confirmation, and the `resend` package sits in `package.json` and `.env.local.example` without a single import. The scope plans four emails on top of this sender (welcome, password reset is Supabase's, group invite, and three billing emails), so whatever shape the sender takes, every later email inherits it.

The forces: the app runs on Vercel serverless functions (short lived Node processes, so no long lived connection pools), the callers are a mix of the auth callback route, API routes, and the Stripe webhook, and two of the later features carry hard rules that a failed send must never block sign in or break webhook handling. The team is small, so the sender has to be something you can debug on a Tuesday evening without a dashboard: plain logs, plain env vars, no new infrastructure.

There is also a client bundle risk. Most pages under `app/(app)/` are client components, and a careless import of the mail module into one of them would try to ship SMTP code (and the names of the SMTP env vars) to the browser. The guard needs to fail at build time, not in production.

Not deciding means each email feature invents its own sending code, error handling, and templates, which is exactly the drift this slice exists to prevent.

## Options considered

### Option 1: Nodemailer with a typed React Email template registry

One module in `lib/email/` owns the SMTP transport, a registry maps each template name to its React component and a subject builder, and `sendEmail` returns a result object instead of throwing. React Email renders both HTML and plain text from the same component.

**Pros**:
- Each new email is one component plus one registry entry; TypeScript checks the props at every call site.
- Templates are previewable in a browser while you write them, and reuse one layout.
- The never throws contract makes the welcome and billing rules (a failed send never blocks) the default, not something each caller must remember.

**Cons**:
- Adds four packages (`nodemailer`, `@react-email/components`, `server-only`, and `react-email` for dev) plus `@types/nodemailer`.
- A result object is easy to ignore; a caller that should react to failure has to check `ok` itself.
- React Email rendering pulls in `react-dom/server`, so templates must be rendered from route handlers or server actions, not inside a Server Component's render.

### Option 2: Nodemailer with plain TypeScript template strings

The same sender, but each email is a function that returns `{ subject, html, text }` built from template strings, like the prompt builders in `lib/ai/prompts/`.

**Pros**:
- Zero template dependencies; matches an existing pattern in the repo.
- Nothing to render, so it works from any server context.

**Cons**:
- Hand written email HTML (tables, inline styles, Outlook quirks) is slow to get right and easy to break.
- Plain text has to be written twice by hand and drifts from the HTML.
- No preview other than sending yourself mail.

### Option 3: Keep Resend's hosted API

Wire up the `resend` package that is already installed and send through Resend's HTTP API.

**Pros**:
- Already in `package.json`; a hosted API gives a send log, bounce tracking, and good deliverability.
- HTTP calls behave well on serverless (no SMTP handshake).

**Cons**:
- The scope already decided to replace it with Nodemailer, so this reopens a settled choice.
- Ties sending to one vendor's SDK; Nodemailer over SMTP can point at any provider by changing env vars.
- Another account, API key, and domain setup before the first email goes out.

## Rationale

The deciding force is that every later email inherits this shape, and two of them (welcome, billing) carry a hard rule that a failed send never breaks the surrounding flow. Making `sendEmail` return a result instead of throwing puts that rule in one place. The runner up, throwing and letting callers catch, works too, but it relies on every future caller remembering a `try/catch` inside the auth callback and the Stripe webhook, which is exactly where a forgotten one hurts most. The missing env case follows the same contract (`EMAIL_NOT_CONFIGURED` plus a loud log) so a misconfigured preview deploy degrades to "no email" instead of "no sign in".

React Email over plain template strings because the cost of hand rolled email HTML lands on every one of the five planned emails, while the cost of React Email (a few packages and a render step) is paid once. The typed registry, rather than passing a raw React element, keeps each subject next to its template and lets TypeScript catch wrong props at the call site; the runner up (the Resend style `react: <Element />` shape) is more flexible than anything planned needs. The light layout is chosen for reliability: dark email backgrounds get inverted or mangled by several clients, and the app's dark look matters less in an inbox than legibility.

Gmail with an app password is the engineer's choice for the SMTP host. It is free and quick, and it is fine for this stage, but it caps out around 500 recipients a day, sends from a personal looking address, and can be revoked by Google. Because every SMTP setting is an env var, moving to a transactional SMTP service later (Brevo, Amazon SES, Postmark) is a config change, not a code change; see Consequences and Follow-up. One attempt with a 15 second overall cap, no retry, because serverless requests should not sit on a slow mail server. That means a failed send is lost apart from its log line: Stripe does not redeliver the webhook, because the handler still returns 200 when the email fails (that is the "never breaks webhook handling" rule working as intended). If a later email needs durability, it needs its own record and retry, not this sender.
