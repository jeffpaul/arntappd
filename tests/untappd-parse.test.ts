import { describe, expect, it } from "vitest";
import { parseBeerInfo, parseCheckins, parseSearch } from "@/lib/server/untappd";

// Trimmed from real responses captured 2026-11-02 (field names and types unchanged).
const searchResponse = {
  beers: {
    items: [
      {
        checkin_count: 1725817,
        beer: { bid: 4133, beer_name: "Two Hearted IPA", beer_abv: 7, beer_slug: "bell-s-brewery-two-hearted-ipa", beer_style: "IPA - American", auth_rating: 0 },
        brewery: { brewery_id: 2507, brewery_name: "Bell’s Brewery" },
      },
      { checkin_count: 3, beer: { beer_name: "no id" }, brewery: { brewery_name: "x" } },
    ],
  },
};

const infoResponse = {
  beer: {
    bid: 4133, beer_name: "Two Hearted IPA", beer_abv: 7, beer_style: "IPA - American", beer_slug: "bell-s-brewery-two-hearted-ipa",
    beer_label: "https://assets.untappd.com/site/beer_logos/beer-4133_c8b69_sm.jpeg",
    rating_count: 555370, rating_score: 3.93483, auth_rating: 0, vintage_year: null,
    stats: { total_count: 1725893, monthly_count: 1246, total_user_count: 612760, user_count: 0 },
    brewery: { brewery_name: "Bell’s Brewery" },
  },
};

describe("parseSearch", () => {
  it("reads hits and skips malformed items", () => {
    expect(parseSearch(searchResponse)).toEqual([
      { id: 4133, name: "Two Hearted IPA", brewery: "Bell’s Brewery", style: "IPA - American", abv: 7, checkinCount: 1725817, slug: "bell-s-brewery-two-hearted-ipa" },
    ]);
    expect(parseSearch({})).toEqual([]);
  });
});

describe("parseBeerInfo", () => {
  it("reads global stats, and personal fields only when authenticated", () => {
    const pub = parseBeerInfo(infoResponse, false)!;
    expect(pub.stats).toEqual({ ratingScore: 3.93483, ratingCount: 555370, totalCheckins: 1725893, userCount: null, authRating: null });
    const auth = parseBeerInfo(infoResponse, true)!;
    expect(auth.stats.userCount).toBe(0);
    expect(auth.stats.authRating).toBe(0);
  });
  it("drops label URLs that are not Untappd HTTPS assets", () => {
    const bad = parseBeerInfo({ beer: { ...infoResponse.beer, beer_label: "javascript:alert(1)" } }, false)!;
    expect(bad.labelUrl).toBeNull();
  });
  it("returns null for an unexpected shape", () => {
    expect(parseBeerInfo({ beer: {} }, false)).toBeNull();
  });
});

describe("parseCheckins", () => {
  it("reads the friends feed page and its next max_id", () => {
    const page = parseCheckins({
      pagination: { max_id: 1200 },
      checkins: {
        items: [
          { checkin_id: 1300, created_at: "Mon, 05 Oct 2026 12:00:00 +0000", rating_score: 4.25, user: { uid: 7 }, beer: { bid: 4133 } },
          { checkin_id: 1250, created_at: "bad date", rating_score: 0, user: { uid: 8 }, beer: { bid: 4499 } },
          { checkin_id: 1240, user: { uid: 8 } },
        ],
      },
    });
    expect(page.nextMaxId).toBe(1200);
    expect(page.items).toEqual([
      { checkinId: 1300, beerId: 4133, userId: 7, rating: 4.25, createdAt: "2026-10-05T12:00:00.000Z" },
      { checkinId: 1250, beerId: 4499, userId: 8, rating: 0, createdAt: null },
    ]);
  });
});
