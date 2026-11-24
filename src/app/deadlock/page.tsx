import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { deadlockAdapter } from "@/adapters/deadlock";
import { AdapterError } from "@/adapters/errors";
import type { PlayerSummary } from "@/adapters/types";
import SourceCard from "@/components/SourceCard";

export const metadata = { title: "Deadlock lookup · MultiStat" };

// Looks up the player (if an ID was submitted) and shows a card or an error.
async function Result({ searchParams }: { searchParams: PageProps<"/deadlock">["searchParams"] }) {
  const { id } = await searchParams;
  const input = typeof id === "string" ? id.trim() : "";
  if (!input) return null;

  await connection(); // we show relative times, so render per request

  let summary: PlayerSummary | null = null;
  let errorMessage = "";
  try {
    summary = await deadlockAdapter.getSummary(input);
  } catch (err) {
    errorMessage =
      err instanceof AdapterError ? err.message : "Something went wrong. Please try again.";
  }

  if (summary) {
    return <SourceCard summary={summary} now={new Date(summary.fetchedAt).getTime()} />;
  }
  return (
    <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
      {errorMessage}
    </p>
  );
}

export default function DeadlockPage({ searchParams }: PageProps<"/deadlock">) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Deadlock lookup</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Enter a Steam ID (the 17-digit number from your Steam profile URL) to see live stats.
      </p>

      {/* A plain HTML form: submitting it reloads the page with ?id=... */}
      <form className="mt-6 flex gap-2">
        <input
          name="id"
          required
          placeholder="e.g. 76561198000000000"
          inputMode="numeric"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
          Look up
        </button>
      </form>

      <div className="mt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
          <Result searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
