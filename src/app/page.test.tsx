import { describe, expect, it } from "vite-plus/test";
import { render, screen } from "@testing-library/react";

import Home from "./page";

describe("Home page", () => {
  it("renders the home heading", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
  });
});
