import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";

import { listCardSets } from "@/lib/data";

import { ListCardSets } from "./ListCardSets";

// The component is an async Server Component, so it is called directly and its
// resolved output is rendered rather than rendering the component itself.
vi.mock("@/lib/data", () => ({
  listCardSets: vi.fn(),
}));

const listCardSetsMock = vi.mocked(listCardSets);

beforeEach(() => {
  listCardSetsMock.mockReset();
});

describe("ListCardSets", () => {
  it("renders a heading for each card set", async () => {
    listCardSetsMock.mockResolvedValue([
      { id: "set-1", name: "Solid Principles" },
      { id: "set-2", name: "Design Patterns" },
    ]);

    render(await ListCardSets());

    expect(screen.getByRole("heading", { name: "Solid Principles", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Design Patterns", level: 3 })).toBeInTheDocument();
  });

  it("links each card set to its detail page", async () => {
    listCardSetsMock.mockResolvedValue([
      { id: "set-1", name: "Solid Principles" },
      { id: "set-2", name: "Design Patterns" },
    ]);

    render(await ListCardSets());

    expect(screen.getByRole("link", { name: "Solid Principles" })).toHaveAttribute(
      "href",
      "/cards/set-1",
    );
    expect(screen.getByRole("link", { name: "Design Patterns" })).toHaveAttribute(
      "href",
      "/cards/set-2",
    );
  });

  it("shows a friendly empty state when there are no card sets", async () => {
    listCardSetsMock.mockResolvedValue([]);

    render(await ListCardSets());

    expect(screen.queryAllByRole("heading")).toHaveLength(0);
    expect(screen.getByText("No card sets yet. Create one to get started.")).toBeInTheDocument();
  });
});
