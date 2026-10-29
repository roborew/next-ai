import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { generateImageAction, type GenerateImageState } from "@/lib/actions/image";

import { ImagePromptForm } from "./ImagePromptForm";

// ImagePromptForm is a Client Component, so the server action it imports must
// exist as a callable stub before it renders.
vi.mock("@/lib/actions/image", () => ({
  generateImageAction: vi.fn(),
}));

const generateImageActionMock = vi.mocked(generateImageAction);

const defaultPrompt = "A turquoise hummingbird on a branch.";

const imageState: GenerateImageState = {
  prompt: "A red panda reading a book.",
  image: { base64: "aGVsbG8=", mediaType: "image/png" },
  error: null,
};

beforeEach(() => {
  generateImageActionMock.mockReset();
  generateImageActionMock.mockResolvedValue({ prompt: defaultPrompt, image: null, error: null });
});

describe("ImagePromptForm", () => {
  it("renders a labelled prompt field prefilled with the default prompt", () => {
    render(<ImagePromptForm defaultPrompt={defaultPrompt} />);

    expect(screen.getByLabelText("Image prompt")).toHaveValue(defaultPrompt);
  });

  it("limits the prompt to the length accepted by the action", () => {
    render(<ImagePromptForm defaultPrompt={defaultPrompt} />);

    const input = screen.getByLabelText("Image prompt");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("maxLength", "1000");
  });

  it("prompts the user to submit before an image exists", () => {
    render(<ImagePromptForm defaultPrompt={defaultPrompt} />);

    expect(screen.getByText("Submit a prompt to generate an image.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("submits the typed prompt through the generateImage action", async () => {
    const user = userEvent.setup();
    render(<ImagePromptForm defaultPrompt={defaultPrompt} />);

    const input = screen.getByLabelText("Image prompt");
    await user.clear(input);
    await user.type(input, "A red panda reading a book.");
    await user.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => expect(generateImageActionMock).toHaveBeenCalledTimes(1));

    const formData = generateImageActionMock.mock.calls[0]?.[1];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get("prompt")).toBe("A red panda reading a book.");
  });

  it("renders the generated image with the prompt as alt text", async () => {
    generateImageActionMock.mockResolvedValueOnce(imageState);

    const user = userEvent.setup();
    render(<ImagePromptForm defaultPrompt={defaultPrompt} />);

    await user.click(screen.getByRole("button", { name: "Generate" }));

    const image = await screen.findByRole("img", { name: imageState.prompt });
    expect(image).toHaveAttribute(
      "src",
      `data:${imageState.image?.mediaType};base64,${imageState.image?.base64}`,
    );
    expect(screen.queryByText("Submit a prompt to generate an image.")).not.toBeInTheDocument();
  });

  it("shows the error returned by the action", async () => {
    generateImageActionMock.mockResolvedValueOnce({
      prompt: defaultPrompt,
      image: null,
      error: "Failed to generate the image. Please try again.",
    });

    const user = userEvent.setup();
    render(<ImagePromptForm defaultPrompt={defaultPrompt} />);

    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to generate the image. Please try again.",
    );
  });

  it("disables the button while the action is pending", async () => {
    let resolveAction: ((state: GenerateImageState) => void) | undefined;

    generateImageActionMock.mockImplementationOnce(
      () =>
        new Promise<GenerateImageState>((resolve) => {
          resolveAction = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<ImagePromptForm defaultPrompt={defaultPrompt} />);

    await user.click(screen.getByRole("button", { name: "Generate" }));

    const pendingButton = await screen.findByRole("button", { name: "Generating..." });
    expect(pendingButton).toBeDisabled();

    resolveAction?.({ prompt: defaultPrompt, image: null, error: null });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generate" })).not.toBeDisabled(),
    );
  });
});
