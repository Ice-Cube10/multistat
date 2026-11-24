// Spotify adapter. Unlike the other sources, Spotify data is private to each
// user, so the visitor has to log in with Spotify (OAuth). Flow:
//   1. /api/spotify/login   sends the visitor to Spotify to approve access
//   2. /api/spotify/callback gets a one-time code back and trades it for tokens
//   3. /spotify              uses the access token to fetch their stats
//
// Spotify "Development Mode" apps need a Premium owner and are limited to 5
// authorized users, so everyone else sees demo data.

import { AdapterError } from "./errors";
import type { PlayerSummary, RecentItem } from "./types";

const SCOPES = "user-top-read user-read-recently-played";

export interface SpotifyTokens {
  accessToken: string;
  expiresIn: number; // seconds
  refreshToken?: string; // only present on first login (and sometimes on refresh)
}

export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

// Where to send the visitor to log in at Spotify.
export function buildAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    scope: SCOPES,
    redirect_uri: redirectUri,
    state, // random value we check on return, to block forged callbacks
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

// Calls Spotify's token endpoint, which proves who we are with our client secret.
async function requestToken(body: Record<string, string>): Promise<SpotifyTokens> {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  let res: Response;
  try {
    res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AdapterError("upstream", "Couldn't reach Spotify. Try again in a moment.");
  }
  if (res.status === 400 || res.status === 401) {
    throw new AdapterError("unauthorized", "Spotify login expired or was rejected. Please connect again.");
  }
  if (!res.ok) throw new AdapterError("upstream", `Spotify returned an error (${res.status}).`);

  const json = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
  return { accessToken: json.access_token, expiresIn: json.expires_in, refreshToken: json.refresh_token };
}

export function exchangeCode(code: string, redirectUri: string) {
  return requestToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

export function refreshAccessToken(refreshToken: string) {
  return requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

// --- Fetching the user's stats -------------------------------------------

// Only the fields we use. Spotify removed some fields (like popularity) for
// Development Mode apps, and `genres` may be missing, so those are optional.
interface Artist {
  name: string;
  genres?: string[];
}
interface Track {
  name: string;
  artists: { name: string }[];
}
interface Paged<T> {
  items: T[];
}

async function spotifyGet<T>(accessToken: string, path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store", // private, per-user data: never cache
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AdapterError("upstream", "Couldn't reach Spotify. Try again in a moment.");
  }
  if (res.status === 401) throw new AdapterError("unauthorized", "Your Spotify session expired.");
  if (res.status === 403) {
    throw new AdapterError(
      "unauthorized",
      "Spotify denied access. This app is in Development Mode, so only up to 5 pre-approved accounts can use it.",
    );
  }
  if (res.status === 429) throw new AdapterError("upstream", "Spotify rate limit hit. Try again in a minute.");
  if (!res.ok) throw new AdapterError("upstream", `Spotify returned an error (${res.status}).`);
  return (await res.json()) as T;
}

function mostCommon(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export async function getSpotifySummary(accessToken: string): Promise<PlayerSummary> {
  const [profile, artists, tracks, played] = await Promise.all([
    spotifyGet<{ display_name?: string; id: string }>(accessToken, "/me"),
    spotifyGet<Paged<Artist>>(accessToken, "/me/top/artists?time_range=short_term&limit=50"),
    spotifyGet<Paged<Track>>(accessToken, "/me/top/tracks?time_range=short_term&limit=50"),
    spotifyGet<Paged<{ played_at: string; track: Track }>>(accessToken, "/me/player/recently-played?limit=5"),
  ]);

  if (artists.items.length === 0 && tracks.items.length === 0) {
    throw new AdapterError("not_found", "No listening data yet. Listen to some music on Spotify and try again.");
  }

  const topGenre = mostCommon(artists.items.flatMap((a) => a.genres ?? []));
  const uniqueArtists = new Set(tracks.items.map((t) => t.artists[0]?.name).filter(Boolean)).size;
  const topTrack = tracks.items[0];

  const recent: RecentItem[] = played.items.map((p) => ({
    title: p.track.name,
    subtitle: p.track.artists.map((a) => a.name).join(", "),
    date: p.played_at,
  }));

  return {
    source: "spotify",
    displayName: profile.display_name ?? profile.id,
    fetchedAt: new Date().toISOString(),
    isDemo: false,
    stats: [
      { label: "Top artist (4 wks)", value: artists.items[0]?.name ?? "n/a" },
      { label: "Top track (4 wks)", value: topTrack?.name ?? "n/a" },
      { label: "Top genre", value: topGenre ?? "n/a" },
      { label: "Artists in top 50 tracks", value: uniqueArtists },
    ],
    recent,
  };
}
