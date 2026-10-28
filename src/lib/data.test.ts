import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { getCardSet, listCardsForSet } from "./data";

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }));

vi.mock("@/db", () => ({
  db: { select: selectMock },
}));

// Drizzle query builders are thenable and expose `.limit()`. This mirrors the
// shape the data helpers await, without reaching a real database.
const mockSelectResult = (result: unknown) => {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue(Object.assign(Promise.resolve(result), { limit }));
  const from = vi.fn().mockReturnValue({ where });
  selectMock.mockReturnValue({ from });
};

const setId = "11111111-1111-4111-8111-111111111111";
const missingId = "22222222-2222-4222-8222-222222222222";
// The extra suffix is what Postgres rejects as an invalid uuid literal.
const malformedId = "de54a30e-0cec-4b57-b42d-eeb8bb69f7c6sdf";

beforeEach(() => {
  selectMock.mockReset();
});

describe("getCardSet", () => {
  it("returns the card set for the given id", async () => {
    mockSelectResult([{ id: setId, name: "Solid Principles" }]);

    await expect(getCardSet(setId)).resolves.toEqual({
      id: setId,
      name: "Solid Principles",
    });
  });

  it("returns null when no card set matches", async () => {
    mockSelectResult([]);

    await expect(getCardSet(missingId)).resolves.toBeNull();
  });

  it("returns null for a malformed id without querying the database", async () => {
    await expect(getCardSet(malformedId)).resolves.toBeNull();

    expect(selectMock).not.toHaveBeenCalled();
  });
});

describe("listCardsForSet", () => {
  it("returns the cards belonging to the set", async () => {
    mockSelectResult([
      { id: "card-1", question: "What is SOLID?", answer: "Five design principles." },
      { id: "card-2", question: "What is SRP?", answer: "Single responsibility principle." },
    ]);

    await expect(listCardsForSet(setId)).resolves.toEqual([
      { id: "card-1", question: "What is SOLID?", answer: "Five design principles." },
      { id: "card-2", question: "What is SRP?", answer: "Single responsibility principle." },
    ]);
  });

  it("returns an empty list when the set has no cards", async () => {
    mockSelectResult([]);

    await expect(listCardsForSet(missingId)).resolves.toEqual([]);
  });

  it("returns an empty list for a malformed id without querying the database", async () => {
    await expect(listCardsForSet(malformedId)).resolves.toEqual([]);

    expect(selectMock).not.toHaveBeenCalled();
  });
});
