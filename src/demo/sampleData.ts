// Realistic FAKE data for demo mode. None of this comes from a real account.
// It lets anyone see the whole app without logging in or needing API keys.

import type { PlayerSummary, Source } from "@/adapters/types";

// Helper: an ISO timestamp for "n hours ago", so demo data always looks fresh
// instead of showing dates from months ago.
function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

// This is a function (not a constant) so `fetchedAt` and the dates are
// computed at the moment someone asks for the data.
export function getSampleData(): Partial<Record<Source, PlayerSummary>> {
  return {
    deadlock: {
      source: "deadlock",
      displayName: "DemoPlayer",
      fetchedAt: hoursAgo(0),
      isDemo: true,
      stats: [
        { label: "Matches", value: 412 },
        { label: "Win rate", value: 54.6, unit: "%" },
        { label: "Avg KDA", value: 3.1 },
        { label: "Favorite hero", value: "Haze" },
      ],
      recent: [
        { title: "Victory as Haze", subtitle: "14 / 4 / 9 · 34 min", date: hoursAgo(3), outcome: "win" },
        { title: "Defeat as Seven", subtitle: "6 / 9 / 12 · 41 min", date: hoursAgo(8), outcome: "loss" },
        { title: "Victory as Haze", subtitle: "11 / 5 / 7 · 29 min", date: hoursAgo(26), outcome: "win" },
        { title: "Victory as Abrams", subtitle: "8 / 6 / 15 · 37 min", date: hoursAgo(30), outcome: "win" },
        { title: "Defeat as Lady Geist", subtitle: "5 / 10 / 8 · 33 min", date: hoursAgo(52), outcome: "loss" },
      ],
    },

    youtube: {
      source: "youtube",
      displayName: "Demo Channel",
      fetchedAt: hoursAgo(0),
      isDemo: true,
      stats: [
        { label: "Subscribers", value: "12.4K" },
        { label: "Total views", value: "1.8M" },
        { label: "Videos", value: 86 },
        { label: "Avg views / video", value: "20.9K" },
      ],
      recent: [
        { title: "I Climbed to the Top Rank in One Week", subtitle: "48K views", date: hoursAgo(40), outcome: "neutral" },
        { title: "Beginner's Guide: Every Hero Explained", subtitle: "31K views", date: hoursAgo(190), outcome: "neutral" },
        { title: "Patch Notes Reaction + Tier List", subtitle: "19K views", date: hoursAgo(360), outcome: "neutral" },
        { title: "Funniest Moments Compilation #12", subtitle: "9.2K views", date: hoursAgo(530), outcome: "neutral" },
      ],
    },

    league: {
      source: "league",
      displayName: "DemoSummoner#NA1",
      fetchedAt: hoursAgo(0),
      isDemo: true,
      stats: [
        { label: "Rank", value: "Platinum II" },
        { label: "Win rate", value: 52.1, unit: "%" },
        { label: "Avg KDA", value: 2.8 },
        { label: "Main role", value: "Mid" },
      ],
      recent: [
        { title: "Victory as Ahri", subtitle: "9 / 3 / 11 · 28 min", date: hoursAgo(5), outcome: "win" },
        { title: "Defeat as Syndra", subtitle: "4 / 7 / 6 · 35 min", date: hoursAgo(12), outcome: "loss" },
        { title: "Victory as Ahri", subtitle: "12 / 2 / 8 · 25 min", date: hoursAgo(29), outcome: "win" },
        { title: "Defeat as Viktor", subtitle: "7 / 8 / 5 · 38 min", date: hoursAgo(34), outcome: "loss" },
        { title: "Victory as Orianna", subtitle: "3 / 4 / 17 · 31 min", date: hoursAgo(55), outcome: "win" },
      ],
    },

    spotify: {
      source: "spotify",
      displayName: "Demo Listener",
      fetchedAt: hoursAgo(0),
      isDemo: true,
      stats: [
        { label: "Top artist", value: "Neon Harbor" },
        { label: "Top genre", value: "Synthwave" },
        { label: "Minutes (4 wks)", value: 3240 },
        { label: "Unique artists", value: 187 },
      ],
      recent: [
        { title: "Midnight Drive", subtitle: "Neon Harbor", date: hoursAgo(1) },
        { title: "Glass Skyline", subtitle: "The Paper Satellites", date: hoursAgo(2) },
        { title: "Afterglow", subtitle: "Neon Harbor", date: hoursAgo(2) },
        { title: "Static Bloom", subtitle: "Violet Circuit", date: hoursAgo(4) },
        { title: "Slow Tide", subtitle: "Marin Lake", date: hoursAgo(6) },
      ],
    },
  };
}
