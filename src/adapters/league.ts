// League of Legends adapter, using Riot's official API (https://developer.riotgames.com).
// Needs a Riot API key in the RIOT_API_KEY environment variable. The key is only
// ever used here on the server, so it never reaches the browser.

import { cacheLife } from "next/cache";
import { AdapterError } from "./errors";
import type { PlayerSummary, RecentItem } from "./types";

// Riot has two kinds of servers:
//  - "platform" (na1, euw1, ...) = the game server a player is on
//  - "regional" (americas, europe, asia, sea) = a bigger group used for accounts and matches
export const PLATFORMS = {
  na1: { label: "North America", regional: "americas" },
  br1: { label: "Brazil", regional: "americas" },
  la1: { label: "Latin America North", regional: "americas" },
  la2: { label: "Latin America South", regional: "americas" },
  euw1: { label: "Europe West", regional: "europe" },
  eun1: { label: "Europe Nordic & East", regional: "europe" },
  tr1: { label: "Turkey", regional: "europe" },
  ru: { label: "Russia", regional: "europe" },
  kr: { label: "Korea", regional: "asia" },
  jp1: { label: "Japan", regional: "asia" },
  oc1: { label: "Oceania", regional: "sea" },
  ph2: { label: "Philippines", regional: "sea" },
  sg2: { label: "Singapore", regional: "sea" },
  th2: { label: "Thailand", regional: "sea" },
  tw2: { label: "Taiwan", regional: "sea" },
  vn2: { label: "Vietnam", regional: "sea" },
} as const;
export type Platform = keyof typeof PLATFORMS;

const MATCHES_TO_ANALYZE = 10;

// Only the fields we use from Riot's responses.
interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}
interface LeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
}
interface Match {
  info: {
    gameCreation: number; // ms
    gameDuration: number; // seconds
    participants: {
      puuid: string;
      championName: string;
      kills: number;
      deaths: number;
      assists: number;
      win: boolean;
      teamPosition: string;
      gameEndedInEarlySurrender?: boolean;
    }[];
  };
}

class NotFound extends Error {}

// Calls Riot. A 404 becomes NotFound; anything else wrong becomes a plain Error.
async function riot<T>(host: string, path: string): Promise<T> {
  const res = await fetch(`https://${host}.api.riotgames.com${path}`, {
    headers: { "X-Riot-Token": process.env.RIOT_API_KEY ?? "" },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) throw new NotFound();
  if (!res.ok) throw new Error(`Riot API ${res.status}`);
  return (await res.json()) as T;
}

// Cached for 5 minutes. Returns null if the Riot ID doesn't exist.
// (We return a value instead of throwing, because errors lose their type
// when they cross a cache boundary. See the Deadlock adapter.)
async function loadLeagueSummary(
  gameName: string,
  tagLine: string,
  platform: Platform,
): Promise<PlayerSummary | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  const regional = PLATFORMS[platform].regional;
  // The account endpoint only has americas / europe / asia.
  const accountHost = regional === "sea" ? "asia" : regional;

  let account: RiotAccount;
  try {
    account = await riot<RiotAccount>(
      accountHost,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    );
  } catch (err) {
    if (err instanceof NotFound) return null;
    throw err;
  }

  const [entries, matchIds] = await Promise.all([
    riot<LeagueEntry[]>(platform, `/lol/league/v4/entries/by-puuid/${account.puuid}`),
    riot<string[]>(regional, `/lol/match/v5/matches/by-puuid/${account.puuid}/ids?count=${MATCHES_TO_ANALYZE}`),
  ]);
  const matches = await Promise.all(matchIds.map((id) => riot<Match>(regional, `/lol/match/v5/matches/${id}`)));

  // Pull out this player's row from each match, newest first.
  const games = matches
    .map((m) => ({
      me: m.info.participants.find((p) => p.puuid === account.puuid),
      info: m.info,
    }))
    .filter((g): g is { me: Match["info"]["participants"][number]; info: Match["info"] } => !!g.me)
    // Skip remakes (games ended in an early surrender under ~4 minutes).
    .filter((g) => !(g.me.gameEndedInEarlySurrender && g.info.gameDuration < 240))
    .sort((a, b) => b.info.gameCreation - a.info.gameCreation);

  const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
  const rankText = solo ? `${titleCase(solo.tier)} ${solo.rank} · ${solo.leaguePoints} LP` : "Unranked";

  const wins = games.filter((g) => g.me.win).length;
  const winRate = games.length ? (wins / games.length) * 100 : 0;
  const kills = games.reduce((n, g) => n + g.me.kills, 0);
  const deaths = games.reduce((n, g) => n + g.me.deaths, 0);
  const assists = games.reduce((n, g) => n + g.me.assists, 0);
  const kda = (kills + assists) / Math.max(deaths, 1);

  // Most common role. Some modes (ARAM) have no role, so ignore blanks.
  const roleCounts = new Map<string, number>();
  for (const g of games) {
    if (g.me.teamPosition) roleCounts.set(g.me.teamPosition, (roleCounts.get(g.me.teamPosition) ?? 0) + 1);
  }
  const topRole = [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const recent: RecentItem[] = games.slice(0, 5).map((g) => ({
    title: `${g.me.win ? "Victory" : "Defeat"} as ${g.me.championName}`,
    subtitle: `${g.me.kills} / ${g.me.deaths} / ${g.me.assists} · ${Math.round(g.info.gameDuration / 60)} min`,
    date: new Date(g.info.gameCreation).toISOString(),
    outcome: g.me.win ? "win" : "loss",
  }));

  return {
    source: "league",
    displayName: `${account.gameName}#${account.tagLine}`,
    fetchedAt: new Date().toISOString(),
    isDemo: false,
    stats: [
      { label: "Ranked Solo/Duo", value: rankText },
      { label: `Win rate (last ${games.length})`, value: Math.round(winRate * 10) / 10, unit: "%" },
      { label: "Avg KDA", value: Math.round(kda * 10) / 10 },
      { label: "Main role", value: topRole ? ROLE_NAMES[topRole] ?? titleCase(topRole) : "n/a" },
    ],
    recent,
  };
}

const ROLE_NAMES: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Splits "Name#TAG" into its two parts.
function parseRiotId(input: string): { gameName: string; tagLine: string } {
  const text = input.trim();
  const i = text.lastIndexOf("#");
  const gameName = text.slice(0, i).trim();
  const tagLine = text.slice(i + 1).trim();
  if (i < 1 || !tagLine) {
    throw new AdapterError("invalid_id", "Enter a Riot ID like Name#TAG (include the # and tag).");
  }
  return { gameName, tagLine };
}

export function isPlatform(value: string): value is Platform {
  return value in PLATFORMS;
}

// Public function: validates input, then returns a PlayerSummary or throws an AdapterError.
export async function getLeagueSummary(riotId: string, platform: string): Promise<PlayerSummary> {
  if (!isPlatform(platform)) throw new AdapterError("invalid_id", "Pick a valid region.");
  const { gameName, tagLine } = parseRiotId(riotId);
  if (!process.env.RIOT_API_KEY) {
    throw new AdapterError("upstream", "Live League lookups aren't enabled on this site (no Riot API key configured).");
  }

  let summary: PlayerSummary | null;
  try {
    summary = await loadLeagueSummary(gameName, tagLine, platform);
  } catch {
    throw new AdapterError(
      "upstream",
      "Couldn't get data from Riot. The API key may have expired (dev keys last 24 hours) or the rate limit was hit. Try again shortly.",
    );
  }
  if (!summary) {
    throw new AdapterError("not_found", "No player found with that Riot ID and region. Check the spelling, tag and region.");
  }
  return summary;
}
