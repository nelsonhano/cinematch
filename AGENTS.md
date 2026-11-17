# CineMatch

AI movie recommendations: rate films, get taste tuned picks, keep a watchlist, pick movies together in groups.

## Stack

- **Language / Runtime**: TypeScript (strict), Node on Vercel
- **Framework**: Next.js 16 App Router, React 19, Tailwind CSS v4 with Radix UI primitives in `components/ui/` (shadcn style)
- **Key dependencies**: Supabase (`@supabase/ssr`, Postgres + pgvector), Anthropic SDK (Claude), OpenAI embeddings via `fetch`, Stripe, TMDB API, Zod v4, Zustand
- **Package manager**: npm
- Planned: Nodemailer replaces the unused `resend` package (see `docs/scope/scope.md`). `posthog-js` is installed but not wired up yet.

## Build approach

**Tracer Bullet**: each feature is built end to end and actually works, narrow first, then thickened.

## Commands

```bash
npm install
npm run dev          # dev server (Turbopack)
npm run build
npm run lint         # ESLint 9, next core-web-vitals + typescript
npm run typecheck    # tsc --noEmit
npx tsx scripts/<name>.ts   # one off scripts: sync-tmdb, generate-embeddings, seed-onboarding
```

No test runner is set up yet.

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`. Scope lives in `docs/scope/scope.md`.

## Rules

- Import with the `@/` alias (maps to the repo root), never long relative paths (scripts in `scripts/` are the exception).
- Folders by role: `app/` routes, `components/<feature>/` UI, `hooks/use-*.ts` client data hooks, `stores/*-store.ts` Zustand, `lib/<integration>/` server logic, `types/` shared types. Files are kebab case.
- Pages under `app/(app)/` are client components (`'use client'`) that call `/api/*` with `fetch`, usually through a hook in `hooks/`. Data access and secrets stay in route handlers and `lib/`.
- Pick the right Supabase client: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (route handlers, server components, cookie session), `lib/supabase/admin.ts` (service role, bypasses RLS, server only).
- Validate request bodies with Zod `safeParse`; reply with `{ error: string }` plus the right status code.
- Read secrets from `process.env`; keep `.env.local.example` in sync whenever you add or remove a variable.
- Merge Tailwind classes with `cn()` from `lib/utils.ts`; reuse `components/ui/` primitives before writing new ones.
- Run `npm run lint` and `npm run typecheck` before you call a change done. Lint currently reports 1 error (`app/(app)/profile/page.tsx`, impure call during render) and about 21 warnings.

## Gotchas

- `middleware.ts` lets every `/api/*` path through without a session. Each route handler must check `supabase.auth.getUser()` itself.
- `lib/utils.ts` (just `cn`) and the `lib/utils/` folder (helpers, constants, rate limit) both exist; import from the right one.
- The app is dark only (`className="dark"` on `<html>`).
- Vercel cron hits `/api/cron/sync-movies` daily at 03:00 UTC (`vercel.json`), guarded by `CRON_SECRET`.

## Agent skills

- [nextjs-app-router-patterns](.agents/skills/nextjs-app-router-patterns/): `wshobson/agents`, App Router routes, server vs client components
- [tailwind-4-docs](.agents/skills/tailwind-4-docs/): `lombiq/tailwind-agent-skills`, Tailwind v4 syntax and config
- [zod](.agents/skills/zod/): `pproenca/dot-skills`, Zod schemas and validation
- [zustand](.agents/skills/zustand/): `lobehub/lobehub`, Zustand store patterns
- [framer-motion-animator](.agents/skills/framer-motion-animator/): `patricio0312rev/skills`, Framer Motion animation
- [recharts](.agents/skills/recharts/): `andy-spike/skills`, Recharts charts (taste radar)
- [posthog-instrumentation](.agents/skills/posthog-instrumentation/): `posthog/posthog-for-claude`, PostHog analytics wiring

MCP servers: supabase (plugin, needs auth), stripe (plugin, needs auth), vercel (plugin, needs auth), next-devtools (recommended), shadcn (recommended), posthog (recommended)

## Context files

- [app/api/AGENTS.md](app/api/AGENTS.md): route handler pattern, auth, Stripe webhook, cron
- [lib/ai/AGENTS.md](lib/ai/AGENTS.md): Claude recommendation pipeline, prompts, embeddings
- [supabase/AGENTS.md](supabase/AGENTS.md): schema, RLS, migrations, generated types

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
