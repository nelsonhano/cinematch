# API routes

## Overview

All server endpoints live here as App Router route handlers (`route.ts`). The client pages call them with `fetch`; they own auth checks, validation, database access, and calls to Claude, TMDB, and Stripe.

## Key files

| File | Owns |
|---|---|
| `watchlist/route.ts` | Cleanest example of the standard handler shape (GET + POST) |
| `recommend/route.ts` | Solo recommendations: rate limit, taste profile, `lib/ai/recommend` |
| `group/[id]/recommend/route.ts` | Group recommendations merged across members |
| `import/*` | Upload, preview, confirm a ratings import (`lib/import/`) |
| `webhooks/stripe/route.ts` | Stripe subscription events → `profiles.plan` |
| `cron/sync-movies/route.ts` | Daily TMDB trending + watch provider sync |

## Conventions

- Handler shape: `try` → `await createClient()` from `@/lib/supabase/server` → `auth.getUser()`, return `401 { error: 'Unauthorized' }` on failure → Zod `safeParse` (400 with `details: parsed.error.flatten()`) → work → `NextResponse.json(...)`. Catch block logs with `console.error('<Area> error:', error)` and returns a generic 500 message.
- After the user check, handlers usually switch to `createAdminClient()` for queries. That bypasses RLS, so always filter by `user.id` yourself.
- Free plan limits go through `checkRateLimit` / `incrementRateLimit` in `lib/utils/rate-limit.ts`; Pro checks use `isPro` / `getPlan` from `lib/stripe/plans.ts`.
- Error responses are `{ error: string }`, success shapes are route specific (e.g. `{ watchlist }`, `{ success: true, item }`).

## Gotchas

- Middleware does not protect `/api/*`; a handler without its own `getUser()` check is public.
- Stripe webhook: read the raw body with `request.text()` before verifying the signature. It uses the eager `stripe` export from `lib/stripe/client.ts`, which is `null` when `STRIPE_SECRET_KEY` is missing; prefer `getStripe()` in new code. Stripe retries webhooks, so anything with side effects (like the planned billing emails) must be idempotent per event.
- The cron route skips the auth check entirely when `CRON_SECRET` is unset.
- Request schemas are often defined inline in the route even when `lib/validators/` has a similar one (e.g. recommend). Check both before changing a contract.

## Agent skills

- [stripe-best-practices](../../.agents/skills/stripe-best-practices/): `stripe/ai`, Stripe webhooks, subscriptions, key handling

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
