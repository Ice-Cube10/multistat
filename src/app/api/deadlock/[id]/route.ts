// GET /api/deadlock/<steam id> -> JSON PlayerSummary (or { error } with a status code)

import { NextResponse } from "next/server";
import { deadlockAdapter } from "@/adapters/deadlock";
import { AdapterError, httpStatusFor } from "@/adapters/errors";

export async function GET(_request: Request, ctx: RouteContext<"/api/deadlock/[id]">) {
  const { id } = await ctx.params;
  try {
    const summary = await deadlockAdapter.getSummary(decodeURIComponent(id));
    return NextResponse.json(summary);
  } catch (err) {
    if (err instanceof AdapterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: httpStatusFor(err.code) });
    }
    console.error("Deadlock route failed:", err);
    return NextResponse.json({ error: "Something went wrong.", code: "upstream" }, { status: 500 });
  }
}
