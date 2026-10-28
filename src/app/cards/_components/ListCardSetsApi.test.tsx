import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";

import { ListCardSetsApi } from "./ListCardSetsApi";

type MockResponse = Pick<Response, "ok" | "status" | "json">;

const cardSets = [
  { id: "set-1", name: "algebra" },
  { id: "set-2", name: "geometry" },
];

const okResponse = (data: unknown): MockResponse => ({
  ok: true,
  status: 200,
  json: async () => data,
});

const fetchMock = vi.fn<(input: string) => Promise<MockResponse>>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ListCardSetsApi", () => {
  it("shows a loading message while fetching", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<ListCardSetsApi />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders a heading and a link for each card set", async () => {
    fetchMock.mockResolvedValue(okResponse(cardSets));

    render(<ListCardSetsApi />);

    expect(await screen.findByRole("heading", { name: "algebra" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "geometry" })).toBeInTheDocument();

    const links = await screen.findAllByRole("link", { name: "View Cardset" });
    expect(links).toHaveLength(cardSets.length);
    expect(links[0]).toHaveAttribute("href", "/cards/algebra");
    expect(links[1]).toHaveAttribute("href", "/cards/geometry");

    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("renders no card sets when the API returns an empty list", async () => {
    fetchMock.mockResolvedValue(okResponse([]));

    render(<ListCardSetsApi />);

    await waitFor(() => expect(screen.queryByText("Loading...")).toBeNull());
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
