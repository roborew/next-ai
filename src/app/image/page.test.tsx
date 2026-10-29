import { describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";

import Page from "./page";

vi.mock("@/lib/actions/image", () => ({
  generateImageAction: vi.fn(),
}));

describe("Image page", () => {
  it("renders the prompt form with the default prompt filled in", () => {
    render(<Page />);

    expect(screen.getByLabelText("Image prompt")).toHaveValue(
      "A turquoise hummingbird resting on a dew-covered branch at sunrise.",
    );
  });

  it("offers a generate button", () => {
    render(<Page />);

    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
  });
});
