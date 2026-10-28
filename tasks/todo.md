# Tasks: Flashcards — card set management

Plan: `tasks/plan.md`. Every behavioral task follows TDD (red → green → refactor).
Commands (from repo root): `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm test:e2e`, `pnpm db:generate`, `pnpm db:migrate`.

## Task 1: Schema — relate cards to card sets

**Description:** `cards` currently has no link to `card_sets`. Add a `cardSetId` column (`card_set_id` uuid NOT NULL, references `card_sets.id`, ON DELETE CASCADE), generate the drizzle migration, and apply it.

**Acceptance criteria:**

- [x] `src/db/schema.ts` declares the FK with cascade delete.
- [x] A migration exists under `drizzle/` adding the column, with orphaned dev rows cleaned first.
- [x] Migration applied when a DB is reachable (otherwise reported as blocked).

**Verification:**

- [x] `pnpm db:generate` produces the migration.
- [x] `pnpm db:migrate` (or `db:push`) succeeds against the dev DB.
- [x] `pnpm test` still green.

**Dependencies:** None
**Files likely touched:** `src/db/schema.ts`, `drizzle/**` (generated)
**Estimated scope:** Small

## Task 2: Remove API + legacy duplication

**Description:** The card-set list is fetched twice (Server Component + REST/client fetch) and a legacy playground page exists. Keep the Server Actions + Server Components path only.

**Acceptance criteria:**

- [x] `src/app/api/cardsets/route.tsx`, `ListCardSetsApi.tsx` + `ListCardSetsApi.test.tsx`, `cards/old/page.tsx` deleted.
- [x] `getCardSets()` removed from `src/lib/actions.ts` (duplicates `listCardSets`).
- [x] `/cards` page renders only the Server Component list (no "API Request" section).

**Verification:**

- [x] `pnpm test` green.
- [x] `pnpm build` succeeds.
- [x] `pnpm lint` reports no new issues from these changes.

**Dependencies:** None
**Files likely touched:** the files above + `src/app/cards/page.tsx`
**Estimated scope:** Small

## Checkpoint: After Tasks 1–2

- [x] Tests pass, build clean, duplication gone.

## Task 3: Card sets are selectable

**Description:** The sets on `/cards` are inert divs. Turn each into a link to its detail page `/cards/{id}`, show an empty state when there are no sets, and add the `<h1>Cards</h1>` heading the e2e spec expects.

**Acceptance criteria:**

- [x] Each card set renders as a link with `href="/cards/{id}"`.
- [x] Friendly empty-state message when the list is empty.
- [x] `/cards` renders an `<h1>Cards</h1>`.

**Verification:**

- [x] Focused test first (red): `ListCardSets.test.tsx` asserts links + empty state.
- [x] `pnpm test` green after implementation.

**Dependencies:** None (Task 4 makes the link targets real.)
**Files likely touched:** `ListCardSets.tsx`, `ListCardSets.test.tsx`, `src/app/cards/page.tsx`
**Estimated scope:** Small

## Task 4: Card set detail page `/cards/[id]`

**Description:** Server Component page that shows a set's name, its flashcards (click-to-reveal via existing `Card`/`CardSet`), an "Edit Card Set" link, and not-found handling for unknown ids. Adds `getCardSet(id)` and `listCardsForSet(id)` to the data layer.

**Acceptance criteria:**

- [x] `src/lib/data.ts` exports `getCardSet` and `listCardsForSet` (tested with mocked db).
- [x] `/cards/[id]` renders set name, its cards, "Edit Card Set" link to `/cards/[id]/edit`.
- [x] Unknown id → not-found handling (e.g. `notFound()`).
- [x] Next 16 async `params` used correctly.

**Verification:**

- [x] Data-layer tests (red first), detail-component test (render resolved output like `ListCardSets.test.tsx`).
- [x] `pnpm test` green; manual dev visit shows a set's cards.

**Dependencies:** Task 1 (FK), Task 3 (link targets).
**Files likely touched:** `src/lib/data.ts` (+ test), `src/app/cards/[id]/page.tsx`, `src/app/cards/_components/CardSetDetail.tsx` (+ test)
**Estimated scope:** Medium

## Checkpoint: After Tasks 3–4

- [x] Can browse `/cards` → select a set → see its flashcards.

## Task 5: Add cards to a set (`CardForm` + `createCard` action)

**Description:** Implement the empty `CardForm.tsx` as the add-card form (question + answer) and a `createCard` server action that validates, inserts with the set id, and revalidates the set page. Wire both into `/cards/[id]` so added cards appear.

**Acceptance criteria:**

- [x] `createCard` action: zod validation (set id, question, answer), insert, `revalidatePath`, error state; tested with mocked db.
- [x] `CardForm`: labelled required Question/Answer fields, submits via `useActionState`, shows action errors; tested in the style of `CardSetForm.test.tsx`.
- [x] Form rendered on `/cards/[id]`; submitted card appears in the list after revalidation.

**Verification:**

- [x] Action tests + component tests (red first), then `pnpm test` green.
- [x] Manual: add a card on the set page and see it appear.

**Dependencies:** Task 4.
**Files likely touched:** `src/lib/actions.ts` (+ test), `CardForm.tsx` (+ test), `src/app/cards/[id]/page.tsx`
**Estimated scope:** Medium

## Task 6: Create flow lands on the new set's page

**Description:** `createCardSet` currently redirects to `/cards`. Change it to insert with `.returning({ id })` and redirect to `/cards/{id}` so the user can immediately add cards.

**Acceptance criteria:**

- [x] Action test (red first) asserts `redirect("/cards/{newId}")`.
- [x] Implementation uses the returned id.

**Verification:**

- [x] `pnpm test` green; manual: create a set → land on its page.

**Dependencies:** Task 4 (target page exists).
**Files likely touched:** `src/lib/actions.ts` (+ test)
**Estimated scope:** Small

## Task 7: Edit card set (rename)

**Description:** Fix and finish the edit flow. `updateCardSet` currently validates `userId`/`createdAt`/`updatedAt` that the form never sends (so it always fails), and `CardSetForm` edit mode carries no hidden `id`. Validate only id + name, redirect back to the set page, add the hidden id, and add the edit page.

**Acceptance criteria:**

- [x] Failing test first: edit form carries a hidden `id` field.
- [x] `updateCardSet` validates id (uuid) + name only, updates, revalidates, redirects to `/cards/{id}`; tested (valid + invalid).
- [x] `/cards/[id]/edit` renders prefilled `CardSetForm`; rename reflected on `/cards` and the set page.

**Verification:**

- [x] Action + component tests (red first); `pnpm test` green.
- [x] Manual: rename a set end to end.

**Dependencies:** Task 4.
**Files likely touched:** `src/lib/actions.ts` (+ test), `CardSetForm.tsx` (+ test), `src/app/cards/[id]/edit/page.tsx`
**Estimated scope:** Medium

## Checkpoint: After Tasks 5–7

- [x] Full management loop works manually: create set → add cards → select → edit.

## Task 8: E2E user journey (Playwright)

**Description:** One spec covering the full user journey: create a set, land on its page, add cards, flip a card, go back to `/cards`, select the set, edit its name, see the update.

**Acceptance criteria:**

- [x] `tests/e2e/cardsets.spec.ts` covers: create → add ≥2 cards → flip reveals → select from `/cards` → rename.
- [x] Test data cleaned up or uniquely named so reruns are stable.

**Verification:**

- [x] `pnpm test:e2e` green (needs reachable DB; dev server auto-starts).

**Dependencies:** Tasks 1–7.
**Files likely touched:** `tests/e2e/cardsets.spec.ts`, maybe `tests/fixtures/**`
**Estimated scope:** Medium

## Checkpoint: Complete

- [x] All acceptance criteria met; suites green.
- [x] Ready for review.
