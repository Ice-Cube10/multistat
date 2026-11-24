// The address the visitor used to reach us, e.g. "http://127.0.0.1:3000" or
// "https://multistat.vercel.app". We read it from request headers instead of
// request.url, because in development Next.js rewrites 127.0.0.1 to localhost,
// and Spotify does not accept "localhost" as a redirect address.
export function getOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return new URL(request.url).origin;
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}
