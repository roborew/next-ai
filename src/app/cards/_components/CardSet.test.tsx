import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardSetData } from "../../../../tests/fixtures/card";
import { CardSet } from "./CardSet";

describe("CardSet", () => {
  it("renders a card for each item in the list", () => {
    render(<CardSet SetName={CardSetData.SetName} CardList={CardSetData.CardList} />);
    expect(screen.getAllByRole("button")).toHaveLength(CardSetData.CardList.length);
    for (const card of CardSetData.CardList) {
      expect(screen.getByRole("button", { name: card.question })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });

  it("renders no cards when the list is empty", () => {
    render(<CardSet SetName="Solid Princibles" CardList={[]} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("flips only the clicked card", async () => {
    const user = userEvent.setup();
    render(<CardSet SetName={CardSetData.SetName} CardList={CardSetData.CardList} />);

    const [first, second] = screen.getAllByRole("button");
    await user.click(first);

    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("aria-pressed", "false");
  });
});
