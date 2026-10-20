"use client";

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
  const [cardSet, setCardSet] = useState<CardSetProps>(CardSetData);

  async function handleAddCard(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("Form submitted:", event.currentTarget);
    const formData = new FormData(event.currentTarget);
    const question = formData.get("question") as string;
    const answer = formData.get("answer") as string;
    console.log("Adding card:", { question, answer });
    if (question && answer) {
      setCardSet({
        SetName: cardSet.SetName,
        CardList: [{ question, answer }, ...cardSet.CardList],
      });
      event.currentTarget.reset();
    }
  }

  return (
    <div>
      <h1>Cards</h1>
      <div className="mb-4">
        <h2>Add a New Card</h2>
        <form className="flex flex-col gap-2" onSubmit={handleAddCard}>
          <input name="question" type="text" placeholder="Question" />
          <input name="answer" type="text" placeholder="Answer" />
          <button type="submit">Add Card</button>
        </form>
      </div>
      <CardSet SetName={cardSet.SetName} CardList={cardSet.CardList} />{" "}
    </div>
  );
}
