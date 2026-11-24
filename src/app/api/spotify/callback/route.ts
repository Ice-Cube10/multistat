// GET /api/spotify/callback -> Spotify sends the visitor back here with a
// one-time code. We trade it for tokens and store them in cookies.

import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode } from "@/adapters/spotify";
import { ACCESS_COOKIE, cookieOptions, REFRESH_COOKIE, STATE_COOKIE } from "@/lib/spotifyCookies";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const back = (error?: string) => {
    const res = NextResponse.redirect(`${url.origin}/spotify${error ? `?error=${error}` : ""}`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  if (url.searchParams.get("error")) return back("denied"); // user clicked "Cancel"
  if (!code || !state || state !== savedState) return back("state"); // possible forged request

  try {
    const tokens = await exchangeCode(code, `${url.origin}/api/spotify/callback`);
    const res = back();
    res.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokens.expiresIn));
    if (tokens.refreshToken) {
      res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(60 * 60 * 24 * 30));
    }
    return res;
  } catch {
    return back("auth");
  }
}
