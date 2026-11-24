// GET /api/spotify/logout -> forget the visitor's Spotify tokens.

import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/spotifyCookies";

export async function GET(request: Request) {
  const res = NextResponse.redirect(`${new URL(request.url).origin}/spotify`);
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
