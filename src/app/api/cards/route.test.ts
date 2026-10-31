import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { CARD_PROMPT } from "@/lib/prompt";

const {
  generateTextMock,
  outputObjectMock,
  outputDescriptor,
  getCardSetMock,
  createCardsMock,
  revalidatePathMock,
  getSessionMock,
  enforceRateLimitMock,
} = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  outputObjectMock: vi.fn(),
  outputDescriptor: { marker: "structured-output" },
  getCardSetMock: vi.fn(),
  createCardsMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  getSessionMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: generateTextMock,
  Output: { object: outputObjectMock },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/data", () => ({
  getCardSet: getCardSetMock,
  createCards: createCardsMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: enforceRateLimitMock }));

import { CardsSchema, POST } from "./route";

const cardSetId = "11111111-1111-4111-8111-111111111111";

const text =
  "What's a design pattern?\nDesign patterns are typical solutions to commonly occurring problems in software design. They are like pre-made blueprints that you can customize to solve a recurring design problem in your code.\n\nYou can't just find a pattern and copy it into your program, the way you can with off-the-shelf functions or libraries. The pattern is not a specific piece of code, but a general concept for solving a particular problem. You can follow the pattern details and implement a solution that suits the realities of your own program.\n\nPatterns are often confused with algorithms, because both concepts describe typical solutions to some known problems. While an algorithm always defines a clear set of actions that can achieve some goal, a pattern is a more high-level description of a solution. The code of the same pattern applied to two different programs may be different.";

const results = {
  cards: [
    {
      question: "What is a design pattern in software design?",
      answer:
        "A design pattern is a typical solution to a commonly occurring software design problem, serving as a customizable blueprint for code structure.",
    },
    {
      question: "How are design patterns similar to pre-made blueprints?",
      answer:
        "They provide a general structure or framework that developers can customize to solve recurring design problems in their code.",
    },
    {
      question:
        "Why can't you copy a design pattern directly into your program like an off-the-shelf function or library?",
      answer:
        "Because a design pattern is a high-level concept rather than specific code, it must be implemented and tailored to the particular needs of your program.",
    },
    {
      question: "What distinguishes a design pattern from an algorithm?",
      answer:
        "An algorithm defines a clear, step-by-step set of actions to achieve a goal, while a design pattern is a more abstract, high-level solution concept for a recurring design problem.",
    },
    {
      question: "Why are design patterns often confused with algorithms?",
      answer:
        "Because both describe typical solutions to known problems, but they operate at different levels of abstraction.",
    },
    {
      question:
        "Can the implementation of the same design pattern be identical in different programs?",
      answer:
        "No, while the underlying concept is the same, the code implementing a pattern can differ across programs to suit each program's specific context.",
    },
    {
      question: "What must you do to apply a design pattern to your own code?",
      answer:
        "You must follow the pattern's details and customize the implementation to fit the realities and requirements of your specific program.",
    },
  ],
};

const savedCards = results.cards.map((card, index) => ({
  id: `card-${index + 1}`,
  cardSetId,
  ...card,
}));

const withText = (value: string) => CARD_PROMPT.replace("{{TEXT}}", () => value);

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const postRaw = (body: string) =>
  POST(
    new Request("http://localhost/api/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );

beforeEach(() => {
  generateTextMock.mockReset();
  outputObjectMock.mockReset();
  outputObjectMock.mockReturnValue(outputDescriptor);
  generateTextMock.mockResolvedValue({ output: results });

  getCardSetMock.mockReset();
  getCardSetMock.mockResolvedValue({ id: cardSetId, name: "Solid Principles" });

  createCardsMock.mockReset();
  createCardsMock.mockResolvedValue(savedCards);

  revalidatePathMock.mockReset();

  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

  enforceRateLimitMock.mockReset();
  enforceRateLimitMock.mockResolvedValue(null);
});

describe("POST /api/cards", () => {
  it("rejects requests without a session before rate limiting or generating", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await post({ cardSetId, text });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(enforceRateLimitMock).not.toHaveBeenCalled();
    expect(getCardSetMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(createCardsMock).not.toHaveBeenCalled();
  });

  it("rate limits the signed-in user", async () => {
    await post({ cardSetId, text });

    expect(enforceRateLimitMock).toHaveBeenCalledWith("cards", "user-1");
  });

  it("returns 429 with Retry-After without generating when the limit is exceeded", async () => {
    const limited = Response.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
    enforceRateLimitMock.mockResolvedValueOnce(limited);

    const response = await post({ cardSetId, text });

    expect(response).toBe(limited);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(getCardSetMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(createCardsMock).not.toHaveBeenCalled();
  });

  it("generates structured cards from the submitted text", async () => {
    await post({ cardSetId, text });

    expect(outputObjectMock).toHaveBeenCalledWith({ schema: CardsSchema });
    expect(generateTextMock).toHaveBeenCalledWith({
      model: "openai/o4-mini",
      output: outputDescriptor,
      prompt: withText(text),
    });
  });

  it("checks the card set exists before calling the model", async () => {
    await post({ cardSetId, text });

    expect(getCardSetMock).toHaveBeenCalledWith(cardSetId);
  });

  it("saves the generated cards and returns them", async () => {
    const response = await post({ cardSetId, text });

    expect(createCardsMock).toHaveBeenCalledWith(cardSetId, results.cards);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ cards: savedCards });
  });

  it("revalidates the card set page after saving", async () => {
    await post({ cardSetId, text });

    expect(revalidatePathMock).toHaveBeenCalledWith(`/cards/${cardSetId}`);
  });

  it("trims whitespace and drops incomplete cards before saving", async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        cards: [
          { question: "  What is SOLID?  ", answer: "  Five principles.  " },
          { question: "   ", answer: "No question." },
          { question: "No answer?", answer: "   " },
        ],
      },
    });

    await post({ cardSetId, text });

    expect(createCardsMock).toHaveBeenCalledWith(cardSetId, [
      { question: "What is SOLID?", answer: "Five principles." },
    ]);
  });

  it("rejects blank text without calling the model", async () => {
    const response = await post({ cardSetId, text: "   " });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Text is required." });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(createCardsMock).not.toHaveBeenCalled();
  });

  it("rejects a missing card set id without calling the model", async () => {
    const response = await post({ text });

    expect(response.status).toBe(400);
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(createCardsMock).not.toHaveBeenCalled();
  });

  it("rejects text that is too long", async () => {
    const response = await post({ cardSetId, text: "a".repeat(20_001) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Text is too long." });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await postRaw("not json");

    expect(response.status).toBe(400);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown card set without calling the model", async () => {
    getCardSetMock.mockResolvedValue(null);

    const response = await post({ cardSetId, text });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Card set not found." });
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(createCardsMock).not.toHaveBeenCalled();
  });

  it("returns 422 when the model produces no usable cards", async () => {
    generateTextMock.mockResolvedValueOnce({
      output: { cards: [{ question: " ", answer: " " }] },
    });

    const response = await post({ cardSetId, text });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "No cards could be generated from that text.",
    });
    expect(createCardsMock).not.toHaveBeenCalled();
  });

  it("returns 502 when generation fails", async () => {
    generateTextMock.mockRejectedValueOnce(new Error("model unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await post({ cardSetId, text });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Failed to generate cards." });
    expect(createCardsMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("returns 500 when saving fails", async () => {
    createCardsMock.mockRejectedValueOnce(new Error("db unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await post({ cardSetId, text });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to save cards." });
    expect(revalidatePathMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("returns 400 when the data layer rejects the card set id", async () => {
    createCardsMock.mockResolvedValueOnce(null);

    const response = await post({ cardSetId, text });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid card set." });
  });
});
