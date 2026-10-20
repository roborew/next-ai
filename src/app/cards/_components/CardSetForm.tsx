"use client";
import { createCardSet, updateCardSet, type CreateCardSetState } from "@/lib/actions";
import { useActionState, useState } from "react";

const initialState: CreateCardSetState = {
  errors: {},
  message: "",
};

export const CardSetForm = ({ cardSet }: { cardSet?: { id: string; name: string } }) => {
  const isEdit = cardSet !== undefined;

  const action = isEdit ? updateCardSet : createCardSet;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name] = useState(cardSet?.name || "");

  return (
    <form className="mg-4" action={formAction}>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Card Set Name
        </label>
        <input
          type="text"
          name="name"
          id="name"
          defaultValue={name || ""}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-2"
          required
        />
        {state.errors?.name && (
          <p className="mt-2 text-sm text-red-600">{state.errors.name.join(", ")}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isEdit ? "Update Card Set" : "Create Card Set"}
      </button>

      {state.message && <p className="mt-2 text-sm text-green-600">{state.message}</p>}
    </form>
  );
};
