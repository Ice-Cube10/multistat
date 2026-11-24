import Link from "next/link";
import TakeoutUpload from "@/components/TakeoutUpload";

export const metadata = { title: "YouTube history · MultiStat" };

export default function YouTubePage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">YouTube watch history</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        YouTube&apos;s API doesn&apos;t share what you watched, so this uses your own Google Takeout export.
      </p>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>
          Go to{" "}
          <a
            href="https://takeout.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            takeout.google.com
          </a>{" "}
          and deselect everything except <strong>YouTube and YouTube Music</strong>.
        </li>
        <li>
          Click <em>All YouTube data included</em>, keep only <strong>history</strong>, and under <em>Multiple formats</em> set history to <strong>JSON</strong>.
        </li>
        <li>Create the export, download the zip, and find <code>watch-history.json</code> inside.</li>
        <li>Choose that file below.</li>
      </ol>

      <div className="mt-6">
        <TakeoutUpload />
      </div>
    </main>
  );
}
