import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";

import { listCardsForSet, getCardSet } from "@/lib/data";

import Page from "./page";

// These components are Client Components that pull in server actions, so they
// are stubbed to keep this test focused on what the page fetches and passes on.
vi.mock("../_components/CardForm", () => ({
  CardForm: ({ cardSetId }: { cardSetId: string }) => (
    <form aria-label="Card form">{cardSetId}</form>
  ),
}));

vi.mock("../_components/CardSetDetail", () => ({
  CardSetDetail: ({ cardSet }: { cardSet: { name: string } }) => <h1>{cardSet.name}</h1>,
}));

vi.mock("@/lib/data", () => ({
  getCardSet: vi.fn(),
  listCardsForSet: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const getCardSetMock = vi.mocked(getCardSet);
const listCardsForSetMock = vi.mocked(listCardsForSet);

const cardSet = {
  id: "set-1",
  name: "Solid Principles",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const cards = [
  {
    id: "card-1",
    cardSetId: "set-1",
    question: "What is SOLID?",
    answer: "Five principles.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

beforeEach(() => {
  getCardSetMock.mockReset();
  getCardSetMock.mockResolvedValue(cardSet);
  listCardsForSetMock.mockReset();
  listCardsForSetMock.mockResolvedValue(cards);
});

// The page is a Server Component wrapping its content in Suspense. Suspense
// boundaries are not entered during a client render, so the async content
// component is called directly and its resolved output is rendered.
async function renderCardSetPage(id: string) {
  const page = Page({ params: Promise.resolve({ id }) }) as ReactElement<{
    children: ReactElement<{ params: Promise<{ id: string }> }>;
  }>;
  const content = page.props.children;
  const Content = content.type as (props: typeof content.props) => Promise<ReactElement>;

  render(await Content(content.props));
}

describe("Card set page", () => {
  it("fetches the card set and its cards", async () => {
    await renderCardSetPage("set-1");

    expect(getCardSetMock).toHaveBeenCalledWith("set-1");
    expect(listCardsForSetMock).toHaveBeenCalledWith("set-1");
  });

  it("renders the add card form for the card set", async () => {
    await renderCardSetPage("set-1");

    expect(screen.getByRole("form", { name: "Card form" })).toHaveTextContent("set-1");
  });

  it("renders the card set detail", async () => {
    await renderCardSetPage("set-1");

    expect(screen.getByRole("heading", { level: 1, name: "Solid Principles" })).toBeInTheDocument();
  });

  it("calls notFound when the card set does not exist", async () => {
    getCardSetMock.mockResolvedValue(null);

    await expect(renderCardSetPage("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(listCardsForSetMock).not.toHaveBeenCalled();
  });
});
