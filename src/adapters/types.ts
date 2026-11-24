// Shared types for the whole app.
//
// Every data source (Deadlock, YouTube, League, ...) has its own adapter that
// talks to that source's API. Each adapter converts the messy, source-specific
// response into the simple shapes below, so the UI only ever deals with these.

// All the sources we plan to support. A "union type": a value of type Source
// can only be one of these exact strings, so typos like "deadlok" are caught
// by TypeScript before the app even runs.
export type Source =
  | "deadlock"
  | "youtube"
  | "league"
  | "spotify"
  | "overwatch"
  | "valorant"
  | "r6";

// One headline number, e.g. { label: "Win rate", value: 56.3, unit: "%" }.
// `value` can be a number or text (e.g. a rank like "Diamond II").
// The "?" means `unit` is optional.
export interface Stat {
  label: string;
  value: number | string;
  unit?: string;
}

// One entry in a "recent activity" list: a match, a video, a track, etc.
// The plan used this type without defining it, so this is my starting
// proposal. It is deliberately generic so every source can fit into it.
export interface RecentItem {
  title: string; // e.g. "Victory as Haze", "My Latest Video", "Song Name"
  subtitle?: string; // e.g. "12/3/8 KDA", "45K views", "Artist Name"
  date?: string; // ISO timestamp, e.g. "2026-11-20T18:30:00Z"
  outcome?: "win" | "loss" | "neutral"; // lets the UI color matches green/red
  url?: string; // link to the match, video, or track if there is one
}

// Everything the UI needs to draw one source's card.
export interface PlayerSummary {
  source: Source;
  displayName: string; // player name, channel name, etc.
  fetchedAt: string; // ISO timestamp of when we got the data
  stats: Stat[]; // headline numbers
  recent?: RecentItem[]; // optional recent activity
  isDemo: boolean; // true = fake sample data, so the UI can label it
}

// The contract every adapter must follow. Because the real adapters and the
// demo adapter all follow it, the UI can use any of them interchangeably.
// `Promise` means the data arrives later (network calls take time).
export interface Adapter {
  source: Source;
  getSummary(id: string): Promise<PlayerSummary>;
}
