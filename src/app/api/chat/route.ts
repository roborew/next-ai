import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  generateId,
} from "ai";

import { requireSession } from "@/lib/api-guard";
import { getChatHistory, saveChatHistory } from "@/lib/chat-history";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const limited = await enforceRateLimit("chat", session.user.id);
  if (limited) return limited;

  const body: { messages?: UIMessage[] } | null = await request.json().catch(() => null);
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
