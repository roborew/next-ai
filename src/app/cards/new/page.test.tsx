import { describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";

import Page from "./page";

vi.mock("../_components/CardSetForm", () => ({
  CardSetForm: () => <form aria-label="Card set form" />,
}));

describe("New card set page", () => {
  it("renders the new card set heading", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { level: 1, name: "New Cardset" })).toBeInTheDocument();
  });

  it("renders the card set form", () => {
    render(<Page />);

    expect(screen.getByRole("form", { name: "Card set form" })).toBeInTheDocument();
  });
});
