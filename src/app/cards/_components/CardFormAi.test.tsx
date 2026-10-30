import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CardFormAi from "./CardFormAi";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const cardSetId = "11111111-1111-4111-8111-111111111111";

const generated = [
  { question: "What is a design pattern?", answer: "A reusable solution to a common problem." },
  { question: "Is a pattern code?", answer: "No, it is a general concept." },
];

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: async () => body,
});

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  refreshMock.mockReset();
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const renderForm = () => render(<CardFormAi cardSetId={cardSetId} />);

const submit = async (
  user: ReturnType<typeof userEvent.setup>,
  text = "Design patterns are...",
) => {
  await user.type(screen.getByLabelText("Source text"), text);
  await user.click(screen.getByRole("button", { name: "Generate Cards" }));
};

describe("CardFormAi", () => {
  it("renders a labelled source text field and a generate button", () => {
    renderForm();

    expect(screen.getByLabelText("Source text")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Cards" })).toBeInTheDocument();
  });

  it("only enables generation when there is non-whitespace text", async () => {
    const user = userEvent.setup();
    renderForm();
    const button = screen.getByRole("button", { name: "Generate Cards" });

    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText("Source text"), "   ");
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText("Source text"), "hello");
    expect(button).toBeEnabled();
  });

  it("posts the card set id and trimmed text to the cards API", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ cards: generated }));
    const user = userEvent.setup();
    renderForm();

    await submit(user, "  Design patterns are...  ");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardSetId, text: "Design patterns are..." }),
      }),
    );
  });

  it("renders the saved cards and confirms how many were added", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ cards: generated }));
    const user = userEvent.setup();
    renderForm();

    await submit(user);

    expect(await screen.findByText(generated[0].question)).toBeInTheDocument();
    expect(screen.getByText(generated[0].answer)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 cards added.");
  });

  it("clears the source text and refreshes the route after saving", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ cards: generated }));
    const user = userEvent.setup();
    renderForm();

    await submit(user);

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(screen.getByLabelText("Source text")).toHaveValue("");
  });

  it("shows the error returned by the API", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "No cards could be generated from that text." }, false),
    );
    const user = userEvent.setup();
    renderForm();

    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No cards could be generated from that text.",
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the API fails without an error body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, false));
    const user = userEvent.setup();
    renderForm();

    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to generate cards.");
  });

  it("reports a generic error when the response has the wrong shape", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ cards: "nope" }));
    const user = userEvent.setup();
    renderForm();

    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to generate cards.");
  });

  it("reports a generic error when the request rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderForm();

    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to generate cards.");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("disables the button while a request is in flight", async () => {
    let resolveFetch!: (value: unknown) => void;
    fetchMock.mockReturnValue(
      new Promise<unknown>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await submit(user);

    expect(screen.getByRole("button", { name: "Generating..." })).toBeDisabled();

    resolveFetch(jsonResponse({ cards: generated }));

    expect(await screen.findByText(generated[0].question)).toBeInTheDocument();
  });
});
