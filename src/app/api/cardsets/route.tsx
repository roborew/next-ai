import { listCardSets } from "@/lib/data";

export async function GET() {
  try {
    return Response.json(await listCardSets());
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
