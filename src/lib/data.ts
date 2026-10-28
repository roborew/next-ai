import { db } from "@/db";
import { cardSets, cards } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

// Postgres rejects malformed uuid literals with a query error rather than an
// empty result, so ids are validated before they reach the database.
const UuidSchema = z.uuid();

export const listCardSets = async () => {
  const data = await db.select().from(cardSets).orderBy(cardSets.createdAt, desc(cardSets.name));
  return data.map((set) => ({ id: set.id, name: set.name }));
};

export const getCardSet = async (id: string) => {
  if (!UuidSchema.safeParse(id).success) {
    return null;
  }

  const [cardSet] = await db.select().from(cardSets).where(eq(cardSets.id, id)).limit(1);
  return cardSet ?? null;
};

export const listCardsForSet = async (cardSetId: string) => {
  if (!UuidSchema.safeParse(cardSetId).success) {
    return [];
  }

  return db.select().from(cards).where(eq(cards.cardSetId, cardSetId));
};
