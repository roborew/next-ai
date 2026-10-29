import { embed } from "ai";

export async function GET() {
  const result = await embed({
    model: "openai/text-embedding-3-small",
    value: "Sunny day at the beach",
  });

  return Response.json(result);
}
