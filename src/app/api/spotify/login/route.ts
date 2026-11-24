// GET /api/spotify/login -> redirects the visitor to Spotify to approve access.

import { NextResponse } from "next/server";
import { buildAuthUrl, isSpotifyConfigured } from "@/adapters/spotify";
import { getOrigin } from "@/lib/origin";
import { cookieOptions, STATE_COOKIE } from "@/lib/spotifyCookies";

export async function GET(request: Request) {
  const origin = getOrigin(request);
  if (!isSpotifyConfigured()) {
    return NextResponse.redirect(`${origin}/spotify?error=not_configured`);
  }

  // Random value that Spotify hands back to us; we compare it in the callback.
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildAuthUrl(state, `${origin}/api/spotify/callback`));
  response.cookies.set(STATE_COOKIE, state, cookieOptions(600)); // valid 10 minutes
  return response;
}
