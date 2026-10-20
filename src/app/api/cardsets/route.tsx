import { db } from "@/db";
import { cardSets } from "@/db/schema";
import { desc } from "drizzle-orm";

async function listCardSets() {
  const data = await db.select().from(cardSets).orderBy(cardSets.createdAt, desc(cardSets.name));
  return data.map((set) => ({ id: set.id, name: set.name }));
}

export async function GET() {
  try {
    return Response.json(await listCardSets());
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
