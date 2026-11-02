import { NextResponse } from "next/server";
import { buildQuery, rankCandidates } from "@/lib/matching";
import { AppError, errorResponse } from "@/lib/server/errors";
import { searchBeers } from "@/lib/server/untappd";

export const dynamic = "force-dynamic";

const field = (url: URL, name: string, max: number) => {
  const v = url.searchParams.get(name)?.replace(/\s+/g, " ").trim() ?? "";
  if (v.length > max) throw new AppError("BAD_REQUEST", `The ${name} is too long.`, 400);
  return v || null;
};

/**
 * Up to three Untappd candidates for one menu beer.
 * GET /api/match?name=...&brewery=...&vintage=...&abv=...  (all but name optional)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = field(url, "name", 120);
    if (!name || name.length < 2) throw new AppError("BAD_REQUEST", "Enter a beer name to search.", 400);
    const abvText = field(url, "abv", 6);
    const abv = abvText && /^\d{1,2}(\.\d{1,2})?$/.test(abvText) ? Number(abvText) : null;
    const beer = { name, brewery: field(url, "brewery", 80), vintage: field(url, "vintage", 10), abv };
    const query = buildQuery(beer);
    let hits = await searchBeers(query);
    // A wrong brewery reading can sink an otherwise good search; retry on the name alone.
    if (!hits.length && beer.brewery) hits = await searchBeers(buildQuery({ ...beer, brewery: null }));
    return NextResponse.json(rankCandidates(beer, hits, query), {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
