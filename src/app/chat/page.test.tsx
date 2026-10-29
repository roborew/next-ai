import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { useChatMock, sendMessageMock } = vi.hoisted(() => ({
  useChatMock: vi.fn(),
  sendMessageMock: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: useChatMock,
}));

import Chat from "./page";

const conversation = [
  {
    id: "message-1",
    role: "user",
    parts: [{ type: "text", text: "Hello" }],
  },
  {
    id: "message-2",
    role: "assistant",
    parts: [{ type: "text", text: "Hi! How can I help?" }],
  },
];

beforeEach(() => {
  sendMessageMock.mockReset();
  useChatMock.mockReset();
  useChatMock.mockReturnValue({
    messages: conversation,
    sendMessage: sendMessageMock,
  });
});

describe("Chat", () => {
  it("renders each message with its role label", () => {
    render(<Chat />);

    expect(screen.getByText("Hello").parentElement).toHaveTextContent("User: Hello");
    expect(screen.getByText("Hi! How can I help?").parentElement).toHaveTextContent(
      "AI: Hi! How can I help?",
    );
  });

  it("renders a placeholder input when there is no conversation", () => {
    useChatMock.mockReturnValue({ messages: [], sendMessage: sendMessageMock });

    render(<Chat />);

    expect(screen.getByPlaceholderText("Say something...")).toBeInTheDocument();
    expect(screen.queryByText("User:")).not.toBeInTheDocument();
  });

  it("does not render non-text message parts", () => {
    useChatMock.mockReturnValue({
      messages: [
        {
          id: "message-1",
          role: "assistant",
          parts: [{ type: "reasoning", text: "thinking" }],
        },
      ],
      sendMessage: sendMessageMock,
    });

    render(<Chat />);

    expect(screen.queryByText("thinking")).not.toBeInTheDocument();
  });

  it("updates the input as the user types", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    const input = screen.getByPlaceholderText("Say something...");
    await user.type(input, "What is React?");

    expect(input).toHaveValue("What is React?");
  });

  it("sends the current input and clears it on submit", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    const input = screen.getByPlaceholderText("Say something...");
    await user.type(input, "What is React?");
    await user.keyboard("{Enter}");

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith({ text: "What is React?" });
    expect(input).toHaveValue("");
  });
});
