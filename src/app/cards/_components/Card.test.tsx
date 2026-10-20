import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card } from "./Card";

describe("Card", () => {
  it("starts on the question side", () => {
    render(<Card question="2 + 2?" answer="4" />);

    expect(screen.getByRole("button", { name: "2 + 2?" })).toHaveAttribute("aria-pressed", "false");
  });

  it("flips to the answer side when clicked", async () => {
    const user = userEvent.setup();
    render(<Card question="2 + 2?" answer="4" />);

    const card = screen.getByRole("button");
    await user.click(card);

    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("4")).toHaveAttribute("aria-hidden", "false");
  });

  it("flips back to the question side when clicked again", async () => {
    const user = userEvent.setup();
    render(<Card question="2 + 2?" answer="4" />);

    const card = screen.getByRole("button");
    await user.click(card);
    await user.click(card);

    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("4")).toHaveAttribute("aria-hidden", "true");
  });
});
