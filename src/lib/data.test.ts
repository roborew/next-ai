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

beforeEach(() => {
  selectMock.mockReset();
});

describe("getCardSet", () => {
  it("returns the card set for the given id", async () => {
    mockSelectResult([{ id: "set-1", name: "Solid Principles" }]);

    await expect(getCardSet("set-1")).resolves.toEqual({
      id: "set-1",
      name: "Solid Principles",
    });
  });

  it("returns null when no card set matches", async () => {
    mockSelectResult([]);

    await expect(getCardSet("missing")).resolves.toBeNull();
  });
});

describe("listCardsForSet", () => {
  it("returns the cards belonging to the set", async () => {
    mockSelectResult([
      { id: "card-1", question: "What is SOLID?", answer: "Five design principles." },
      { id: "card-2", question: "What is SRP?", answer: "Single responsibility principle." },
    ]);

    await expect(listCardsForSet("set-1")).resolves.toEqual([
      { id: "card-1", question: "What is SOLID?", answer: "Five design principles." },
      { id: "card-2", question: "What is SRP?", answer: "Single responsibility principle." },
    ]);
  });

  it("returns an empty list when the set has no cards", async () => {
    mockSelectResult([]);

    await expect(listCardsForSet("set-1")).resolves.toEqual([]);
  });
});
