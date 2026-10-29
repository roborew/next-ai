"use client";

import { generateImageAction } from "@/lib/actions/image";
import Image from "next/image";
import { useActionState, useState } from "react";

export const ImagePromptForm = ({ defaultPrompt }: { defaultPrompt: string }) => {
  const [state, formAction, pending] = useActionState(generateImageAction, {
    prompt: defaultPrompt,
    image: null,
    error: null,
  });
  const [prompt, setPrompt] = useState(defaultPrompt);

  return (
    <div className="max-w-md">
      <form action={formAction} className="mb-6 flex flex-col gap-2">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
          Image prompt
        </label>

        <div className="flex gap-2">
          <input
            id="prompt"
            name="prompt"
            type="text"
            value={prompt}
            onChange={(event) => setPrompt(event.currentTarget.value)}
            maxLength={1000}
            required
            placeholder="Describe the image you want..."
            className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-zinc-800 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={pending}
            className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              pending ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {pending ? "Generating..." : "Generate"}
          </button>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
      </form>

      {state.image ? (
        <Image
          src={`data:${state.image.mediaType};base64,${state.image.base64}`}
          alt={state.prompt}
          width={1024}
          height={1024}
          unoptimized
          className="rounded shadow-xl"
        />
      ) : (
        <p className="text-sm text-gray-500">Submit a prompt to generate an image.</p>
      )}
    </div>
  );
};
