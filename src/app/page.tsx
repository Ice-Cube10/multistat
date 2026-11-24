import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { PlayerSummary, Source } from "@/adapters/types";
import { createDemoAdapter } from "@/demo/demoAdapter";
import SourceCard from "@/components/SourceCard";

// The sources shown on the dashboard, in priority order.
const SOURCES: Source[] = ["deadlock", "youtube", "league", "spotify"];

// Loads each source's data and draws the cards. This is a server component,
// so it runs on the server (where API keys will be safe later).
async function Dashboard() {
  // The demo data contains "N hours ago" dates, which depend on the current
  // time. `connection()` tells Next.js "compute this on each request".
  await connection();

  const summaries: PlayerSummary[] = await Promise.all(
    SOURCES.map((source) => createDemoAdapter(source).getSummary("demo")),
  );
  // "Now" for the "3h ago" labels: use the time the data was fetched.
  const now = new Date(summaries[0].fetchedAt).getTime();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {summaries.map((summary) => (
        <SourceCard key={summary.source} summary={summary} now={now} />
      ))}
    </div>
  );
}

// Gray placeholder boxes shown while the data loads.
function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {SOURCES.map((s) => (
        <div key={s} className="h-96 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">MultiStat</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          All your game and media stats in one place.
        </p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          You&apos;re viewing <strong>demo mode</strong>: every number below is sample data, so you
          can explore without logging in.
        </p>
        <p className="mt-3 text-sm">
          Have a Steam ID?{" "}
          <Link href="/deadlock" className="font-medium underline">
            Look up live Deadlock stats
          </Link>
          {" · "}
          <Link href="/youtube" className="font-medium underline">
            Upload your YouTube history
          </Link>
        </p>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
