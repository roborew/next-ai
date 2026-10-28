import { db } from "@/db";
import { cardSets, cards } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const listCardSets = async () => {
  const data = await db.select().from(cardSets).orderBy(cardSets.createdAt, desc(cardSets.name));
  return data.map((set) => ({ id: set.id, name: set.name }));
};

export const getCardSet = async (id: string) => {
  const [cardSet] = await db.select().from(cardSets).where(eq(cardSets.id, id)).limit(1);
  return cardSet ?? null;
};

export const listCardsForSet = async (cardSetId: string) => {
  return db.select().from(cards).where(eq(cards.cardSetId, cardSetId));
};
