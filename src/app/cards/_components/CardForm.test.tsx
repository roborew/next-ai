import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createCard } from "@/lib/actions/cards";

import { CardForm } from "./CardForm";

// CardForm is a Client Component, so the server action it imports must exist as
// a callable stub before it renders.
vi.mock("@/lib/actions/cards", () => ({
  createCard: vi.fn(async () => ({ message: "" })),
}));

const createCardMock = vi.mocked(createCard);

const cardSetId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  createCardMock.mockReset();
  createCardMock.mockResolvedValue({ message: "" });
});

describe("CardForm", () => {
  it("renders labelled question and answer fields", () => {
    render(<CardForm cardSetId={cardSetId} />);

    expect(screen.getByLabelText("Question")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer")).toBeInTheDocument();
  });

  it("marks the question and answer fields as required", () => {
    render(<CardForm cardSetId={cardSetId} />);

    expect(screen.getByLabelText("Question")).toBeRequired();
    expect(screen.getByLabelText("Answer")).toBeRequired();
  });

  it("carries the card set id in a hidden field", () => {
    const { container } = render(<CardForm cardSetId={cardSetId} />);

    const hidden = container.querySelector('input[name="cardSetId"]');
    expect(hidden).toHaveValue(cardSetId);
    expect(hidden).toHaveAttribute("type", "hidden");
  });

  it("offers an add card button", () => {
    render(<CardForm cardSetId={cardSetId} />);

    expect(screen.getByRole("button", { name: "Add Card" })).toBeInTheDocument();
  });

  it("submits through the createCard action", async () => {
    const user = userEvent.setup();
    render(<CardForm cardSetId={cardSetId} />);

    await user.type(screen.getByLabelText("Question"), "2 + 2?");
    await user.type(screen.getByLabelText("Answer"), "4");
    await user.click(screen.getByRole("button", { name: "Add Card" }));

    await waitFor(() => expect(createCardMock).toHaveBeenCalledTimes(1));
  });

  it("shows the errors returned by the action", async () => {
    createCardMock.mockResolvedValueOnce({
      errors: { question: ["Question is required."] },
      message: "Validation failed.",
    });

    const user = userEvent.setup();
    render(<CardForm cardSetId={cardSetId} />);

    await user.type(screen.getByLabelText("Question"), "2 + 2?");
    await user.type(screen.getByLabelText("Answer"), "4");
    await user.click(screen.getByRole("button", { name: "Add Card" }));

    expect(await screen.findByText("Question is required.")).toBeInTheDocument();
  });

  it("shows the message returned by the action", async () => {
    createCardMock.mockResolvedValueOnce({ message: "Card added." });

    const user = userEvent.setup();
    render(<CardForm cardSetId={cardSetId} />);

    await user.type(screen.getByLabelText("Question"), "2 + 2?");
    await user.type(screen.getByLabelText("Answer"), "4");
    await user.click(screen.getByRole("button", { name: "Add Card" }));

    expect(await screen.findByText("Card added.")).toBeInTheDocument();
  });
});
