import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";

import Page from "./page";

describe("About page", () => {
  it("renders the about heading", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
  });

  it("explains what the sandbox is for", () => {
    render(<Page />);

    expect(
      screen.getByText(/sandbox to test and implement various AI integrations/i),
    ).toBeInTheDocument();
  });
});
