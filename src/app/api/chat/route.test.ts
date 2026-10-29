import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const {
  streamTextMock,
  convertToModelMessagesMock,
  createUIMessageStreamResponseMock,
  toUIMessageStreamMock,
  rateLimitMock,
  ratelimitConstructorMock,
  slidingWindowMock,
  redisFromEnvMock,
  rateLimitConfig,
  modelStream,
  uiMessageStream,
  response,
  convertedMessages,
} = vi.hoisted(() => {
  const modelStream = { marker: "model-stream" };
  const uiMessageStream = { marker: "ui-message-stream" };
  const response = { marker: "response" };
  const convertedMessages = [{ role: "user", content: "converted" }];
  // Captured at module load, before the test runner clears mock call history.
  const rateLimitConfig: {
    slidingWindowArgs?: unknown[];
    constructorArgs?: unknown;
  } = {};

  return {
    modelStream,
    uiMessageStream,
    response,
    convertedMessages,
    streamTextMock: vi.fn(() => ({ stream: modelStream })),
    convertToModelMessagesMock: vi.fn(async () => convertedMessages),
    createUIMessageStreamResponseMock: vi.fn(() => response),
    toUIMessageStreamMock: vi.fn(() => uiMessageStream),
    rateLimitMock: vi.fn(),
    rateLimitConfig,
    slidingWindowMock: vi.fn((...args: unknown[]) => {
      rateLimitConfig.slidingWindowArgs = args;
      return "sliding-window-limiter";
    }),
    // Must be a regular function so it can be used with `new`.
    ratelimitConstructorMock: vi.fn(function (config: unknown) {
      rateLimitConfig.constructorArgs = config;
      return { limit: rateLimitMock };
    }),
    redisFromEnvMock: vi.fn(() => ({ marker: "redis" })),
  };
});

vi.mock("ai", () => ({
  streamText: streamTextMock,
  convertToModelMessages: convertToModelMessagesMock,
  createUIMessageStreamResponse: createUIMessageStreamResponseMock,
  toUIMessageStream: toUIMessageStreamMock,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(ratelimitConstructorMock, {
    slidingWindow: slidingWindowMock,
  }),
}));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: redisFromEnvMock },
}));

import { POST } from "./route";

const messages = [
  {
    id: "message-1",
    role: "user",
    parts: [{ type: "text", text: "Hello" }],
  },
];

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  streamTextMock.mockClear();
  convertToModelMessagesMock.mockClear();
  createUIMessageStreamResponseMock.mockClear();
  toUIMessageStreamMock.mockClear();
  rateLimitMock.mockReset();
  rateLimitMock.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/chat", () => {
  it("converts the UI messages from the request body to model messages", async () => {
    await post({ messages });

    expect(convertToModelMessagesMock).toHaveBeenCalledWith(messages);
  });

  it("streams a response with the configured model and converted messages", async () => {
    await post({ messages });

    expect(streamTextMock).toHaveBeenCalledWith({
      model: "openai/o4-mini",
      messages: convertedMessages,
    });
  });

  it("wraps the model stream in a UI message stream response", async () => {
    const result = await post({ messages });

    expect(toUIMessageStreamMock).toHaveBeenCalledWith({ stream: modelStream });
    expect(createUIMessageStreamResponseMock).toHaveBeenCalledWith({
      stream: uiMessageStream,
    });
    expect(result).toBe(response);
  });

  it("rate limits by the client IP from x-forwarded-for", async () => {
    await post({ messages }, { "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" });

    expect(rateLimitMock).toHaveBeenCalledWith("203.0.113.7");
  });

  it("falls back to a local key when x-forwarded-for is missing", async () => {
    await post({ messages });

    expect(rateLimitMock).toHaveBeenCalledWith("local");
  });

  it("returns 429 with Retry-After without streaming when the limit is exceeded", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    rateLimitMock.mockResolvedValue({
      success: false,
      reset: Date.now() + 30_000,
    });

    const result = await post({ messages });

    expect(result.status).toBe(429);
    expect(result.headers.get("Retry-After")).toBe("30");
    await expect(result.json()).resolves.toEqual({
      error: "Too many requests. Please try again shortly.",
    });
    expect(streamTextMock).not.toHaveBeenCalled();
    expect(convertToModelMessagesMock).not.toHaveBeenCalled();
  });

  it("configures a sliding window of 10 requests per minute", () => {
    expect(rateLimitConfig.slidingWindowArgs).toEqual([10, "1 m"]);
    expect(rateLimitConfig.constructorArgs).toMatchObject({
      redis: { marker: "redis" },
      limiter: "sliding-window-limiter",
      prefix: "ratelimit:chat",
    });
  });
});
