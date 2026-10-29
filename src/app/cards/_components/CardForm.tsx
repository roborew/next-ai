"use client";

import { useActionState } from "react";

import { createCard, type CreateCardState } from "@/lib/actions/cards";

const initialState: CreateCardState = {
  errors: {},
  message: "",
};

export const CardForm = ({ cardSetId }: { cardSetId: string }) => {
  const [state, formAction, pending] = useActionState(createCard, initialState);

  return (
    <form className="mb-6 flex flex-col gap-2" action={formAction}>
      <input type="hidden" name="cardSetId" value={cardSetId} />

      <div>
        <label htmlFor="question" className="block text-sm font-medium text-gray-700">
          Question
        </label>
        <input
          type="text"
          name="question"
          id="question"
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
        {state.errors?.question && (
          <p className="mt-2 text-sm text-red-600">{state.errors.question.join(", ")}</p>
        )}
      </div>

      <div>
        <label htmlFor="answer" className="block text-sm font-medium text-gray-700">
          Answer
        </label>
        <input
          type="text"
          name="answer"
          id="answer"
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
        {state.errors?.answer && (
          <p className="mt-2 text-sm text-red-600">{state.errors.answer.join(", ")}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        Add Card
      </button>

      {state.message && <p className="mt-2 text-sm text-green-600">{state.message}</p>}
    </form>
  );
};
