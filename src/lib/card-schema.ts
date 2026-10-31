import { z } from "zod";

export const CardSchema = z.object({
  question: z.string().describe("Question"),
  answer: z.string().describe("One or two sentence summary"),
});

export const CardsSchema = z.object({
  cards: z.array(CardSchema),
});

export type GeneratedCard = z.infer<typeof CardSchema>;
export type GeneratedCards = z.infer<typeof CardsSchema>;
