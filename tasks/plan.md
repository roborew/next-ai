# Implementation Plan: Flashcards — card set management (Server Actions + Server Components)

## Overview

Complete the flashcards feature on the `/cards` pages using Server Actions and Server Components only (no REST API): relate cards to card sets in the database schema, make card sets selectable on the cards page, view a set's flashcards with click-to-reveal, add cards to a set from a small form on the set page, and rename a set from an edit page. Remove the duplicated data paths (REST route + client fetcher, legacy `/cards/old` playground) so Server Actions + Server Components are the single mechanism.

## Architecture Decisions

- **Server Actions over API routes** (user decision). All mutations go through server actions in `src/lib/actions.ts` (zod-validated, `revalidatePath` + `redirect`); reads go through `src/lib/data.ts` consumed by Server Components. `/api/cardsets` and `ListCardSetsApi` are deleted.
- **Route structure**
  - `/cards` — list of card sets as links + "Create New Cardset" link + `<h1>Cards</h1>`.
  - `/cards/new` — create-set form; success redirects to the new set's page.
  - `/cards/[id]` — set page: name, flip cards, add-card form, "Edit Card Set" link.
  - `/cards/[id]/edit` — rename form; success redirects back to `/cards/[id]`.
- **Schema**: `cards.card_set_id` uuid NOT NULL → `card_sets.id`, ON DELETE CASCADE. Orphaned `cards` rows (cards exist today with no set) are dev data and get deleted during the migration.
- **Reuse existing components**: `Card` (flip, tested), `CardSet` (renders card list), `CardSetForm` (create/edit, tested). `CardForm.tsx` (currently an empty file) becomes the add-card form.
- **TDD**: every behavioral task is red → green → refactor. Unit tests are colocated (`*.test.ts(x)`) and run by vite-plus/vitest (`pnpm test`); e2e is Playwright (`pnpm test:e2e`).

## Task List

Tracked in `tasks/todo.md` (no external tracker configured).

- Phase 1 — Foundation & cleanup: Tasks 1–2
- Phase 2 — Browsing flow: Tasks 3–4
- Phase 3 — Management flows: Tasks 5–7
- Phase 4 — End-to-end journey: Task 8

## Risks and Mitigations

| Risk                                                                                         | Impact                       | Mitigation                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` / Postgres unreachable in the working environment                             | High (migration apply + e2e) | `drizzle-kit generate` works offline. Applying the migration and running e2e require a reachable DB; if missing, report blocked rather than faking it.                                               |
| Existing `cards` rows have no card set                                                       | Low (dev data)               | Delete orphaned rows in the migration before adding the NOT NULL FK column.                                                                                                                          |
| Next.js 16.4.1 differs from trained knowledge                                                | Medium                       | Read guides under `node_modules/next/dist/docs/` before writing Next-specific code (per `AGENTS.md`); mirror existing in-repo Next 16 patterns (`useActionState`, async `params`, `revalidatePath`). |
| `redirect()` throws in unit tests                                                            | Low                          | Mock `next/navigation` (`redirect`) and `next/cache` (`revalidatePath`) in action tests, matching existing `vi.mock` conventions.                                                                    |
| `updateCardSet` is currently broken — the edit form never sends `id`/`createdAt`/`updatedAt` | Certain                      | Fixed deliberately in Task 7 with a failing test first (hidden `id` field).                                                                                                                          |
| drizzle-orm 1.0.0-rc.4 / zod 4 API differences                                               | Medium                       | Verify exact APIs against installed packages in `node_modules` before use.                                                                                                                           |

## Open Questions

- Card deletion / editing individual cards is out of scope for this pass (user asked for create + add + select + edit set only). Can follow the same patterns later.
- `CardSetProps` PascalCase props (`SetName`, `CardList`) kept as-is to avoid churn; rename is optional polish later.
