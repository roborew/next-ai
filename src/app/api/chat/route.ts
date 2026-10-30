import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  generateId,
} from "ai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { auth } from "@/lib/auth";
import { getChatHistory, saveChatHistory } from "@/lib/chat-history";

const redis = Redis.fromEnv();

const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
  prefix: "ratelimit:chat",
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only trust this header when your hosting proxy sets it reliably.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  const { success, reset } = await rateLimit.limit(ip);

  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    return Response.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  const body: { messages?: UIMessage[] } | null = await req.json().catch(() => null);
  const incoming = body?.messages?.filter(
    (message) => typeof message?.id === "string" && Array.isArray(message?.parts),
  );

  if (!incoming?.length) {
    return Response.json({ error: "Messages are required." }, { status: 400 });
  }

  // The stored history is authoritative, but the client may still hold messages
  // a previous turn never managed to persist (e.g. the stream was cut off).
  const stored = await getChatHistory(session.user.id);
  const storedIds = new Set(stored.map((message) => message.id));
  const messages = [...stored, ...incoming.filter((message) => !storedIds.has(message.id))];

  const result = streamText({
    model: "openai/o4-mini",
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: generateId,
      onEnd: async ({ messages: completed }) => {
        await saveChatHistory(session.user.id, completed);
      },
    }),
  });
}
