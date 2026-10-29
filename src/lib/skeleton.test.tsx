import { describe, expect, it } from "vite-plus/test";
import { render } from "@testing-library/react";

import { CardSkeleton } from "./skeleton";

describe("CardSkeleton", () => {
  it("renders a card-shaped placeholder", () => {
    const { container } = render(<CardSkeleton />);

    expect(container.firstElementChild).toHaveClass("overflow-hidden", "rounded-xl", "bg-gray-100");
  });

  it("animates the shimmer while content loads", () => {
    const { container } = render(<CardSkeleton />);

    expect(container.firstElementChild?.className).toContain("animate-[shimmer_2s_infinite]");
  });
});
