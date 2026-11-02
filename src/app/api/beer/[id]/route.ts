import { NextResponse } from "next/server";
import { untappdBeerUrl } from "@/lib/matching";
import { friendsMetric, globalMetric, personalMetric, type FriendsFeed } from "@/lib/metrics";
import type { BeerDetails, Metric } from "@/lib/types";
import { personalToken } from "@/lib/server/session";
import { AppError, errorResponse } from "@/lib/server/errors";
import { beerInfo, currentUserId, friendsFeed } from "@/lib/server/untappd";

export const dynamic = "force-dynamic";

const withReason = <T extends Metric>(m: T, explanation: string): T => ({ ...m, coverage: "unavailable", explanation });

/** Current ratings for one confirmed beer: you, friends (recent activity) and global. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: raw } = await ctx.params;
    if (!/^\d{1,10}$/.test(raw)) throw new AppError("BAD_REQUEST", "That is not an Untappd beer id.", 400);
    const id = Number(raw);

    let { token } = await personalToken();
    let personalProblem: string | null = null;
    let info;
    try {
      info = await beerInfo(id, token);
    } catch (error) {
      // A revoked token or a used-up personal budget should not hide global ratings.
      const personalOnly = error instanceof AppError && (error.code === "AUTH_REQUIRED" || error.code === "PROVIDER_LIMIT");
      if (!token || !personalOnly) throw error;
      personalProblem = error.message;
      token = null;
      info = await beerInfo(id, null);
    }

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
      you: personalProblem
        ? { ...withReason(personalMetric(null, true), personalProblem), experience: "unknown" }
        : personalMetric(info.stats, Boolean(token)),
      friends: personalProblem
        ? withReason(friendsMetric(info.id, null, null, true), personalProblem)
        : friendsMetric(info.id, feed, ownId, Boolean(token)),
      global: globalMetric(info.stats),
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(details, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
