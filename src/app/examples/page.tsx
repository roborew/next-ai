import { Output, ToolLoopAgent, generateText, tool } from "ai";
import { Suspense } from "react";
import { connection } from "next/server";
import { z } from "zod";

const MODEL = "openai/o4-mini";

// Sample input for the extraction example. Swap this for user/database input.
const productText =
  "The Fern & Field Merino Trail Crew is a lightweight merino wool hiking sock made for long days on the trail. It costs $24.50 and comes in three sizes. The reinforced heel and toe are designed to reduce blisters, and the breathable knit keeps feet dry in warm weather. Machine washable and backed by a two-year replacement guarantee.";

const PersonSchema = z.object({
  name: z.string().describe("Full name of the person"),
  age: z.number().int().describe("Age in years"),
  city: z.string().describe("City the person lives in"),
});

const ProductSchema = z.object({
  name: z.string().describe("Product name"),
  price: z.number().describe("Price in USD as a number, no currency symbol"),
  description: z.string().describe("One or two sentence summary"),
  category: z.enum(["electronics", "clothing", "home"]),
  tags: z.array(z.string()).describe("Three to six short keywords"),
});

const weatherAgent = new ToolLoopAgent({
  model: MODEL,
  tools: {
    getWeather: tool({
      description: "Get the current weather for a location",
      inputSchema: z.object({ location: z.string() }),
      execute: async ({ location }) => ({
        location,
        temperature: 72,
        condition: "sunny",
      }),
    }),
  },
});

async function runExamples() {
  const [weather, person, product] = await Promise.all([
    weatherAgent.generate({ prompt: "What's the weather in Tokyo?" }),

    // v7 structured output: generateText + output, not generateObject.
    generateText({
      model: MODEL,
      output: Output.object({ schema: PersonSchema }),
      prompt: "Extract: John is 30 years old and lives in NYC.",
    }),

    generateText({
      model: MODEL,
      output: Output.object({ schema: ProductSchema }),
      prompt: `Extract product details from this text:\n\n${productText}`,
    }),
  ]);

  return {
    weather: weather.text,
    person: person.output,
    product: product.output,
  };
}

async function Examples() {
  // Cache Components prerenders pages; opt this subtree into request-time
  // rendering so the model calls don't run during `next build`.
  await connection();

  const { weather, person, product } = await runExamples();

  return (
    <div>
      <section>
        <h2>ToolLoopAgent (tool call + text)</h2>
        <p>{weather}</p>
      </section>

      <section>
        <h2>generateText + Output.object</h2>
        <dl>
          <dt>Name</dt>
          <dd>{person.name}</dd>
          <dt>Age</dt>
          <dd>{person.age}</dd>
          <dt>City</dt>
          <dd>{person.city}</dd>
        </dl>
      </section>

      <section>
        <h2>Structured extraction</h2>
        <dl>
          <dt>Name</dt>
          <dd>{product.name}</dd>
          <dt>Price</dt>
          <dd>${product.price.toFixed(2)}</dd>
          <dt>Description</dt>
          <dd>{product.description}</dd>
          <dt>Category</dt>
          <dd>{product.category}</dd>
          <dt>Tags</dt>
          <dd>{product.tags.join(" · ")}</dd>
        </dl>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <main>
      <h1>AI SDK v7 examples</h1>
      <Suspense fallback={<p>Generating examples…</p>}>
        <Examples />
      </Suspense>
    </main>
  );
}
