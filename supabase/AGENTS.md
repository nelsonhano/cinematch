# Supabase database

## Overview

The Postgres schema for CineMatch, kept as SQL migrations. Holds users' profiles, ratings, taste profiles, watchlists, groups, and import jobs, plus a cached TMDB movie catalog with pgvector embeddings.

## Key files

| File | Owns |
|---|---|
| `migrations/00001_initial_schema.sql` | All tables, indexes, RLS policies, the signup trigger, `match_movies` |
| `../types/database.ts` | Generated `Database` type used by every Supabase client |

## Conventions

- Add schema changes as a new numbered file (`00002_<name>.sql`); never edit an applied migration.
- After a schema change, regenerate `types/database.ts` (Supabase CLI `gen types typescript`) so the typed clients stay correct.
- Every user owned table gets RLS enabled plus policies keyed on `auth.uid() = user_id` (or `id` for `profiles`).
- `movies` and `watch_providers` are public read; only the service role writes them (cron, scripts).

## Gotchas

- Signup trigger `handle_new_user` creates the `profiles` and `taste_profiles` rows. Do not insert them from app code. A "send once" flag (like the planned welcome email) belongs on `profiles`.
- `groups` has a SELECT policy but RLS is never enabled on `groups` or `group_members` in the migration, so the policy has no effect today. App code reaches them through the admin client.
- `movies.id` (serial) and `movies.tmdb_id` are different keys: `watchlist.movie_id` points to `movies.id`, while most API inputs and TMDB use `tmdb_id`.
- `embedding vector(1536)` with an ivfflat index; `match_movies(query_embedding, match_threshold, match_count)` is the similarity search RPC.

## Agent skills

- [supabase-postgres-best-practices](../.agents/skills/supabase-postgres-best-practices/): `supabase/agent-skills`, schema, RLS, indexes, pgvector

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
