import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { UIMessage } from "ai";

const {
  streamTextMock,
  convertToModelMessagesMock,
  createUIMessageStreamResponseMock,
  toUIMessageStreamMock,
  enforceRateLimitMock,
  getSessionMock,
  getChatHistoryMock,
  saveChatHistoryMock,
  generateIdMock,
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
    enforceRateLimitMock: vi.fn(),
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

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: enforceRateLimitMock }));

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
  enforceRateLimitMock.mockReset();
  enforceRateLimitMock.mockResolvedValue(null);
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
    expect(enforceRateLimitMock).not.toHaveBeenCalled();
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

  it("rate limits the signed-in user", async () => {
    await post({ messages: [userMessage] });

    expect(enforceRateLimitMock).toHaveBeenCalledWith("chat", "user-1");
  });

  it("returns 429 with Retry-After without streaming when the limit is exceeded", async () => {
    const limited = Response.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
    enforceRateLimitMock.mockResolvedValueOnce(limited);

    const result = await post({ messages: [userMessage] });

    expect(result).toBe(limited);
    expect(result.status).toBe(429);
    expect(result.headers.get("Retry-After")).toBe("30");
    expect(streamTextMock).not.toHaveBeenCalled();
    expect(convertToModelMessagesMock).not.toHaveBeenCalled();
  });
});
