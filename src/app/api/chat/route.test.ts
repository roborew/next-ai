import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { UIMessage } from "ai";

const {
  streamTextMock,
  convertToModelMessagesMock,
  createUIMessageStreamResponseMock,
  toUIMessageStreamMock,
  rateLimitMock,
  ratelimitConstructorMock,
  slidingWindowMock,
  redisFromEnvMock,
  getSessionMock,
  getChatHistoryMock,
  saveChatHistoryMock,
  generateIdMock,
  rateLimitConfig,
  uiStreamArgs,
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
  const uiStreamArgs: {
    current?: {
      originalMessages?: UIMessage[];
      onEnd?: (event: { messages: UIMessage[] }) => Promise<void> | void;
    };
  } = {};

  return {
    modelStream,
    uiMessageStream,
    response,
    convertedMessages,
    rateLimitConfig,
    uiStreamArgs,
    streamTextMock: vi.fn(() => ({ stream: modelStream })),
    convertToModelMessagesMock: vi.fn((_messages: UIMessage[]) =>
      Promise.resolve(convertedMessages),
    ),
    createUIMessageStreamResponseMock: vi.fn(() => response),
    toUIMessageStreamMock: vi.fn((args: unknown) => {
      uiStreamArgs.current = args as (typeof uiStreamArgs)["current"];
      return uiMessageStream;
    }),
    rateLimitMock: vi.fn(),
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
    getSessionMock: vi.fn(),
    getChatHistoryMock: vi.fn(),
    saveChatHistoryMock: vi.fn(),
    generateIdMock: vi.fn(() => "generated-id"),
  };
});

vi.mock("ai", () => ({
  streamText: streamTextMock,
  convertToModelMessages: convertToModelMessagesMock,
  createUIMessageStreamResponse: createUIMessageStreamResponseMock,
  toUIMessageStream: toUIMessageStreamMock,
  generateId: generateIdMock,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(ratelimitConstructorMock, {
    slidingWindow: slidingWindowMock,
  }),
}));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: redisFromEnvMock },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/chat-history", () => ({
  getChatHistory: getChatHistoryMock,
  saveChatHistory: saveChatHistoryMock,
}));

import { POST } from "./route";

const storedMessages: UIMessage[] = [
  {
    id: "message-1",
    role: "user",
    parts: [{ type: "text", text: "Hello" }],
  },
];

const userMessage: UIMessage = {
  id: "message-2",
  role: "user",
  parts: [{ type: "text", text: "Hello again" }],
};

// The shape `DefaultChatTransport` actually posts: the whole conversation plus
// trigger metadata. There is no top-level `message` key.
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
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
  getChatHistoryMock.mockReset();
  getChatHistoryMock.mockResolvedValue([]);
  saveChatHistoryMock.mockReset();
  saveChatHistoryMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/chat", () => {
  it("rejects requests without a session before rate limiting or streaming", async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await post({ messages: [userMessage] });

    expect(result.status).toBe(401);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
    expect(convertToModelMessagesMock).not.toHaveBeenCalled();
  });

  it("rejects a request without a message list", async () => {
    const result = await post({ id: "chat-1", trigger: "submit-message" });

    expect(result.status).toBe(400);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("adds the submitted message to the stored history", async () => {
    getChatHistoryMock.mockResolvedValue(storedMessages);

    await post({ messages: [...storedMessages, userMessage] });

    expect(getChatHistoryMock).toHaveBeenCalledWith("user-1");
    expect(convertToModelMessagesMock).toHaveBeenCalledWith([...storedMessages, userMessage]);
    expect(streamTextMock).toHaveBeenCalledWith({
      model: "openai/o4-mini",
      messages: convertedMessages,
    });
  });

  it("does not duplicate messages the client replays from storage", async () => {
    getChatHistoryMock.mockResolvedValue(storedMessages);

    await post({ messages: [...storedMessages, userMessage] });

    const sent = convertToModelMessagesMock.mock.calls[0][0] as UIMessage[];
    expect(sent.filter((message) => message.id === "message-1")).toHaveLength(1);
  });

  it("keeps an assistant reply the client still has but the database has not stored", async () => {
    const assistantReply: UIMessage = {
      id: "message-3",
      role: "assistant",
      parts: [{ type: "text", text: "Hi!" }],
    };
    getChatHistoryMock.mockResolvedValue(storedMessages);

    await post({ messages: [...storedMessages, assistantReply, userMessage] });

    expect(convertToModelMessagesMock).toHaveBeenCalledWith([
      ...storedMessages,
      assistantReply,
      userMessage,
    ]);
  });

  it("wraps the model stream in a UI message stream response with the full conversation", async () => {
    getChatHistoryMock.mockResolvedValue(storedMessages);

    const result = await post({ messages: [...storedMessages, userMessage] });

    expect(toUIMessageStreamMock).toHaveBeenCalledWith({
      stream: modelStream,
      originalMessages: [...storedMessages, userMessage],
      // Without this the assistant reply is persisted with an empty id, which
      // makes replaying the client's messages impossible to de-duplicate.
      generateMessageId: generateIdMock,
      onEnd: expect.any(Function),
    });
    expect(createUIMessageStreamResponseMock).toHaveBeenCalledWith({
      stream: uiMessageStream,
    });
    expect(result).toBe(response);
  });

  it("saves the completed conversation, including the assistant reply, when the stream ends", async () => {
    const assistantReply: UIMessage = {
      id: "message-3",
      role: "assistant",
      parts: [{ type: "text", text: "Hi!" }],
    };

    await post({ messages: [...storedMessages, userMessage] });

    const onEnd = uiStreamArgs.current?.onEnd;
    expect(onEnd).toBeDefined();
    await onEnd?.({ messages: [...storedMessages, userMessage, assistantReply] });

    expect(saveChatHistoryMock).toHaveBeenCalledWith("user-1", [
      ...storedMessages,
      userMessage,
      assistantReply,
    ]);
  });

  it("rate limits by the client IP from x-forwarded-for", async () => {
    await post({ messages: [userMessage] }, { "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" });

    expect(rateLimitMock).toHaveBeenCalledWith("203.0.113.7");
  });

  it("falls back to a local key when x-forwarded-for is missing", async () => {
    await post({ messages: [userMessage] });

    expect(rateLimitMock).toHaveBeenCalledWith("local");
  });

  it("returns 429 with Retry-After without streaming when the limit is exceeded", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    rateLimitMock.mockResolvedValue({
      success: false,
      reset: Date.now() + 30_000,
    });

    const result = await post({ messages: [userMessage] });

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
