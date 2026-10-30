import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getChatHistory } from "@/lib/chat-history";
import Chat from "./chat";

// The page reads the session from request headers, so it blocks on the server
// instead of prerendering a static shell.
export const instant = false;

export default async function ChatPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const initialMessages = await getChatHistory(session.user.id);

  return <Chat initialMessages={initialMessages} />;
}
