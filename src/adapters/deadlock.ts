// Deadlock adapter: calls the community-run Deadlock API
// (https://api.deadlock-api.com) and converts the response into PlayerSummary.
// This is NOT an official Valve API, so it can change or go down.

import { cacheLife } from "next/cache";
import type { Adapter, PlayerSummary, RecentItem } from "./types";
import { AdapterError } from "./errors";
import { toAccountId } from "./steamId";

const BASE_URL = "https://api.deadlock-api.com";

// Only the fields we actually use from the API's responses.
interface MatchHistoryEntry {
  match_id: number;
  hero_id: number;
  start_time: number; // unix seconds
  match_duration_s: number;
  player_kills: number;
  player_deaths: number;
  player_assists: number;
  player_match_outcome: number; // 1 = win, 2 = loss, other = not scored
}
interface SteamProfile {
  personaname: string;
}
interface Hero {
  id: number;
  name: string;
}

// Small helper: fetch JSON and turn any failure into an AdapterError.
async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    // The timeout stops a slow API from hanging our page forever.
    res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new AdapterError("upstream", "The Deadlock API didn't respond. Try again in a moment.");
  }
  if (!res.ok) {
    throw new AdapterError("upstream", `The Deadlock API returned an error (${res.status}).`);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new AdapterError("upstream", "The Deadlock API returned an unreadable response.");
  }
}

// Hero names rarely change, so cache them for a long time.
async function getHeroNames(): Promise<Map<number, string>> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 6 * 3600, expire: 24 * 3600 });

  const heroes = await getJson<Hero[]>("/v1/assets/heroes?only_active=true");
  return new Map(heroes.map((h) => [h.id, h.name]));
}

// Cached for 5 minutes per account ID, so repeat lookups don't hit the API.
// Returns null when the player has no matches. Why not throw? Errors thrown
// inside a cached function lose their type when they cross the cache boundary,
// so we return a plain value and let the wrapper below raise the right error.
// (Real failures still throw and are never cached.)
async function loadDeadlockSummary(accountId: number): Promise<PlayerSummary | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  const [history, profiles, heroNames] = await Promise.all([
    getJson<MatchHistoryEntry[]>(`/v1/players/${accountId}/match-history`),
    getJson<SteamProfile[]>(`/v1/players/steam?account_ids=${accountId}`),
    getHeroNames(),
  ]);

  // The API answers 200 with an empty list for unknown players.
  if (history.length === 0) return null;

  // Newest first.
  const matches = [...history].sort((a, b) => b.start_time - a.start_time);
  const heroName = (id: number) => heroNames.get(id) ?? `Hero #${id}`;

  // Only count matches that were scored as a win or a loss.
  const scored = matches.filter((m) => m.player_match_outcome === 1 || m.player_match_outcome === 2);
  const wins = scored.filter((m) => m.player_match_outcome === 1).length;
  const winRate = scored.length ? (wins / scored.length) * 100 : 0;

  // KDA = (kills + assists) / deaths, computed over all matches.
  const kills = sum(matches, (m) => m.player_kills);
  const assists = sum(matches, (m) => m.player_assists);
  const deaths = sum(matches, (m) => m.player_deaths);
  const kda = (kills + assists) / Math.max(deaths, 1);

  // Favorite hero = the one played most often.
  const counts = new Map<number, number>();
  for (const m of matches) counts.set(m.hero_id, (counts.get(m.hero_id) ?? 0) + 1);
  const [favoriteId] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  const recent: RecentItem[] = matches.slice(0, 5).map((m) => ({
    title: `${outcomeWord(m.player_match_outcome)} as ${heroName(m.hero_id)}`,
    subtitle: `${m.player_kills} / ${m.player_deaths} / ${m.player_assists} · ${Math.round(m.match_duration_s / 60)} min`,
    date: new Date(m.start_time * 1000).toISOString(),
    outcome: m.player_match_outcome === 1 ? "win" : m.player_match_outcome === 2 ? "loss" : "neutral",
  }));

  return {
    source: "deadlock",
    displayName: profiles[0]?.personaname ?? `Player ${accountId}`,
    fetchedAt: new Date().toISOString(),
    isDemo: false,
    stats: [
      { label: "Matches", value: matches.length },
      { label: "Win rate", value: Math.round(winRate * 10) / 10, unit: "%" },
      { label: "Avg KDA", value: Math.round(kda * 10) / 10 },
      { label: "Favorite hero", value: heroName(favoriteId) },
    ],
    recent,
  };
}

// Public wrapper: turns the cached result (or any failure) into a PlayerSummary
// or a typed AdapterError.
export async function getDeadlockSummary(accountId: number): Promise<PlayerSummary> {
  let summary: PlayerSummary | null;
  try {
    summary = await loadDeadlockSummary(accountId);
  } catch {
    throw new AdapterError(
      "upstream",
      "Couldn't reach the Deadlock API right now. Try again in a moment.",
    );
  }
  if (!summary) {
    throw new AdapterError(
      "not_found",
      "No Deadlock matches found for that ID. Check the ID, or the player may not have played yet.",
    );
  }
  return summary;
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

function outcomeWord(outcome: number): string {
  if (outcome === 1) return "Victory";
  if (outcome === 2) return "Defeat";
  return "Unscored";
}

// The adapter object that follows the shared contract. It accepts a Steam ID
// in any supported format.
export const deadlockAdapter: Adapter = {
  source: "deadlock",
  getSummary: (id) => getDeadlockSummary(toAccountId(id)),
};
