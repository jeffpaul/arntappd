import { describe, expect, it } from "vitest";
import { friendsMetric, globalMetric, personalMetric, type BeerInfoStats, type FeedCheckin } from "@/lib/metrics";

const stats = (over: Partial<BeerInfoStats> = {}): BeerInfoStats => ({
  ratingScore: 3.93483, ratingCount: 555370, totalCheckins: 1725893, userCount: null, authRating: null, ...over,
});

describe("globalMetric", () => {
  it("keeps ratings and check-ins as separate counts", () => {
    expect(globalMetric(stats())).toMatchObject({ average: 3.93, ratingCount: 555370, checkinCount: 1725893 });
  });
  it("shows no average for a beer nobody has rated, not zero stars", () => {
    expect(globalMetric(stats({ ratingScore: 0, ratingCount: 0, totalCheckins: 3 })).average).toBeNull();
  });
});

describe("personalMetric", () => {
  it("is signed out without a token", () => {
    expect(personalMetric(stats(), false).experience).toBe("signed_out");
  });
  it("treats zero check-ins as untried", () => {
    expect(personalMetric(stats({ userCount: 0, authRating: 0 }), true)).toMatchObject({ experience: "untried", average: null });
  });
  it("does not turn a missing rating into a zero", () => {
    expect(personalMetric(stats({ userCount: 2, authRating: 0 }), true)).toMatchObject({ experience: "tried_unrated", average: null, checkinCount: 2 });
  });
  it("keeps a genuinely low rating", () => {
    expect(personalMetric(stats({ userCount: 1, authRating: 0.25 }), true)).toMatchObject({ experience: "tried_rated", average: 0.25 });
  });
  it("is unknown when Untappd leaves out your count", () => {
    expect(personalMetric(stats({ userCount: null }), true).experience).toBe("unknown");
  });
});

describe("friendsMetric", () => {
  const c = (checkinId: number, beerId: number, userId: number, rating: number | null): FeedCheckin => ({
    checkinId, beerId, userId, rating, createdAt: "2026-10-05T12:00:00.000Z",
  });
  const feed = {
    checkins: [
      c(1, 4133, 10, 4),
      c(2, 4133, 10, 3.5), // same friend again: counts as another check-in
      c(2, 4133, 10, 3.5), // duplicate page overlap: ignored
      c(3, 4133, 11, 0), // checked in without a rating
      c(4, 4133, 99, 1), // your own check-in: ignored
      c(5, 9999, 12, 5), // other beer
    ],
    oldest: "2026-10-05T12:00:00.000Z",
    exhausted: false,
  };

  it("counts check-ins, averages only rated ones, skips duplicates and your own", () => {
    expect(friendsMetric(4133, feed, 99, true)).toMatchObject({ checkinCount: 3, ratingCount: 2, average: 3.75, coverage: "partial" });
  });
  it("says there is no recent activity instead of showing zero", () => {
    const m = friendsMetric(1, feed, 99, true);
    expect(m).toMatchObject({ checkinCount: 0, average: null });
    expect(m.explanation).toMatch(/since Oct 5/);
  });
  it("is unavailable when the feed failed and signed out without a token", () => {
    expect(friendsMetric(4133, null, 99, true).coverage).toBe("unavailable");
    expect(friendsMetric(4133, feed, 99, false).coverage).toBe("signed_out");
  });
});
