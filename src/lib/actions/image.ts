"use server";

import { generateImage } from "ai";
import { z } from "zod";

const PromptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "A prompt is required.")
    .max(1000, "Prompt must be 1000 characters or fewer."),
});

export type GenerateImageState = {
  prompt: string;
  image: { base64: string; mediaType: string } | null;
  error: string | null;
};

export async function generateImageAction(
  previousState: GenerateImageState,
  formData: FormData,
): Promise<GenerateImageState> {
  const validated = PromptSchema.safeParse({ prompt: formData.get("prompt") });

  if (!validated.success) {
    return {
      ...previousState,
      error: validated.error.issues[0]?.message ?? "Invalid prompt.",
    };
  }

  const { prompt } = validated.data;

  try {
    const { images } = await generateImage({
      model: "openai/gpt-image-2",
      prompt,
      n: 1,
    });

    const image = images[0];

    if (!image) {
      return {
        prompt,
        image: previousState.image,
        error: "No image was generated.",
      };
    }

    return {
      prompt,
      image: { base64: image.base64, mediaType: image.mediaType },
      error: null,
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      prompt,
      image: previousState.image,
      error: "Failed to generate the image. Please try again.",
    };
  }
}
