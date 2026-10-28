import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { revalidatePath } from "next/cache";

import { createCard } from "./actions";

const { insertMock, valuesMock } = vi.hoisted(() => {
  const valuesMock = vi.fn();
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  return { insertMock, valuesMock };
});

vi.mock("@/db", () => ({
  db: { insert: insertMock },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const revalidatePathMock = vi.mocked(revalidatePath);

const cardSetId = "11111111-1111-4111-8111-111111111111";

const initialState = { errors: {}, message: null };

const formDataFor = (fields: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
};

beforeEach(() => {
  insertMock.mockClear();
  valuesMock.mockReset();
  valuesMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

describe("createCard", () => {
  it("inserts the card with its set id, question and answer", async () => {
    const formData = formDataFor({
      cardSetId,
      question: "What is SOLID?",
      answer: "Five design principles.",
    });

    const result = await createCard(initialState, formData);

    expect(valuesMock).toHaveBeenCalledWith({
      cardSetId,
      question: "What is SOLID?",
      answer: "Five design principles.",
    });
    expect(result.errors).toBeUndefined();
  });

  it("revalidates the card set page after inserting", async () => {
    const formData = formDataFor({ cardSetId, question: "2 + 2?", answer: "4" });

    await createCard(initialState, formData);

    expect(revalidatePathMock).toHaveBeenCalledWith(`/cards/${cardSetId}`);
  });

  it("trims surrounding whitespace from the question and answer", async () => {
    const formData = formDataFor({ cardSetId, question: "  2 + 2?  ", answer: "  4  " });

    await createCard(initialState, formData);

    expect(valuesMock).toHaveBeenCalledWith({ cardSetId, question: "2 + 2?", answer: "4" });
  });

  it("rejects an empty question without inserting", async () => {
    const formData = formDataFor({ cardSetId, question: "   ", answer: "4" });

    const result = await createCard(initialState, formData);

    expect(result.errors?.question).toEqual(["Question is required."]);
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it("rejects an empty answer without inserting", async () => {
    const formData = formDataFor({ cardSetId, question: "2 + 2?", answer: "" });

    const result = await createCard(initialState, formData);

    expect(result.errors?.answer).toEqual(["Answer is required."]);
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid card set id without inserting", async () => {
    const formData = formDataFor({ cardSetId: "not-a-uuid", question: "2 + 2?", answer: "4" });

    const result = await createCard(initialState, formData);

    expect(result.errors?.cardSetId).toEqual(["Invalid card set."]);
    expect(valuesMock).not.toHaveBeenCalled();
  });

  it("reports a failure when the insert throws", async () => {
    valuesMock.mockRejectedValueOnce(new Error("db unavailable"));
    const formData = formDataFor({ cardSetId, question: "2 + 2?", answer: "4" });

    const result = await createCard(initialState, formData);

    expect(result.errors?.question).toEqual(["Failed to add card."]);
    expect(result.message).toBe("Failed to add card.");
  });
});
