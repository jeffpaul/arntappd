import type { Metric, PersonalExperience } from "./types";

/** The parts of Untappd's /beer/info response that ratings depend on. */
export type BeerInfoStats = {
  ratingScore: number | null;
  ratingCount: number | null;
  totalCheckins: number | null;
  /** Present only on authenticated calls: your check-ins of this beer. */
  userCount: number | null;
  /** Present only on authenticated calls: your rating, 0 when you have not rated it. */
  authRating: number | null;
};

/** One check-in from the friends feed, reduced to what aggregation needs. */
export type FeedCheckin = {
  checkinId: number;
  beerId: number;
  userId: number;
  /** Untappd sends 0 for a check-in without a rating. */
  rating: number | null;
  createdAt: string | null;
};

const validRating = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 5;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function globalMetric(stats: BeerInfoStats | null): Metric {
  if (!stats) {
    return { average: null, checkinCount: null, ratingCount: null, coverage: "unavailable", explanation: "Untappd did not return global ratings." };
  }
  const ratingCount = stats.ratingCount ?? null;
  const hasRatings = ratingCount === null ? validRating(stats.ratingScore) : ratingCount > 0;
  return {
    average: hasRatings && validRating(stats.ratingScore) ? round2(stats.ratingScore) : null,
    checkinCount: stats.totalCheckins ?? null,
    ratingCount,
    coverage: "complete",
    explanation: hasRatings ? null : "No ratings on Untappd yet.",
  };
}

/**
 * Your rating from an authenticated /beer/info call. stats.user_count is your
 * own check-in count for this one beer, so a zero there really means untried.
 */
export function personalMetric(
  stats: BeerInfoStats | null,
  signedIn: boolean,
): Metric & { experience: PersonalExperience } {
  if (!signedIn) {
    return { average: null, checkinCount: null, ratingCount: null, coverage: "signed_out", explanation: "Sign in to Untappd to see your rating.", experience: "signed_out" };
  }
  if (!stats || stats.userCount === null) {
    return { average: null, checkinCount: null, ratingCount: null, coverage: "unavailable", explanation: "Untappd did not return your history for this beer.", experience: "unknown" };
  }
  if (stats.userCount === 0) {
    return { average: null, checkinCount: 0, ratingCount: null, coverage: "complete", explanation: "Not tried yet.", experience: "untried" };
  }
  const rated = validRating(stats.authRating);
  return {
    average: rated ? round2(stats.authRating as number) : null,
    checkinCount: stats.userCount,
    ratingCount: null,
    coverage: "complete",
    explanation: rated ? null : "Checked in, not rated.",
    experience: rated ? "tried_rated" : "tried_unrated",
  };
}

export type FriendsFeed = {
  checkins: FeedCheckin[];
  /** Oldest check-in time in the loaded feed, for the "since" label. */
  oldest: string | null;
  /** True when Untappd had no more pages; false when we stopped at our cap. */
  exhausted: boolean;
};

/**
 * Friends' ratings for one beer from the recent-activity feed. Counts
 * check-ins (not people), averages only rated check-ins, ignores your own
 * check-ins, and never treats "no matching activity" as a zero.
 */
export function friendsMetric(
  beerId: number,
  feed: FriendsFeed | null,
  ownUserId: number | null,
  signedIn: boolean,
): Metric {
  if (!signedIn) {
    return { average: null, checkinCount: null, ratingCount: null, coverage: "signed_out", explanation: "Sign in to Untappd to see friends' ratings." };
  }
  if (!feed) {
    return { average: null, checkinCount: null, ratingCount: null, coverage: "unavailable", explanation: "Friends' activity could not be loaded." };
  }
  const seen = new Set<number>();
  let checkins = 0;
  const ratings: number[] = [];
  for (const c of feed.checkins) {
    if (c.beerId !== beerId || seen.has(c.checkinId)) continue;
    if (ownUserId !== null && c.userId === ownUserId) continue;
    seen.add(c.checkinId);
    checkins += 1;
    if (validRating(c.rating)) ratings.push(c.rating);
  }
  const since = feed.oldest ? ` since ${formatDay(feed.oldest)}` : "";
  const scope = `recent friend activity${since}`;
  if (checkins === 0) {
    return { average: null, checkinCount: 0, ratingCount: 0, coverage: "partial", explanation: `No check-ins in ${scope}.` };
  }
  const average = ratings.length ? round2(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;
  return {
    average,
    checkinCount: checkins,
    ratingCount: ratings.length,
    coverage: "partial",
    explanation: ratings.length ? `From ${scope}.` : `Checked in but not rated, in ${scope}.`,
  };
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "recently";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
