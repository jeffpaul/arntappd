import { describe, expect, it } from "vitest";
import { buildQuery, normalizeText, rankCandidates, type SearchHit } from "@/lib/matching";

const hit = (id: number, name: string, brewery: string, checkinCount = 1000, abv: number | null = null): SearchHit => ({
  id, name, brewery, style: null, abv, checkinCount, slug: null,
});

describe("buildQuery", () => {
  it("puts brewery first and adds a printed vintage", () => {
    expect(buildQuery({ name: "Bourbon County Stout", brewery: "Goose Island", vintage: "2023" })).toBe(
      "Goose Island Bourbon County Stout 2023",
    );
  });
  it("does not repeat a brewery word that starts the name", () => {
    expect(buildQuery({ name: "Guinness Draught", brewery: "Guinness", vintage: null })).toBe("Guinness Draught");
  });
});

describe("normalizeText", () => {
  it("treats curly and straight apostrophes the same", () => {
    expect(normalizeText("Bell’s Brewery")).toBe(normalizeText("Bell's Brewery"));
  });
});

describe("rankCandidates", () => {
  it("prefers the base beer over vintage releases when the menu gives no year", () => {
    // Untappd's real ordering for "Bell's Brewery Two Hearted IPA" on 2026-11-02.
    const r = rankCandidates({ name: "Two Hearted IPA", brewery: "Bell's Brewery", vintage: null }, [
      hit(6188558, "Two Hearted IPA (2025)", "Bell’s Brewery", 944),
      hit(4133, "Two Hearted IPA", "Bell’s Brewery", 1725817),
      hit(6112243, "Two Hearted IPA (2024)", "Bell’s Brewery", 164),
    ]);
    expect(r.suggestedId).toBe(4133);
    expect(r.candidates).toHaveLength(3);
  });

  it("uses the printed vintage and ABV to pick between near-identical releases", () => {
    // Untappd's top hits for "Goose Island Bourbon County Stout 2023" on 2026-11-02.
    const r = rankCandidates({ name: "Bourbon County Stout", brewery: "Goose Island", vintage: "2023", abv: 14.5 }, [
      hit(5462530, "Bourbon County Brand Bananas Foster Stout (2023)", "Goose Island Beer Co.", 30441, 14.6),
      hit(5460410, "Bourbon County Brand Backyard Stout (2023)", "Goose Island Beer Co.", 25253, 12.9),
      hit(5524002, "Bourbon County Brand Stout (2023) 14.1%", "Goose Island Beer Co.", 20800, 14.1),
      hit(5596371, "Bourbon County Brand Stout (2023) 14.6%", "Goose Island Beer Co.", 11396, 14.6),
      hit(8343, "Bourbon County Brand Stout", "Goose Island Beer Co.", 377737, 14.7),
    ]);
    expect(r.suggestedId).toBe(5596371);
    expect(r.candidates.map((c) => c.id)).toContain(5524002);
  });

  it("prefers the right brewery for a generic name", () => {
    const r = rankCandidates({ name: "IPA", brewery: "Lagunitas", vintage: null }, [
      hit(1, "IPA", "Some Other Brewing", 5_000_000),
      hit(4509, "IPA", "Lagunitas Brewing Company", 1_965_921),
      hit(198572, "DayTime IPA", "Lagunitas Brewing Company"),
    ]);
    expect(r.suggestedId).toBe(4509);
  });

  it("offers no suggestion when nothing fits", () => {
    const r = rankCandidates({ name: "Hazy Wonder", brewery: "Lagunitas", vintage: null }, [
      hit(25796, "A Little Sumpin' Sumpin'", "Lagunitas Brewing Company"),
    ]);
    expect(r.suggestedId).toBeNull();
    expect(r.candidates).toHaveLength(1);
  });

  it("returns no candidates for no hits", () => {
    expect(rankCandidates({ name: "x", brewery: null, vintage: null }, [])).toMatchObject({ candidates: [], suggestedId: null });
  });
});
