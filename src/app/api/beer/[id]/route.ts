import { NextResponse } from "next/server";
import { untappdBeerUrl } from "@/lib/matching";
import { friendsMetric, globalMetric, personalMetric, type FriendsFeed } from "@/lib/metrics";
import type { BeerDetails } from "@/lib/types";
import { config } from "@/lib/server/config";
import { AppError, errorResponse } from "@/lib/server/errors";
import { beerInfo, currentUserId, friendsFeed } from "@/lib/server/untappd";

export const dynamic = "force-dynamic";

/** Current ratings for one confirmed beer: you, friends (recent activity) and global. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await ctx.params;
    if (!/^\d{1,10}$/.test(raw)) throw new AppError("BAD_REQUEST", "That is not an Untappd beer id.", 400);
    const id = Number(raw);

    // Until Untappd sign-in lands (MVP step 3), a server-side development token stands in for it.
    const token = config.untappdAccessToken();
    const info = await beerInfo(id, token);

    let feed: FriendsFeed | null = null;
    let ownId: number | null = null;
    if (token) {
      try {
        [feed, ownId] = await Promise.all([friendsFeed(token), currentUserId(token)]);
      } catch {
        feed = null; // Friends' context is optional; keep global and personal.
      }
    }

    const details: BeerDetails = {
      id: info.id,
      name: info.name,
      brewery: info.brewery,
      style: info.style,
      abv: info.abv,
      vintage: info.vintage,
      untappdUrl: untappdBeerUrl(info.id, info.slug),
      labelUrl: info.labelUrl,
      you: personalMetric(info.stats, Boolean(token)),
      friends: friendsMetric(info.id, feed, ownId, Boolean(token)),
      global: globalMetric(info.stats),
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(details, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
