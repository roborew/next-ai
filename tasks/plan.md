# Implementation Plan: Per-user chat history (Better Auth + one persisted conversation)

## Statement of intent (confirmed)

- **Outcome:** `/chat` becomes personal: users sign up / sign in with email + password via Better Auth, and on load the chat shows their own last 20 messages; new messages are saved as the reply streams.
- **User:** A returning, signed-in visitor who expects their conversation to still be there.
- **Why now:** The chat is stateless today — a refresh or new tab loses everything, and there is no notion of whose history it is.
- **Success:** Sign up → chat a few turns → refresh (or sign in from another browser) → the same last 20 messages render. A second account sees only its own messages.
- **Constraint:** Least files / least complexity. Better Auth built-ins only (no email verification, no OAuth, no password reset). One conversation per user, capped at 20 stored messages, no new infrastructure.
- **Out of scope:** Multiple conversations or a thread list; rename/delete/clear-history UI; message editing; email verification and password reset; OAuth providers; per-user rate limiting (the existing IP limiter stays as-is); streaming resumability; search.

## Overview

Add authentication with Better Auth (email + password, Drizzle adapter over the existing Postgres pool), guard `/chat` behind a session, and persist exactly one chat history per user in a `chat_history` table. The history is stored as a `jsonb` array of AI SDK `UIMessage` objects and trimmed to the newest 20 entries. The chat page (a Server Component) loads the session and history and hands them to the existing `useChat` client component as initial messages; `/api/chat` becomes session-aware, loads the stored history server-side, appends the incoming user message, streams the reply, and saves the trimmed result when the stream finishes.

## Architecture Decisions

- **Better Auth 1.x, email + password only.** `emailAndPassword.enabled: true`, no `socialProviders`, no `emailVerification`, no plugins. This is the whole auth feature: sign up, sign in, sign out, session cookie.
- **Drizzle adapter over the existing `db`** (`better-auth/adapters/drizzle`, `provider: "pg"`). No second connection pool; `src/db/index.ts` stays untouched.
- **Auth tables are generated, then committed.** `npx auth@latest generate` writes a Drizzle schema file (`src/db/auth-schema.ts`), which `src/db/schema.ts` re-exports so `drizzle-kit` (configured with `schema: "./src/db/schema.ts"`) picks it up. `user.id` is a **text** id in Better Auth's default schema — the `chat_history.user_id` column is therefore `text`, not `uuid`.
- **Session checks in Server Components, not middleware.** No `middleware.ts`. `/chat` calls `auth.api.getSession({ headers: await headers() })` and `redirect("/login")` when absent. `/api/chat` returns 401 for the same case. Fewer files, and it keeps the guard next to the data it protects.
- **Single login page.** `/login` is one client page with a sign-in / sign-up toggle, plus a sign-out button on `/chat`. Both talk to `authClient` from `src/lib/auth-client.ts`.
- **One row per user, `jsonb` messages.** `chat_history` has a `unique` `user_id`, a `messages jsonb`, and `updated_at`. No per-message rows: one table, one upsert, no ordering or orphan concerns. Trimming is `messages.slice(-20)` on save, so the cap counts messages (each user prompt and each assistant reply is one).
- **Server-authoritative history.** `/api/chat` loads the stored history itself and appends the newly sent message from the request body (`{ message }`, the documented AI SDK v7 payload) instead of trusting a client-supplied full history.
- **Persistence point is `toUIMessageStream({ originalMessages, onEnd })`** — the AI SDK v7 documented hook; `onEnd` receives the complete `UIMessage[]` including the finished assistant reply.
- **TDD throughout.** Behavioural tasks are red → green → refactor. Unit/component tests are colocated (`*.test.ts(x)`, `pnpm test`); e2e is Playwright against an isolated database (`pnpm test:e2e`).

## Task List

Tracked in `tasks/todo.md` (no external tracker configured).

- **Phase 1 — Auth foundation:** Tasks 1–2
- **Phase 2 — Persistence core:** Tasks 3–4
- **Phase 3 — UI + end-to-end:** Tasks 5–6

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `better-auth`'s Drizzle adapter vs. the pinned `drizzle-orm@1.0.0-rc.4` | High (blocker at install/adapter) | Check peer range before wiring; if incompatible, use Better Auth's built-in Kysely adapter against the same `DATABASE_URL` (one extra dependency, no schema-file change) and record the deviation here. |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` missing in dev or CI | High (auth throws at runtime/build) | Document both in the plan and in `.env.example`; e2e passes an explicit `BETTER_AUTH_URL` and a test-only secret through `playwright.config.ts` `webServer.env`. |
| Next.js 16.4.1 differs from trained knowledge | Medium | Read `node_modules/next/dist/docs/` before writing Next-specific code (per `AGENTS.md`); mirror existing patterns (`async headers()`, async `params`, `redirect`). |
| `toUIMessageStream.onEnd` is not awaited before the response ends | Medium (lost last turn) | Use an `async` `onEnd` and save with a single upsert; if flakiness appears, move the save into `streamText`'s `onFinish` using the accumulated messages. Verify with the e2e/manual check. |
| E2E harness leaks auth rows / foreign-key errors | Medium (flaky suite) | Add `"user", "session", "account", "verification", "chat_history"` to the truncate list in `tests/e2e/global-setup.ts` and `global-teardown.ts`. |
| `/chat` guard breaks the existing navigation e2e spec | Low (expected change) | Update `tests/e2e/navigation.spec.ts` to assert the signed-out redirect to `/login`; auth flow is covered by the new spec. |
| Signed-in users now hit the IP rate limit together behind a proxy | Low | Unchanged behaviour; per-user limits are explicitly out of scope. |

## Implementation Notes

Deviations found while building, recorded after the plan was approved:

- **`relations()` is gone in `drizzle-orm@1.0.0-rc.4`.** The Better Auth CLI emitted a schema using the old `relations` helper, which made `drizzle-kit generate` fail with `relations is not a function`. The generated relation exports were dropped; only the tables are kept (`defineRelations` in `src/db/index.ts` remains the relations mechanism).
- **The Drizzle adapter needs the schema passed explicitly.** Without `drizzleAdapter(db, { provider: "pg", schema })`, Better Auth could not see the auth tables at runtime and every `/chat` render failed with `SCHEMA_MISMATCH`.
- **`/chat` needs `export const instant = false`.** Next 16's Cache Components build fails on a route that reads `headers()` without a Suspense boundary or an opt-out; the page is now a dynamic (`ƒ`) route.
- **`useChat` posts `{ id, messages, trigger, messageId }`, not `{ message }`.** The SDK's bundled persistence doc shows `{ message, id }`, but the installed `DefaultChatTransport` sends the whole message list. The route now reads `messages`, 400s when it is missing, and merges it against the stored history by message id (stored history first, then any messages the database has not seen yet — e.g. a turn whose `onEnd` never completed).
- **Assistant replies need generated ids.** Without `generateMessageId`, the saved assistant message gets `id: ""`, which defeats the id-based merge. The stream now uses `generateMessageId: generateId`.

## Open Questions

- Should `/` or the nav show whether a user is signed in? Out of scope for this pass; nav is untouched except for the chat page's own sign-out button.
- Is a "clear history" affordance wanted later? Not now; the 20-message trim is the only pruning.
- E2E deliberately does **not** call the model (cost + API key availability): persistence is covered by unit/integration tests, and e2e covers sign-up, guard, and sign-out.
