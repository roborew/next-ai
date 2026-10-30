import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";

const { getSessionMock, redirectMock, getChatHistoryMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  redirectMock: vi.fn(),
  getChatHistoryMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/chat-history", () => ({
  getChatHistory: getChatHistoryMock,
}));

// The client component is exercised by its own test file; here it only needs to
// expose the history it was given.
vi.mock("./chat", () => ({
  default: ({ initialMessages = [] }: { initialMessages?: UIMessage[] }) => (
    <div data-testid="chat">
      {initialMessages.map((message) => (
        <p key={message.id}>{message.parts.map((part) => (part.type === "text" ? part.text : ""))}</p>
      ))}
    </div>
  ),
}));

import ChatPage from "./page";

const history: UIMessage[] = [
  { id: "message-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
  { id: "message-2", role: "assistant", parts: [{ type: "text", text: "Hi!" }] },
];

beforeEach(() => {
  getSessionMock.mockReset();
  redirectMock.mockReset();
  getChatHistoryMock.mockReset();
  getChatHistoryMock.mockResolvedValue([]);
  // Next's redirect throws to stop rendering; mimic that so the page does not
  // continue to the data layer after redirecting.
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("Chat page", () => {
  it("redirects a signed-out visitor to the login page", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(ChatPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(getChatHistoryMock).not.toHaveBeenCalled();
  });

  it("renders the signed-in user's stored conversation", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getChatHistoryMock.mockResolvedValue(history);

    render(await ChatPage());

    expect(getChatHistoryMock).toHaveBeenCalledWith("user-1");
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi!")).toBeInTheDocument();
  });

  it("renders the chat without history for a new user", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-2" } });

    render(await ChatPage());

    expect(screen.getByTestId("chat")).toBeEmptyDOMElement();
  });
});
