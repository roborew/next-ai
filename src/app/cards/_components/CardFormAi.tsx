"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CardsSchema, type GeneratedCard } from "@/lib/card-schema";

const CardFormAi = ({ cardSetId }: { cardSetId: string }) => {
  const router = useRouter();
  const [text, setText] = useState("");
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async () => {
    const source = text.trim();
    if (!source || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMessage(null);
    setCards([]);

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardSetId, text: source }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const apiError =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error)
            : "Failed to generate cards.";
        setError(apiError);
        return;
      }

      const parsed = CardsSchema.safeParse(data);
      if (!parsed.success) {
        setError("Failed to generate cards.");
        return;
      }

      setCards(parsed.data.cards);
      setMessage(`${parsed.data.cards.length} cards added.`);
      setText("");
      router.refresh();
    } catch {
      setError("Failed to generate cards.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="mb-6 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Generate cards with AI</h2>

      <label htmlFor="source-text" className="block text-sm font-medium text-gray-700">
        Source text
      </label>
      <textarea
        id="source-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste the text you want to turn into flashcards..."
        className="min-h-32 rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim() || isGenerating}
        className="self-start rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? "Generating..." : "Generate Cards"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-green-600">
          {message}
        </p>
      )}

      {cards.length > 0 && (
        <ul className="flex flex-col gap-2">
          {cards.map((card, index) => (
            <li key={`${index}-${card.question}`} className="rounded-md border border-gray-200 p-3">
              <p className="font-medium">{card.question}</p>
              <p className="text-sm text-gray-600">{card.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CardFormAi;
