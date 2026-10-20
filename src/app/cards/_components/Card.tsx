"use client";

import { useState } from "react";

export type CardProps = {
  question: string;
  answer: string;
};

export const Card = ({ question, answer }: CardProps) => {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="w-96 perspective-[1000px]">
      <button
        type="button"
        onClick={() => setShowAnswer((shown) => !shown)}
        aria-pressed={showAnswer}
        className={`relative block h-64 w-full cursor-pointer transform-3d text-center transition-transform duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 ${
          showAnswer ? "rotate-y-180" : ""
        }`}
      >
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 text-lg font-semibold shadow-xl backface-hidden dark:border-zinc-700 dark:bg-zinc-900">
          {question}
        </span>

        <span
          aria-hidden={!showAnswer}
          className="absolute inset-0 flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 text-base shadow-xl backface-hidden rotate-y-180 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {answer}
        </span>
      </button>
    </div>
  );
};
