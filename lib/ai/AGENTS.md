# AI layer

## Overview

The recommendation brain: turns a user query plus taste profile into ranked, explained movie picks. It embeds the query (OpenAI), finds candidates with pgvector (`match_movies`), asks Claude to pick and explain, then validates the output against the candidate list.

## Key files

| File | Owns |
|---|---|
| `anthropic.ts` | Shared Claude client, `generateCompletion` and `generateJSON<T>` |
| `embeddings.ts` | OpenAI `text-embedding-3-small` (1536 dims) via raw `fetch`, movie embedding text |
| `recommend.ts` | Full pipeline: parse query → embed → `match_movies` RPC → Claude → validate |
| `taste-analyzer.ts` | Builds the taste profile and summary from ratings |
| `validators.ts` | Keeps Claude output to real candidates, backfills, sanitizes explanations |
| `prompts/*.ts` | One `build*Prompt` function per prompt (recommend, explain, group merge, taste summary) |

## Conventions

- Prompts are plain template string builders in `prompts/`, one file each, typed params in, string out. Keep prompt text out of routes.
- Structured output goes through `generateJSON<T>`, which appends a "JSON only" instruction and strips code fences before `JSON.parse`. Always run the result through `validators.ts` so Claude can never return a movie that was not a candidate.
- Server only: this folder reads `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and the Supabase service role key. Never import it from a client component.

## Gotchas

- Model IDs are hardcoded strings in several places (`anthropic.ts`, `recommend.ts`, `taste-analyzer.ts`, and the recommend routes that log `model_used`). Change them together. `recommend.ts` uses `claude-haiku-4-20250514`, which is worth checking against the current model list.
- `recommend.ts` and `taste-analyzer.ts` build their own service role client with `@supabase/supabase-js` instead of `lib/supabase/admin.ts`.
- Embedding size (1536) must match `vector(1536)` in the migration and `match_movies`. Changing the model means a migration plus rerunning `scripts/generate-embeddings.ts`.
- `generateJSON` throws on malformed JSON; callers must handle it.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
