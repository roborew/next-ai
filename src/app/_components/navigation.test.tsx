import { describe, expect, it, vi, beforeEach } from "vite-plus/test";
import { render, screen, within } from "@testing-library/react";
import Navigation from "./navigation";
import { NAV_ITEMS } from "@/src/lib/nav";

const usePathname = vi.fn(() => "/");

describe("Navigation", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  it("renders a nav landmark", () => {
    render(<Navigation />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  NAV_ITEMS.forEach((item) => {
    it(`links to ${item.href} with the label "${item.label}"`, () => {
      render(<Navigation />);

      const nav = screen.getByRole("navigation");
      const link = within(nav).getByRole("link", { name: item.label });

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", item.href);
    });
  });
});
