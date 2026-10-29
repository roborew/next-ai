import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";

import Page from "./page";

const { generateTextMock, generateMock, connectionMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  generateMock: vi.fn(),
  connectionMock: vi.fn(async () => {}),
}));

vi.mock("ai", () => ({
  generateText: generateTextMock,
  Output: { object: vi.fn((config: unknown) => config) },
  tool: vi.fn((config: unknown) => config),
  ToolLoopAgent: class {
    generate = generateMock;
  },
}));

vi.mock("next/server", () => ({
  connection: connectionMock,
}));

beforeEach(() => {
  generateMock.mockReset();
  generateMock.mockResolvedValue({ text: "It is 72°F and sunny in Tokyo." });

  generateTextMock.mockReset();
  generateTextMock
    .mockResolvedValueOnce({ output: { name: "John", age: 30, city: "NYC" } })
    .mockResolvedValueOnce({
      output: {
        name: "Merino Trail Crew",
        price: 24.5,
        description: "Lightweight merino hiking socks.",
        category: "clothing",
        tags: ["merino", "hiking", "socks"],
      },
    });

  connectionMock.mockClear();
});

// The examples are rendered by an async component inside Suspense. Suspense is
// not entered during a client render, so that component is called directly and
// its resolved output is rendered, matching the other Server Component tests.
async function renderExamples() {
  const page = Page() as ReactElement<{ children: ReactElement[] }>;
  const [suspense] = page.props.children.filter(
    (child) => (child.props as { fallback?: ReactElement }).fallback !== undefined,
  );

  if (!suspense) {
    throw new Error("The examples page is expected to render a Suspense boundary.");
  }

  const examples = (suspense.props as { children: ReactElement }).children;
  const Examples = examples.type as () => Promise<ReactElement>;

  render(await Examples());
}

describe("Examples page", () => {
  it("renders the page heading and a loading fallback", () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: "AI SDK v7 examples" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Generating examples…")).toBeInTheDocument();
  });

  it("opts into request-time rendering before calling the models", async () => {
    await renderExamples();

    expect(connectionMock).toHaveBeenCalledTimes(1);
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it("renders the tool-calling agent output", async () => {
    await renderExamples();

    expect(
      screen.getByRole("heading", { level: 2, name: "ToolLoopAgent (tool call + text)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("It is 72°F and sunny in Tokyo.")).toBeInTheDocument();
  });

  it("renders the extracted person", async () => {
    await renderExamples();

    expect(
      screen.getByRole("heading", { level: 2, name: "generateText + Output.object" }),
    ).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("NYC")).toBeInTheDocument();
  });

  it("renders the extracted product with a formatted price", async () => {
    await renderExamples();

    expect(
      screen.getByRole("heading", { level: 2, name: "Structured extraction" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Merino Trail Crew")).toBeInTheDocument();
    expect(screen.getByText("$24.50")).toBeInTheDocument();
    expect(screen.getByText("Lightweight merino hiking socks.")).toBeInTheDocument();
    expect(screen.getByText("clothing")).toBeInTheDocument();
    expect(screen.getByText("merino · hiking · socks")).toBeInTheDocument();
  });
});
