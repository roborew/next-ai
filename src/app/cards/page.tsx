"use client";

import Link from "next/link";
import { useState } from "react";
import { CardSet, CardSetProps } from "./_components/CardSet";

const CardSetData: CardSetProps = {
  SetName: "Sample Card Set",
  CardList: [
    { question: "What is the capital of France?", answer: "Paris" },
    { question: "What is 2 + 2?", answer: "4" },
  ],
};
export default function Page() {
  const [cardSet] = useState<CardSetProps>(CardSetData);

  return (
    <div>
      <Link
        href="/cards/new"
        className="mb-4 inline-block rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Create New Cardset
      </Link>
      <CardSet SetName={cardSet.SetName} CardList={cardSet.CardList} />
    </div>
  );
}
