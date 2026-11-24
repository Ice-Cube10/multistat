"use client";
// Client component: runs in the browser. It reads the chosen file locally
// (nothing is sent to a server) and shows the resulting card.

import { useState } from "react";
import { AdapterError } from "@/adapters/errors";
import { summarizeTakeout } from "@/adapters/youtubeTakeout";
import type { PlayerSummary } from "@/adapters/types";
import SourceCard from "./SourceCard";

export default function TakeoutUpload() {
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setSummary(null);
    setBusy(true);
    try {
      const result = summarizeTakeout(await file.text());
      setSummary(result);
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof AdapterError ? err.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500">
        <span className="font-medium">{busy ? "Reading file…" : "Choose watch-history.json"}</span>
        <span className="mt-1 block text-zinc-500 dark:text-zinc-400">
          Your file stays on your device. Nothing is uploaded.
        </span>
        <input
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}
      {summary && <SourceCard summary={summary} now={now} />}
    </div>
  );
}
