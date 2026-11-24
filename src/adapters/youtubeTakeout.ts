// YouTube adapter. YouTube's API does not expose a viewer's watch history, so
// instead we read the file Google gives you from Google Takeout
// (takeout.google.com -> YouTube -> history, in JSON format): watch-history.json.
//
// This is a pure function (text in, PlayerSummary out). It runs in the
// visitor's browser, so their history never gets uploaded to our server.

import { AdapterError } from "./errors";
import type { PlayerSummary, RecentItem } from "./types";

// The parts of a Takeout watch-history entry that we use.
interface TakeoutEntry {
  title?: string; // "Watched Some Video Title"
  titleUrl?: string; // "https://www.youtube.com/watch?v=..."
  subtitles?: { name?: string; url?: string }[]; // [{ name: "Channel" }]
  time?: string; // ISO timestamp
  details?: unknown[]; // present on ads ("From Google Ads")
}

interface WatchedVideo {
  title: string;
  channel: string;
  url: string;
  time: number; // ms since epoch
}

// Keep only real video watches. Takeout also contains ads, community posts,
// and videos that were later removed (no link or channel).
function toWatchedVideo(entry: TakeoutEntry): WatchedVideo | null {
  if (!entry.title?.startsWith("Watched ")) return null;
  if (entry.details?.length) return null; // ad
  if (!entry.titleUrl?.includes("watch?v=")) return null;
  const time = entry.time ? Date.parse(entry.time) : NaN;
  if (Number.isNaN(time)) return null;
  return {
    title: entry.title.slice("Watched ".length),
    channel: entry.subtitles?.[0]?.name ?? "Unknown channel",
    url: entry.titleUrl,
    time,
  };
}

export function summarizeTakeout(fileText: string): PlayerSummary {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new AdapterError(
      "invalid_file",
      "That doesn't look like a JSON file. In Google Takeout, choose the JSON format for YouTube history, then upload watch-history.json.",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new AdapterError("invalid_file", "Unexpected file contents. Upload watch-history.json from Google Takeout.");
  }

  const videos = (parsed as TakeoutEntry[])
    .map(toWatchedVideo)
    .filter((v): v is WatchedVideo => v !== null)
    .sort((a, b) => b.time - a.time); // newest first

  if (videos.length === 0) {
    throw new AdapterError("not_found", "No watched videos found in that file.");
  }

  // Count videos per channel and per month (UTC, e.g. "2025-03").
  const byChannel = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const v of videos) {
    byChannel.set(v.channel, (byChannel.get(v.channel) ?? 0) + 1);
    const month = new Date(v.time).toISOString().slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
  }
  const top = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  const [topChannel, topChannelCount] = top(byChannel);
  const [busiestMonth] = top(byMonth);

  const recent: RecentItem[] = videos.slice(0, 5).map((v) => ({
    title: v.title,
    subtitle: v.channel,
    date: new Date(v.time).toISOString(),
    url: v.url,
  }));

  return {
    source: "youtube",
    displayName: "Your watch history",
    fetchedAt: new Date().toISOString(),
    isDemo: false,
    stats: [
      { label: "Videos watched", value: videos.length.toLocaleString("en-US") },
      { label: "Channels", value: byChannel.size.toLocaleString("en-US") },
      { label: `Top channel (${topChannelCount} videos)`, value: topChannel },
      { label: "Busiest month", value: formatMonth(busiestMonth) },
    ],
    recent,
  };
}

// "2025-03" -> "Mar 2025"
function formatMonth(yyyyMm: string): string {
  return new Date(`${yyyyMm}-01T00:00:00Z`).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
