import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCard, createCardSet, updateCardSet } from "./cards";

const { insertMock, valuesMock, updateMock, setMock, whereMock } = vi.hoisted(() => {
  const valuesMock = vi.fn();
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  const whereMock = vi.fn();
  const setMock = vi.fn(() => ({ where: whereMock }));
  const updateMock = vi.fn(() => ({ set: setMock }));
  return { insertMock, valuesMock, updateMock, setMock, whereMock };
});

vi.mock("@/db", () => ({
  db: { insert: insertMock, update: updateMock },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const revalidatePathMock = vi.mocked(revalidatePath);
const redirectMock = vi.mocked(redirect);

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
  redirectMock.mockReset();
  updateMock.mockClear();
  setMock.mockClear();
  whereMock.mockReset();
  whereMock.mockResolvedValue(undefined);
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

describe("createCardSet", () => {
  const newSetId = "22222222-2222-4222-8222-222222222222";
  const returningMock = vi.fn();

  beforeEach(() => {
    returningMock.mockReset();
    returningMock.mockResolvedValue([{ id: newSetId }]);
    valuesMock.mockReturnValue({ returning: returningMock });
  });

  it("redirects to the new card set page", async () => {
    const formData = formDataFor({ name: "Solid Principles" });

    await createCardSet(initialState, formData);

    expect(redirectMock).toHaveBeenCalledWith(`/cards/${newSetId}`);
  });

  it("revalidates the cards list after creating a set", async () => {
    const formData = formDataFor({ name: "Solid Principles" });

    await createCardSet(initialState, formData);

    expect(revalidatePathMock).toHaveBeenCalledWith("/cards");
  });

  it("rejects an empty name without inserting", async () => {
    const formData = formDataFor({ name: "   " });

    const result = await createCardSet(initialState, formData);

    expect(result.errors?.name).toEqual(["Card set name is required."]);
    expect(valuesMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("updateCardSet", () => {
  const existingId = "33333333-3333-4333-8333-333333333333";

  it("updates the name and redirects to the card set page", async () => {
    const formData = formDataFor({ id: existingId, name: "Renamed" });

    await updateCardSet(initialState, formData);

    expect(setMock).toHaveBeenCalledWith({ name: "Renamed" });
    expect(whereMock).toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(`/cards/${existingId}`);
  });

  it("revalidates both the list and the card set page", async () => {
    const formData = formDataFor({ id: existingId, name: "Renamed" });

    await updateCardSet(initialState, formData);

    expect(revalidatePathMock).toHaveBeenCalledWith("/cards");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/cards/${existingId}`);
  });

  it("rejects an invalid id without updating", async () => {
    const formData = formDataFor({ id: "not-a-uuid", name: "Renamed" });

    const result = await updateCardSet(initialState, formData);

    expect(result.errors?.id).toEqual(["Invalid card set."]);
    expect(updateMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects an empty name without updating", async () => {
    const formData = formDataFor({ id: existingId, name: "   " });

    const result = await updateCardSet(initialState, formData);

    expect(result.errors?.name).toEqual(["Card set name is required."]);
    expect(updateMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("reports a failure when the update throws", async () => {
    whereMock.mockRejectedValueOnce(new Error("db unavailable"));
    const formData = formDataFor({ id: existingId, name: "Renamed" });

    const result = await updateCardSet(initialState, formData);

    expect(result.errors?.name).toEqual(["Failed to update card set."]);
    expect(result.message).toBe("Failed to update card set.");
  });
});
