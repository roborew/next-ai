"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type Mode = "signIn" | "signUp";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === "signUp";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error } = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });

    setPending(false);

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/chat");
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold mb-6">{isSignUp ? "Create account" : "Sign in"}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignUp && (
          <div className="flex flex-col gap-1">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              className="p-2 border border-zinc-300 dark:border-zinc-800 rounded"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="p-2 border border-zinc-300 dark:border-zinc-800 rounded"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="p-2 border border-zinc-300 dark:border-zinc-800 rounded"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="p-2 border border-zinc-300 dark:border-zinc-800 rounded disabled:opacity-50"
        >
          {isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 text-sm underline"
        onClick={() => {
          setMode(isSignUp ? "signIn" : "signUp");
          setError(null);
        }}
      >
        {isSignUp ? "Sign in instead" : "Create an account"}
      </button>
    </div>
  );
}
