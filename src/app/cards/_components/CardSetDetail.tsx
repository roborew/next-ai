import Link from "next/link";

import { Card } from "./Card";

export type CardSetDetailProps = {
  cardSet: { id: string; name: string };
  cards: { id: string; question: string; answer: string }[];
};

export const CardSetDetail = ({ cardSet, cards }: CardSetDetailProps) => {
  return (
    <div>
      <h1>{cardSet.name}</h1>
      <Link
        href={`/cards/${cardSet.id}/edit`}
        className="mb-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"
      >
        Edit Card Set
      </Link>

      {cards.length === 0 ? (
        <p>No cards in this set yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {cards.map((card) => (
            <Card key={card.id} question={card.question} answer={card.answer} />
          ))}
        </div>
      )}
    </div>
  );
};
