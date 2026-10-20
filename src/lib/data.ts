import { db } from "@/db";
import { cardSets } from "@/db/schema";
import { desc } from "drizzle-orm";

export const listCardSets = async () => {
  const data = await db.select().from(cardSets).orderBy(cardSets.createdAt, desc(cardSets.name));
  return data.map((set) => ({ id: set.id, name: set.name }));
};
