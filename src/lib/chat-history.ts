import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chatHistory } from "@/db/schema";

/** Each user keeps a single conversation, trimmed to its newest messages. */
export const HISTORY_LIMIT = 20;

export const getChatHistory = async (userId: string): Promise<UIMessage[]> => {
  const [row] = await db
    .select({ messages: chatHistory.messages })
    .from(chatHistory)
    .where(eq(chatHistory.userId, userId))
    .limit(1);

  return row?.messages ?? [];
};

export const saveChatHistory = async (userId: string, messages: UIMessage[]) => {
  const trimmed = messages.slice(-HISTORY_LIMIT);
  const updatedAt = new Date();

  await db
    .insert(chatHistory)
    .values({ userId, messages: trimmed, updatedAt })
    .onConflictDoUpdate({
      target: chatHistory.userId,
      set: { messages: trimmed, updatedAt },
    });
};
