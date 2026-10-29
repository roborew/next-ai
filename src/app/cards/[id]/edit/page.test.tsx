import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";

import { getCardSet } from "@/lib/data";

import Page from "./page";

vi.mock("../../_components/CardSetForm", () => ({
  CardSetForm: ({ cardSet }: { cardSet?: { id: string; name: string } }) => (
    <form aria-label="Card set form">{cardSet?.name}</form>
  ),
}));

vi.mock("@/lib/data", () => ({
  getCardSet: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const getCardSetMock = vi.mocked(getCardSet);

const cardSet = {
  id: "set-1",
  name: "Solid Principles",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  getCardSetMock.mockReset();
  getCardSetMock.mockResolvedValue(cardSet);
});

// See the card set detail page test: the async content component inside
// Suspense is called directly because Suspense is not entered client-side.
async function renderEditPage(id: string) {
  const page = Page({ params: Promise.resolve({ id }) }) as ReactElement<{
    children: ReactElement<{ params: Promise<{ id: string }> }>;
  }>;
  const content = page.props.children;
  const Content = content.type as (props: typeof content.props) => Promise<ReactElement>;

  render(await Content(content.props));
}

describe("Edit card set page", () => {
  it("fetches the card set being edited", async () => {
    await renderEditPage("set-1");

    expect(getCardSetMock).toHaveBeenCalledWith("set-1");
  });

  it("renders the edit heading", async () => {
    await renderEditPage("set-1");

    expect(screen.getByRole("heading", { level: 1, name: "Edit Card Set" })).toBeInTheDocument();
  });

  it("passes the card set to the form", async () => {
    await renderEditPage("set-1");

    expect(screen.getByRole("form", { name: "Card set form" })).toHaveTextContent(
      "Solid Principles",
    );
  });

  it("calls notFound when the card set does not exist", async () => {
    getCardSetMock.mockResolvedValue(null);

    await expect(renderEditPage("missing")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
