# Tasks: Per-user chat history (Better Auth + one persisted conversation)

Plan: `tasks/plan.md`. Every behavioural task follows TDD (red → green → refactor).
Commands (from repo root): `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm test:e2e`, `pnpm db:generate`, `pnpm db:migrate`.

## Task 1: Install and configure Better Auth (schema + handler)

**Description:** Add `better-auth`, create the server instance in `src/lib/auth.ts` (email + password enabled, Drizzle adapter over the existing `db`, `provider: "pg"`), mount the catch-all route `src/app/api/auth/[...all]/route.ts` with `toNextJsHandler`, generate the auth tables with `npx auth@latest generate` into `src/db/auth-schema.ts`, and re-export them from `src/db/schema.ts` so `drizzle-kit` sees them. Document `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `.env.example` and generate + apply the migration.

**Acceptance criteria:**

- [x] `src/lib/auth.ts` exports `auth` = `betterAuth({ database: drizzleAdapter(db, { provider: "pg" }), emailAndPassword: { enabled: true } })` — no social providers, no verification, no plugins.
- [x] `src/app/api/auth/[...all]/route.ts` exports `GET` and `POST` from `toNextJsHandler(auth)`.
- [x] `src/db/schema.ts` re-exports the generated `user`, `session`, `account`, `verification` tables; a migration under `drizzle/` creates them.
- [x] `.env.example` documents `BETTER_AUTH_SECRET` (32+ chars) and `BETTER_AUTH_URL`.
- [x] `src/db/index.ts` is unchanged (same pool, no second connection).

**Verification:**

- [x] `pnpm db:generate` produces an auth-tables migration; `pnpm db:migrate` applies it against the dev DB.
- [x] `pnpm test` green; `pnpm build` succeeds.
- [x] Manual: `GET /api/auth/ok` returns 200 from `pnpm dev`.

**Dependencies:** None
**Files likely touched:** `package.json`, `src/lib/auth.ts` (new), `src/app/api/auth/[...all]/route.ts` (new), `src/db/auth-schema.ts` + `drizzle/**` (generated), `src/db/schema.ts`, `.env.example`
**Estimated scope:** Medium (generated files excluded)

## Task 2: Sign-in / sign-up page and sign-out

**Description:** Add `src/lib/auth-client.ts` (`createAuthClient()` from `better-auth/react`) and a single `/login` client page with a sign-in ⇄ sign-up toggle (email + password, labelled fields, inline error from `authClient`). Successful auth redirects to `/chat`; add a "Sign out" button to the existing chat UI that calls `authClient.signOut()` then navigates to `/login`. The page must not crash when `useSession` is still loading.

**Acceptance criteria:**

- [x] `/login` submits `authClient.signUp.email` in sign-up mode and `authClient.signIn.email` in sign-in mode, with required email/password fields and a visible error on failure.
- [x] Toggle switches modes without a reload; submit button label matches the mode.
- [x] Successful auth navigates to `/chat`; sign-out clears the session and navigates to `/login`.
- [x] Component test (mocked `authClient`) covers: mode toggle, successful submit navigates, failed submit shows the error.

**Verification:**

- [x] Failing test first (red), then `pnpm test` green.
- [x] Manual: create an account, sign out, sign back in — session persists across reload.

**Dependencies:** Task 1
**Files likely touched:** `src/lib/auth-client.ts` (new), `src/app/login/page.tsx` (new), `src/app/login/page.test.tsx` (new), `src/app/chat/page.tsx`
**Estimated scope:** Medium

## Checkpoint: After Tasks 1–2

- [x] An account can be created, signed into, and signed out; `/chat` is not yet guarded.
- [x] `pnpm test` and `pnpm build` pass.

## Task 3: `chat_history` table and data layer

**Description:** Add a `chat_history` Drizzle table and `src/lib/chat-history.ts` with `getChatHistory(userId)` and `saveChatHistory(userId, messages)`. The table has a `text` `user_id` (Better Auth ids are text) that is `unique` and references `user.id` with `ON DELETE CASCADE`, a `jsonb` `messages` column typed as `UIMessage[]`, and `updated_at`. Saving upserts on the unique `user_id` and keeps only the newest 20 messages. Generate and apply the migration.

**Acceptance criteria:**

- [x] `getChatHistory` returns `[]` for a user with no row and the stored array otherwise.
- [x] `saveChatHistory` inserts on first save and updates the existing row afterwards (`onConflictDoUpdate`), always setting `updated_at`.
- [x] Saving more than 20 messages stores exactly the newest 20, in order.
- [x] Table has `user_id` unique + FK to `user.id` with cascade delete; migration committed.

**Verification:**

- [x] Data-layer tests with mocked `db` (red first), then `pnpm test` green.
- [x] `pnpm db:generate` + `pnpm db:migrate` succeed against the dev DB.

**Dependencies:** Task 1 (user table)
**Files likely touched:** `src/db/schema.ts`, `src/lib/chat-history.ts` (new), `src/lib/chat-history.test.ts` (new), `drizzle/**` (generated)
**Estimated scope:** Small

## Task 4: `/api/chat` requires a session and persists the turn

**Description:** Make `POST /api/chat` session-aware: resolve the session from the request headers (`auth.api.getSession`), return 401 without one (before rate limiting), load the stored history, append the newly submitted message from the body (`{ message }`), stream the reply with `originalMessages` set, and save the trimmed message list in `onEnd`. The IP rate limiter and its configuration stay unchanged.

**Acceptance criteria:**

- [x] No session → 401 and neither `streamText` nor `convertToModelMessages` is called.
- [x] With a session → `getChatHistory(session.user.id)` is read, the incoming message is appended, and the model receives the combined history.
- [x] `onEnd` calls `saveChatHistory` with the completed message list (including the assistant reply); a >20-message result is trimmed to 20.
- [x] Existing rate-limit tests (10/min sliding window, 429 + `Retry-After`, IP from `x-forwarded-for`) still pass.

**Verification:**

- [x] Route tests updated/extended with mocked `auth` and `@/lib/chat-history` (red first), then `pnpm test` green.

**Dependencies:** Tasks 1, 3
**Files likely touched:** `src/app/api/chat/route.ts`, `src/app/api/chat/route.test.ts`
**Estimated scope:** Small

## Checkpoint: After Tasks 3–4

- [x] A signed-in request to `/api/chat` persists the turn; a signed-out request gets 401.
- [x] `pnpm test` green.

## Task 5: Chat page loads the user's history

**Description:** Split the chat route into a Server Component page and a client component. `src/app/chat/page.tsx` resolves the session, redirects to `/login` when absent, loads `getChatHistory(user.id)`, and renders `<Chat initialMessages={...} />`. `src/app/chat/chat.tsx` holds the existing `useChat` UI (now seeded with `messages: initialMessages`) plus the sign-out button; its tests move with it.

**Acceptance criteria:**

- [x] `/chat` without a session redirects to `/login` (covered by a page test with mocked `auth`/`redirect`).
- [x] `/chat` with a session renders the chat seeded with the stored messages; no history renders the empty state.
- [x] Client component still renders role labels, ignores non-text parts, updates input, and sends on submit (existing assertions preserved).
- [x] No `useChat` call on the server; `headers()`/`redirect` used per the Next 16 async APIs.

**Verification:**

- [x] Page guard test + moved client tests (red first), then `pnpm test` green.
- [x] `pnpm build` succeeds.
- [x] Manual: send a message, reload `/chat`, message pair is still there.

**Dependencies:** Tasks 2, 3, 4
**Files likely touched:** `src/app/chat/page.tsx`, `src/app/chat/chat.tsx` (new), `src/app/chat/chat.test.tsx` (moved from `page.test.tsx`), `src/app/chat/page.test.tsx`
**Estimated scope:** Medium

## Task 6: E2E for auth and the chat guard

**Description:** Update the Playwright harness for auth: add the auth and chat tables to the truncate lists, pass `BETTER_AUTH_URL` and a test-only `BETTER_AUTH_SECRET` to the e2e server, and add a spec covering sign-up → `/chat` → reload → sign-out → `/login`, plus the signed-out redirect. Update the existing navigation spec, which currently expects `/chat` to render for anonymous visitors.

**Acceptance criteria:**

- [x] `tests/e2e/global-setup.ts` and `global-teardown.ts` truncate `"user", "session", "account", "verification", "chat_history"`.
- [x] `playwright.config.ts` supplies `BETTER_AUTH_URL` (= base URL) and a test-only `BETTER_AUTH_SECRET` to the web server.
- [x] New spec signs up with a unique email, lands on `/chat`, reloads and stays signed in, signs out, and ends on `/login`.
- [x] `navigation.spec.ts` asserts the signed-out Chat link redirects to `/login` instead of `/chat`.
- [x] Specs do not call the AI model (no API key / cost dependency).

**Verification:**

- [x] `pnpm test:e2e` green against a reachable database (dev server is started by Playwright).
- [x] `pnpm test` and `pnpm build` still pass.

**Dependencies:** Tasks 1–5
**Files likely touched:** `tests/e2e/global-setup.ts`, `tests/e2e/global-teardown.ts`, `tests/e2e/navigation.spec.ts`, `tests/e2e/auth.spec.ts` (new), `playwright.config.ts`
**Estimated scope:** Medium

## Checkpoint: Complete

- [x] All acceptance criteria met; `pnpm test`, `pnpm build`, `pnpm test:e2e` green.
- [x] Manual two-account check: each account sees only its own last 20 messages.
- [x] Ready for review.
