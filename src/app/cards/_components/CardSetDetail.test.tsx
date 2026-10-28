import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";

import { CardSetDetail } from "./CardSetDetail";

const cardSet = { id: "set-1", name: "Solid Principles" };
const cards = [
  { id: "card-1", question: "What is SOLID?", answer: "Five design principles." },
  { id: "card-2", question: "What is SRP?", answer: "Single responsibility principle." },
];

describe("CardSetDetail", () => {
  it("renders the card set name as the page heading", () => {
    render(<CardSetDetail cardSet={cardSet} cards={cards} />);

    expect(screen.getByRole("heading", { level: 1, name: "Solid Principles" })).toBeInTheDocument();
  });

  it("renders a flip card for each card", () => {
    render(<CardSetDetail cardSet={cardSet} cards={cards} />);

    expect(screen.getAllByRole("button")).toHaveLength(cards.length);
    expect(screen.getByRole("button", { name: "What is SOLID?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What is SRP?" })).toBeInTheDocument();
  });

  it("links to the edit page for the set", () => {
    render(<CardSetDetail cardSet={cardSet} cards={cards} />);

    expect(screen.getByRole("link", { name: "Edit Card Set" })).toHaveAttribute(
      "href",
      "/cards/set-1/edit",
    );
  });

  it("shows a friendly empty state when the set has no cards", () => {
    render(<CardSetDetail cardSet={cardSet} cards={[]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("No cards in this set yet.")).toBeInTheDocument();
  });
});
