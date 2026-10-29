import { generateImage } from "ai";
import { z } from "zod";

const PromptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "A prompt is required.")
    .max(1000, "Prompt must be 1000 characters or fewer."),
});

export async function POST(request: Request) {
  const validated = PromptSchema.safeParse(await request.json().catch(() => null));

  if (!validated.success) {
    return Response.json(
      { error: validated.error.issues[0]?.message ?? "Invalid prompt." },
      { status: 400 },
    );
  }

  try {
    const { images } = await generateImage({
      model: "openai/gpt-image-2",
      prompt: validated.data.prompt,
      n: 1,
    });

    const image = images[0];

    if (!image) {
      return Response.json({ error: "No image was generated." }, { status: 502 });
    }

    // Copy into an ArrayBuffer-backed view so the body satisfies BodyInit.
    return new Response(new Uint8Array(image.uint8Array), {
      headers: {
        "Content-Type": image.mediaType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return Response.json(
      { error: "Failed to generate the image. Please try again." },
      { status: 500 },
    );
  }
}
