import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdapterError } from "@/adapters/errors";
import { getSpotifySummary } from "@/adapters/spotify";
import type { PlayerSummary } from "@/adapters/types";
import SourceCard from "@/components/SourceCard";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/spotifyCookies";

export const metadata = { title: "Spotify · MultiStat" };

const ERROR_MESSAGES: Record<string, string> = {
  denied: "You cancelled the Spotify login.",
  state: "The login couldn't be verified. Please try connecting again.",
  auth: "Spotify login failed. Please try again.",
  expired: "Your Spotify session expired. Please connect again.",
  not_configured: "Spotify login isn't enabled on this site (no Spotify app credentials configured).",
};

function ErrorBox({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
      {message}
    </p>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/spotify">["searchParams"] }) {
  const params = await searchParams;
  const queryError = typeof params.error === "string" ? ERROR_MESSAGES[params.error] : undefined;

  const jar = await cookies(); // reading cookies makes this page dynamic (per visitor)
  const accessToken = jar.get(ACCESS_COOKIE)?.value;
  const hasRefresh = Boolean(jar.get(REFRESH_COOKIE)?.value);

  // Access token expired but we can renew it: bounce through the refresh route.
  if (!accessToken && hasRefresh && !queryError) redirect("/api/spotify/refresh");

  let summary: PlayerSummary | null = null;
  let errorMessage = queryError ?? "";
  if (accessToken) {
    try {
      summary = await getSpotifySummary(accessToken);
    } catch (err) {
      errorMessage =
        err instanceof AdapterError ? err.message : "Something went wrong. Please try again.";
    }
  }

  if (summary) {
    return (
      <div className="space-y-4">
        <SourceCard summary={summary} now={new Date(summary.fetchedAt).getTime()} />
        <a href="/api/spotify/logout" className="text-sm text-zinc-500 underline dark:text-zinc-400">
          Disconnect Spotify
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage && <ErrorBox message={errorMessage} />}
      {/* Plain <a>: this is an API route that redirects off-site, not a page. */}
      <a
        href="/api/spotify/login"
        className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Connect Spotify
      </a>
    </div>
  );
}

export default function SpotifyPage({ searchParams }: PageProps<"/spotify">) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Spotify</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Log in with Spotify to see your top artists, top tracks and recently played songs.
      </p>
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        Spotify limits apps like this one to <strong>5 pre-approved accounts</strong>. If you&apos;re
        not one of them, login will be refused. The dashboard&apos;s demo mode shows what it looks like.
      </p>

      <div className="mt-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
