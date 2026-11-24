import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AdapterError } from "@/adapters/errors";
import { getLeagueSummary, PLATFORMS } from "@/adapters/league";
import type { PlayerSummary } from "@/adapters/types";
import RiotDisclaimer from "@/components/RiotDisclaimer";
import SourceCard from "@/components/SourceCard";

export const metadata = { title: "League lookup · MultiStat" };

async function Result({ searchParams }: { searchParams: PageProps<"/league">["searchParams"] }) {
  const params = await searchParams;
  const riotId = typeof params.riotId === "string" ? params.riotId : "";
  const region = typeof params.region === "string" ? params.region : "na1";
  if (!riotId.trim()) return null;

  await connection(); // relative times depend on the current time

  let summary: PlayerSummary | null = null;
  let errorMessage = "";
  try {
    summary = await getLeagueSummary(riotId, region);
  } catch (err) {
    errorMessage = err instanceof AdapterError ? err.message : "Something went wrong. Please try again.";
  }

  if (summary) return <SourceCard summary={summary} now={new Date(summary.fetchedAt).getTime()} />;
  return (
    <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
      {errorMessage}
    </p>
  );
}

export default function LeaguePage({ searchParams }: PageProps<"/league">) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">League of Legends lookup</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Enter a Riot ID (Name#TAG) and pick the region to see rank and recent matches.
      </p>

      <form className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          name="riotId"
          required
          placeholder="Name#TAG"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="region"
          defaultValue="na1"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {Object.entries(PLATFORMS).map(([id, p]) => (
            <option key={id} value={id}>
              {p.label}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
          Look up
        </button>
      </form>

      <div className="mt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
          <Result searchParams={searchParams} />
        </Suspense>
      </div>

      <div className="mt-10">
        <RiotDisclaimer />
      </div>
    </main>
  );
}
