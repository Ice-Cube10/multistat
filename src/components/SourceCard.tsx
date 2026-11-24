// One dashboard card: shows a single source's headline stats and recent items.
// It only knows about PlayerSummary, never about any specific API.

import type { PlayerSummary, RecentItem, Source } from "@/adapters/types";

// Display name and accent color for each source.
const SOURCE_META: Record<Source, { name: string; accent: string; recentTitle: string }> = {
  deadlock: { name: "Deadlock", accent: "bg-amber-500", recentTitle: "Recent matches" },
  youtube: { name: "YouTube", accent: "bg-red-500", recentTitle: "Recent uploads" },
  league: { name: "League of Legends", accent: "bg-sky-500", recentTitle: "Recent matches" },
  spotify: { name: "Spotify", accent: "bg-green-500", recentTitle: "Recently played" },
  overwatch: { name: "Overwatch", accent: "bg-orange-500", recentTitle: "Recent matches" },
  valorant: { name: "Valorant", accent: "bg-rose-500", recentTitle: "Recent matches" },
  r6: { name: "Rainbow Six Siege", accent: "bg-slate-400", recentTitle: "Recent matches" },
};

// Turns an ISO timestamp into text like "3h ago" or "2d ago".
function timeAgo(iso: string, now: number): string {
  const hours = Math.round((now - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Win = green, loss = red, anything else = gray.
function outcomeDot(outcome: RecentItem["outcome"]): string {
  if (outcome === "win") return "bg-emerald-500";
  if (outcome === "loss") return "bg-rose-500";
  return "bg-zinc-400 dark:bg-zinc-600";
}

export default function SourceCard({
  summary,
  now,
}: {
  summary: PlayerSummary;
  now: number; // current time in ms, passed in so every card agrees
}) {
  const meta = SOURCE_META[summary.source];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Thin colored stripe identifies the source */}
      <div className={`h-1.5 ${meta.accent}`} />

      <div className="flex flex-1 flex-col gap-5 p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{meta.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{summary.displayName}</p>
          </div>
          {summary.isDemo && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
              Demo data
            </span>
          )}
        </header>

        {/* Headline stats: 2 columns */}
        <dl className="grid grid-cols-2 gap-3">
          {summary.stats.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold">
                {stat.value}
                {stat.unit && <span className="ml-0.5 text-sm font-normal">{stat.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {summary.recent && summary.recent.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {meta.recentTitle}
            </h3>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {summary.recent.map((item, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${outcomeDot(item.outcome)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{item.subtitle}</p>
                    )}
                  </div>
                  {item.date && (
                    <span className="shrink-0 text-xs text-zinc-400">{timeAgo(item.date, now)}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
