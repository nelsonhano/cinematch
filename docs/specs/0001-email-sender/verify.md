# Verify: Email sender · spec 0001 · updated 2026-11-16 · last verify run 2026-11-16 (BLOCKED: real SMTP send owed)
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Before you start: add the five SMTP vars to `.env.local` (Gmail: turn on 2 step verification, create an app password, use `smtp.gmail.com`, port `465`, and set `EMAIL_FROM` to the same address as `SMTP_USER`).

## UI / manual
- [ ] Run `npx tsx scripts/send-test-email.ts <your address>` → it prints `Sent. messageId=...`, exit code 0, and one `[email] sent template=test to=y***@gmail.com messageId=...` line → AC-4, AC-10
- [ ] Open the email in Gmail → white card on a light grey background, "CineMatch" wordmark, indigo `#6366F1` "Open CineMatch" button, footer "You got this email because you have a CineMatch account." → AC-12
- [ ] Click the button → it opens `NEXT_PUBLIC_APP_URL`; with that var unset, rerun and confirm the link is `http://localhost:3000` → AC-12
- [ ] In Gmail, "Show original" → a `text/plain` part with readable text plus a `text/html` part; the From header equals `EMAIL_FROM` and the subject is "CineMatch test email" → AC-4
- [x] Run `npm run email`, open `http://localhost:3001` → the sidebar lists only `test`, and it renders with the sample `sentAt` → AC-11

## Commands
- [x] `npx tsx scripts/send-test-email.ts` (no address) → prints the usage line, exit code 1 → AC-10
- [ ] Set a wrong `SMTP_PASS` and send → `Failed: SEND_FAILED`, exit 1, one log line with `code=EAUTH`, any address in Gmail's reply shown as `<redacted>`, no password and no full recipient in the line → AC-5
- [x] Point `SMTP_HOST`/`SMTP_PORT` at a TCP server that never answers → `SEND_FAILED` in about 10 to 15 seconds, one masked log line (`code=ETIMEDOUT` from the greeting timeout, or `code=TIMEOUT` from the 15 second cap) → AC-5, AC-8
- [x] Unset `SMTP_PASS`, then separately set `SMTP_PORT=abc`, `SMTP_PORT=0`, and `SMTP_USER="  "` → each returns `EMAIL_NOT_CONFIGURED` and the log names every bad var; no connection is attempted → AC-6
- [x] With config also missing, send to `not-an-email`, `a@x.com, b@x.com`, `Name <a@x.com>`, and an address containing a line break → each returns `INVALID_RECIPIENT` (recipient checked before config) and logs `to=<invalid>` → AC-7
- [ ] Send to `  you@gmail.com  ` (padded) → it is trimmed and sends, the log shows `to=y***@gmail.com` → AC-7, AC-5 (masked recipient source)
- [x] Add a temporary `'use client'` page that imports `@/lib/email`, run `npm run build` → the build fails with the `server-only` error; remove the page (and clear `.next/types`) → AC-3
- [x] Add a temporary route handler that imports `@/lib/email` and renders `templates/test` with `render`, run `npm run build` then `next start` and request it → HTML containing "Email is working"; remove the route → AC-14
- [x] In a temporary file call `sendEmail({ template: 'nope', ... })` and `sendEmail({ template: 'test', props: { sentAt: 5 } })` → `npm run typecheck` rejects both → AC-9
- [x] `npm ls resend` is empty, `grep -r resend` finds no import in app code, and `.env.local.example` has no `RESEND_API_KEY` → AC-1
- [x] `.env.local.example` documents `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` with Gmail examples → AC-2
- [x] `npm run typecheck` passes and `npm run lint` shows no problems in `lib/email/` or `scripts/send-test-email.ts` (the existing 1 error and 21 warnings elsewhere are unchanged) → AC-13

## Value sourcing checks
- [ ] Port `465` connects with implicit TLS; port `587` uses STARTTLS and refuses to continue without it (`requireTLS`) → TLS mode source
- [ ] The log line never contains `SMTP_PASS`, the full recipient, or the body, across success and every failure above → masked recipient, redacted error message
- [ ] The `Sent at` line in the email shows the time the script ran (ISO) → `props.sentAt`

## Acceptance-criteria coverage
- AC-1: resend removal check · AC-2: env example check · AC-3: client import build · AC-4: real send, show original · AC-5: wrong password, hung server, log content · AC-6: missing and bad vars · AC-7: bad recipients, trimming · AC-8: hung server timing · AC-9: typecheck rejection · AC-10: real send, no argument · AC-11: preview server · AC-12: inbox look and button · AC-13: typecheck and lint · AC-14: route render under build
