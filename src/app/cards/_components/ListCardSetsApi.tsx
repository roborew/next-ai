"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type CardSetSummary = {
  id: string;
  name: string;
};

export const ListCardSetsApi = () => {
  const [cardSets, setCardSets] = useState<CardSetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCards() {
      try {
        const res = await fetch("/api/cardsets");
        if (!res.ok) {
          throw new Error(`Failed to fetch cards: ${res.status}`);
        }
        const data: CardSetSummary[] = await res.json();
        setCardSets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
    void loadCards();
  }, []);

  return (
    <>
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {cardSets.map((set) => (
        <div key={set.id} className="mb-4">
          <h2>{set.name}</h2>
          <Link href={`/cards/${set.name}`} className="...">
            View Cardset
          </Link>
        </div>
      ))}
    </>
  );
};
