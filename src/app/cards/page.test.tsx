import { describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";

import Page from "./page";

vi.mock("./_components/ListCardSets", () => ({
  ListCardSets: () => <p>Card sets loaded.</p>,
}));

describe("Cards page", () => {
  it("renders the cards heading", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { level: 1, name: "Cards" })).toBeInTheDocument();
  });

  it("links to the new card set page", () => {
    render(<Page />);

    expect(screen.getByRole("link", { name: "Create New Cardset" })).toHaveAttribute(
      "href",
      "/cards/new",
    );
  });

  it("renders the card set list", () => {
    render(<Page />);

    expect(screen.getByText("Card sets loaded.")).toBeInTheDocument();
  });
});
