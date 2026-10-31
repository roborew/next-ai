import { generateText, Output } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CardsSchema } from "@/lib/card-schema";
import { cards, createCards, getCardSet } from "@/lib/data";
import { CARD_PROMPT } from "@/lib/prompt";
import { requireSession } from "@/lib/api-guard";
import { enforceRateLimit } from "@/lib/rate-limit";

const MODEL = "openai/o4-mini";
const MAX_TEXT_LENGTH = 20_000;

export { CardSchema, CardsSchema } from "@/lib/card-schema";

const RequestSchema = z.object({
  cardSetId: z.uuid("Invalid card set."),
  text: z.string().trim().min(1, "Text is required.").max(MAX_TEXT_LENGTH, "Text is too long."),
});

export async function POST(request: Request) {
  const session = await requireSession(request);
  if (session instanceof Response) return session;

  const limited = await enforceRateLimit("cards", session.user.id);
  if (limited) return limited;

  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { cardSetId, text } = parsed.data;

  // Check before spending on the model.
  const cardSet = await getCardSet(cardSetId);
  if (!cardSet) {
    return Response.json({ error: "Card set not found." }, { status: 404 });
  }

  const prompt = CARD_PROMPT.replace("{{TEXT}}", () => text);

  let output: z.infer<typeof CardsSchema>;
  try {
    ({ output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: CardsSchema }),
      prompt,
    }));
  } catch (error) {
    console.error("Error generating cards:", error);
    return Response.json({ error: "Failed to generate cards." }, { status: 502 });
  }

  const cardsToSave: cards = output.cards
    .map((card) => ({
      question: card.question.trim(),
      answer: card.answer.trim(),
    }))
    .filter((card) => card.question.length > 0 && card.answer.length > 0);

  if (cardsToSave.length === 0) {
    return Response.json({ error: "No cards could be generated from that text." }, { status: 422 });
  }

  try {
    const saved = await createCards(cardSetId, cardsToSave);

    if (!saved) {
      return Response.json({ error: "Invalid card set." }, { status: 400 });
    }

    revalidatePath(`/cards/${cardSetId}`);
    return Response.json({ cards: saved });
  } catch (error) {
    console.error("Error saving cards:", error);
    return Response.json({ error: "Failed to save cards." }, { status: 500 });
  }
}
