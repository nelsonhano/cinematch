# Scope: CineMatch

CineMatch is a movie recommendation app. People rate films, get recommendations tuned to their taste, keep a watchlist, and pick movies together in groups. This slice replaces the unused Resend email package with Nodemailer and adds the app's first real transactional emails.

**Build approach:** Tracer Bullet (each feature is built end to end and actually works, narrow first, then thickened).
**Workflow:** Beta (after `/develop`, run `/check verify`, then `/test`). This is the project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but you can skip it when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Auth (email, GitHub, callback) | Existing | existing |
| B | Onboarding | Existing | existing |
| C | Discover & recommendations | Existing | existing |
| D | Movie details & streaming | Existing | existing |
| E | Watchlist | Existing | existing |
| F | Groups | Existing | in-progress |
| G | Import from other services | Existing | existing |
| H | Profile & settings | Existing | existing |
| I | Billing (Stripe) | Existing | existing |
| J | Movie catalog sync (cron) | Existing | existing |
| 1 | Coding standards & tooling | Foundation | planned |
| 2 | Email sender (Resend to Nodemailer) | Slice 1 | in-progress |
| 3 | Welcome email | Slice 1 | planned |
| 4 | Password reset flow | Slice 2 | planned |
| 5 | Group invite email | Slice 3 | planned |
| 6 | Billing emails | Slice 4 | planned |

## Already built

Enrolled for context from a light code scan. `existing` rows predate this workflow, so `/develop` and `/sync` leave them alone.

### A. Auth (email, GitHub, callback) · existing
Email and password signup and login, GitHub sign in, and the Supabase auth callback. Supabase sends the signup confirmation email itself. code in `app/(auth)/`, `lib/supabase/`, `middleware.ts`

### B. Onboarding · existing
Genre and streaming service pickers plus swipe cards to seed a new user's taste. code in `app/(app)/onboarding/`, `components/onboarding/`

### C. Discover & recommendations · existing
AI recommendations based on taste profile and embeddings, with explanations. code in `app/(app)/discover/`, `app/api/recommend/`, `lib/ai/`

### D. Movie details & streaming · existing
Movie pages, search, trending, and where to stream. code in `app/(app)/movie/`, `app/api/movies/`, `app/api/streaming/`, `lib/tmdb/`

### E. Watchlist · existing
Save and manage movies to watch. code in `app/(app)/watchlist/`, `app/api/watchlist/`

### F. Groups · in-progress
Creating a group and sharing its invite code works. Joining is still a stub: the join form only shows an alert, and the shared `/group/join?code=` link has no page. Finish joining via `/develop groups` before the group invite email. code in `app/(app)/group/`, `app/api/group/`, `components/group/`

### G. Import from other services · existing
Upload, preview, and confirm a ratings import from another service. code in `app/(app)/import/`, `app/api/import/`, `lib/import/`

### H. Profile & settings · existing
Taste profile view (radar chart) and account settings. code in `app/(app)/profile/`, `app/(app)/settings/`, `app/api/taste/`

### I. Billing (Stripe) · existing
Pro plan checkout and a subscription webhook (checkout completed, subscription updated, subscription deleted). code in `lib/stripe/`, `app/api/webhooks/stripe/`

### J. Movie catalog sync (cron) · existing
Scheduled TMDB sync plus seed and embedding scripts. code in `app/api/cron/sync-movies/`, `lib/tmdb/sync.ts`, `scripts/`

## Foundations

### 1. Coding standards & tooling
There is no root `AGENTS.md` yet, so record the real conventions (Next.js App Router, Supabase, Stripe, the AI layer) before new features lean on them.
**Done when:** root `AGENTS.md` describes the real stack and conventions, and lint and typecheck run clean.
- [ ] Capture conventions and tooling choices: `/audit`

## Slice 1: Nodemailer sender plus the first real email

### 2. Email sender (Resend to Nodemailer) · in-progress
Remove the unused Resend package and add one shared, server only Nodemailer sender that every later email goes through.
**Done when:** `resend` is gone from dependencies and `.env.local.example`; SMTP settings come from env vars; there is one server only send function; it fails with a clear error when the env is missing and never runs in client code.
spec [0001](../specs/0001-email-sender/index.md) · code in `lib/email/`
- [x] Design it (spec): `/architect email sender`
- [ ] Build it: `/develop email sender`
  - [ ] Swap Resend for Nodemailer and React Email, and get a first real email into your inbox with the test script (AC-1, AC-2, AC-4, AC-10)
  - [x] Server only entry `@/lib/email`, proven to block client imports and to render inside a Next build (AC-3, AC-14)
  - [x] The never throws contract: recipient and config checks, timeouts, masked and redacted logs (AC-5, AC-6, AC-7, AC-8)
  - [x] Typed template registry, shared light layout with button, preview server, clean typecheck and lint (AC-9, AC-11, AC-12, AC-13)
- [ ] Verify it: `/check verify email sender`
- [ ] Test it: `/test email sender`

### 3. Welcome email · needs a decision
The first real email, which proves the sender end to end: a new user gets a welcome message once their account is confirmed.
**Done when:** confirming a new account sends exactly one welcome email (never again on later logins); a failed send never blocks sign in and is logged.
- [ ] Design it (spec): `/architect welcome email`

## Slice 2: Password reset

### 4. Password reset flow · needs a decision
A forgot password page and a set new password page. Supabase sends the reset email, not Nodemailer.
**Done when:** a user can request a reset from the login page, follow the emailed link, set a new password, and sign in with it; unknown emails get the same neutral message.
- [ ] Design it (spec): `/architect password reset flow`

## Slice 3: Group invites

### 5. Group invite email · needs a decision
Let a group member email the invite link to a friend, next to the current copy link button. Depends on F (Groups) joining actually working.
**Done when:** a member can enter an email address and the friend receives a working join link; sending is rate limited and the address is validated.
- [ ] Design it (spec): `/architect group invite email`

## Slice 4: Billing emails

### 6. Billing emails · needs a decision · GA
Notify users when they subscribe, when their plan changes, and when it is canceled, triggered from the existing Stripe webhook.
**Done when:** each handled webhook event sends at most one matching email (no duplicates when Stripe retries the webhook), and a failed send never breaks webhook handling.
- [ ] Design it (spec): `/architect billing emails`

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle:**

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` at spec capture | `Design it` ticked; spec linked; `Build it: /develop <feature>` + 2 to 5 milestones; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA) |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | you, when you decide it is; `/sync` reconciles | the tier's last stage (`Prototype` after `/develop`; `Alpha` after `/check verify`; `Beta`/`GA` after `/test`) is the suggested point to call it done |

- **Next step** = the first unticked box.
- **needs a decision** = run `/architect` first; otherwise go straight to `/develop` (or `/audit` for standards and tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here.** The scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (built before this workflow) and `dropped` (taken out of scope, kept for history).
- **Workflow tier tag** beside a heading (e.g. `· GA`) sets that one feature's rigor above or below the project default; no tag means it inherits the default.
- **Workflow** (header line): **Prototype** = nothing after `/develop`; **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link is added by `/architect`, the code path by `/develop`.
