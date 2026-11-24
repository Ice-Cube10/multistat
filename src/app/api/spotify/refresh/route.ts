// GET /api/spotify/refresh -> access tokens last about an hour. When the
// cookie has expired, the /spotify page sends the visitor here to get a new
// one using the long-lived refresh token, then returns to /spotify.
// (Only route handlers can set cookies, which is why this isn't in the page.)

import { NextResponse, type NextRequest } from "next/server";
import { refreshAccessToken } from "@/adapters/spotify";
import { ACCESS_COOKIE, cookieOptions, REFRESH_COOKIE } from "@/lib/spotifyCookies";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.redirect(`${origin}/spotify`);

  try {
    const tokens = await refreshAccessToken(refreshToken);
    const res = NextResponse.redirect(`${origin}/spotify`);
    res.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokens.expiresIn));
    // Spotify sometimes issues a new refresh token; keep the newest.
    if (tokens.refreshToken) res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(60 * 60 * 24 * 30));
    return res;
  } catch {
    // Refresh token no longer works: log out so the visitor can reconnect.
    const res = NextResponse.redirect(`${origin}/spotify?error=expired`);
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }
}
