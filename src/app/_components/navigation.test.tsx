import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { usePathnameMock, pushMock, useSessionMock, signOutMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/"),
  pushMock: vi.fn(),
  useSessionMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: useSessionMock,
    signOut: signOutMock,
  },
}));

import Navigation from "./navigation";
import { NAV_ITEMS } from "@/lib/nav";

beforeEach(() => {
  usePathnameMock.mockReturnValue("/");
  pushMock.mockReset();
  useSessionMock.mockReset();
  useSessionMock.mockReturnValue({ data: null });
  signOutMock.mockReset();
  signOutMock.mockResolvedValue({ data: { success: true }, error: null });
});

describe("Navigation", () => {
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

  it("hides the sign-out button when nobody is signed in", () => {
    render(<Navigation />);

    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("signs out and returns to the login page when a session exists", async () => {
    useSessionMock.mockReturnValue({ data: { user: { id: "user-1" } } });

    const user = userEvent.setup();
    render(<Navigation />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
