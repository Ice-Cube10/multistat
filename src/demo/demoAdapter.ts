// The demo adapter follows the same Adapter contract as the real adapters,
// but returns fake sample data instead of calling an API.

import type { Adapter, PlayerSummary, Source } from "@/adapters/types";
import { getSampleData } from "./sampleData";

// A function that builds a demo adapter for any one source.
export function createDemoAdapter(source: Source): Adapter {
  return {
    source,
    // The `id` is ignored: demo mode always shows the same fake player.
    async getSummary(): Promise<PlayerSummary> {
      const summary = getSampleData()[source];
      if (!summary) {
        throw new Error(`No demo data for "${source}" yet`);
      }
      return summary;
    },
  };
}
