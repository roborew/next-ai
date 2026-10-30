import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { signInMock, signUpMock, pushMock, refreshMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signUpMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: signInMock },
    signUp: { email: signUpMock },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import Login from "./page";

beforeEach(() => {
  signInMock.mockReset();
  signUpMock.mockReset();
  pushMock.mockReset();
  refreshMock.mockReset();
  signInMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  signUpMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("Login page", () => {
  it("renders labelled email and password fields", () => {
    render(<Login />);

    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });

  it("starts in sign-in mode with a sign-in button", () => {
    render(<Login />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).toBeNull();
  });

  it("switches to sign-up mode with a name field and create button", async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.click(screen.getByRole("button", { name: "Create an account" }));

    expect(screen.getByLabelText("Name")).toBeRequired();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("signs in with the entered credentials and goes to the chat", async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "correct-horse",
      }),
    );
    expect(pushMock).toHaveBeenCalledWith("/chat");
  });

  it("signs up with name, email and password and goes to the chat", async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.click(screen.getByRole("button", { name: "Create an account" }));
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(signUpMock).toHaveBeenCalledWith({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "correct-horse",
      }),
    );
    expect(pushMock).toHaveBeenCalledWith("/chat");
  });

  it("shows the error when authentication fails", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid email or password" },
    });

    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
