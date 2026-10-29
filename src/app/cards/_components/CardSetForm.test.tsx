import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createCardSet, updateCardSet } from "@/lib/actions/cards";

import { CardSetForm } from "./CardSetForm";

// CardSetForm is a Client Component, so the server actions it imports must exist
// as callable stubs before it renders. They are asserted against in the action
// tests; here they only need to be substitutable.
vi.mock("@/lib/actions/cards", () => ({
  createCardSet: vi.fn(async () => ({ message: "" })),
  updateCardSet: vi.fn(async () => ({ message: "" })),
}));

const createCardSetMock = vi.mocked(createCardSet);
const updateCardSetMock = vi.mocked(updateCardSet);

beforeEach(() => {
  createCardSetMock.mockReset();
  createCardSetMock.mockResolvedValue({ message: "" });
  updateCardSetMock.mockReset();
  updateCardSetMock.mockResolvedValue({ message: "" });
});

describe("CardSetForm (create)", () => {
  it("renders a labelled name field", () => {
    render(<CardSetForm />);

    expect(screen.getByLabelText("Card Set Name")).toBeInTheDocument();
  });

  it("starts with an empty name field", () => {
    render(<CardSetForm />);

    expect(screen.getByLabelText("Card Set Name")).toHaveValue("");
  });

  it("offers a create button", () => {
    render(<CardSetForm />);

    expect(screen.getByRole("button", { name: "Create Card Set" })).toBeInTheDocument();
  });

  it("sumits through a form carrying the named field", () => {
    const { container } = render(<CardSetForm />);

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    // The action reads this exact name, so a rename here silently drops the
    // field rather than failing loudly.
    expect(form?.querySelector('[name="name"]')).not.toBeNull();
  });

  it("marks the name field as required", () => {
    render(<CardSetForm />);

    expect(screen.getByLabelText("Card Set Name")).toBeRequired();
  });
});

describe("CardSetForm (edit)", () => {
  it("prefills the name from the card set", () => {
    render(<CardSetForm cardSet={{ id: "set-1", name: "Solid Principles" }} />);

    expect(screen.getByLabelText("Card Set Name")).toHaveValue("Solid Principles");
  });

  it("carries the card set id in a hidden field", () => {
    const { container } = render(
      <CardSetForm cardSet={{ id: "set-1", name: "Solid Principles" }} />,
    );

    const hidden = container.querySelector('input[name="id"]');
    expect(hidden).toHaveValue("set-1");
    expect(hidden).toHaveAttribute("type", "hidden");
  });

  it("offers an update button instead of a create button", () => {
    render(<CardSetForm cardSet={{ id: "set-1", name: "Solid Principles" }} />);

    expect(screen.getByRole("button", { name: "Update Card Set" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Card Set" })).toBeNull();
  });
});

describe("CardSetForm (action wiring)", () => {
  it("calls createCardSet when creating", async () => {
    const user = userEvent.setup();
    render(<CardSetForm />);

    await user.type(screen.getByLabelText("Card Set Name"), "Solid Principles");
    await user.click(screen.getByRole("button", { name: "Create Card Set" }));

    await waitFor(() => expect(createCardSetMock).toHaveBeenCalledTimes(1));
    expect(updateCardSetMock).not.toHaveBeenCalled();
  });

  it("calls updateCardSet when editing", async () => {
    const user = userEvent.setup();
    render(<CardSetForm cardSet={{ id: "set-1", name: "Solid Principles" }} />);

    await user.click(screen.getByRole("button", { name: "Update Card Set" }));

    await waitFor(() => expect(updateCardSetMock).toHaveBeenCalledTimes(1));
    expect(createCardSetMock).not.toHaveBeenCalled();
  });
});

describe("CardSetForm (action feedback)", () => {
  it("shows the name errors returned by the action", async () => {
    createCardSetMock.mockResolvedValueOnce({
      errors: { name: ["Card set name is required."] },
      message: "Validation failed.",
    });

    const user = userEvent.setup();
    render(<CardSetForm />);

    await user.type(screen.getByLabelText("Card Set Name"), "Solid Principles");
    await user.click(screen.getByRole("button", { name: "Create Card Set" }));

    expect(await screen.findByText("Card set name is required.")).toBeInTheDocument();
  });

  it("shows the message returned by the action", async () => {
    createCardSetMock.mockResolvedValueOnce({ message: "Card set created." });

    const user = userEvent.setup();
    render(<CardSetForm />);

    await user.type(screen.getByLabelText("Card Set Name"), "Solid Principles");
    await user.click(screen.getByRole("button", { name: "Create Card Set" }));

    expect(await screen.findByText("Card set created.")).toBeInTheDocument();
  });
});
