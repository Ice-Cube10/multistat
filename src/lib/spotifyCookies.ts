// Cookie names and settings for the Spotify login. The tokens live in
// httpOnly cookies, which means browser JavaScript cannot read them.

export const ACCESS_COOKIE = "sp_access";
export const REFRESH_COOKIE = "sp_refresh";
export const STATE_COOKIE = "sp_state";

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS-only on the live site
    sameSite: "lax" as const, // still sent when Spotify redirects back to us
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
