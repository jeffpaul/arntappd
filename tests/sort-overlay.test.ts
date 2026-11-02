import { describe, expect, it } from "vitest";
import { placeCallouts } from "@/lib/overlay";
import { filterItems, sortItems, type SortView } from "@/lib/sort";
import type { BeerDetails, Metric, PersonalExperience } from "@/lib/types";

const metric = (average: number | null): Metric => ({ average, checkinCount: null, ratingCount: null, coverage: "complete", explanation: null });
const details = (g: number | null, f: number | null, you: number | null, experience: PersonalExperience): BeerDetails => ({
  id: 1, name: "x", brewery: "y", style: null, abv: null, vintage: null, untappdUrl: "", labelUrl: null,
  you: { ...metric(you), experience }, friends: metric(f), global: metric(g), fetchedAt: "",
});
const id = (v: SortView) => v;

describe("sortItems", () => {
  const items: SortView[] = [
    { index: 0, details: details(3.9, null, null, "untried") },
    { index: 1, details: null },
    { index: 2, details: details(4.4, 4.1, 4.5, "tried_rated") },
    { index: 3, details: details(3.9, 3.0, null, "unknown") },
  ];
  it("puts beers without the chosen rating last and keeps menu order on ties", () => {
    expect(sortItems(items, "global", id).map((i) => i.index)).toEqual([2, 0, 3, 1]);
    expect(sortItems(items, "friends", id).map((i) => i.index)).toEqual([2, 3, 0, 1]);
    expect(sortItems(items, "menu", id).map((i) => i.index)).toEqual([0, 1, 2, 3]);
  });
  it("never counts unknown history as new to me", () => {
    expect(filterItems(items, "new", id).map((i) => i.index)).toEqual([0]);
    expect(filterItems(items, "unknown", id).map((i) => i.index)).toEqual([1, 3]);
  });
});

describe("placeCallouts", () => {
  const view = { width: 400, height: 600 };
  const size = { width: 80, height: 20 };

  it("places a callout to the right of the text when there is room", () => {
    const [p] = placeCallouts([{ id: "a", box: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 } }], size, view);
    expect(p.side).toBe("right");
    expect(p.rect!.x).toBeGreaterThanOrEqual(0.4 * 400);
  });

  it("never covers another beer's text or leaves the photo", () => {
    const anchors = [
      { id: "a", box: { x: 0.05, y: 0.1, width: 0.4, height: 0.04 } },
      { id: "b", box: { x: 0.5, y: 0.1, width: 0.45, height: 0.04 } },
      { id: "c", box: { x: 0.05, y: 0.16, width: 0.9, height: 0.04 } },
    ];
    const placed = placeCallouts(anchors, size, view);
    const texts = anchors.map((a) => ({ x: a.box.x * 400, y: a.box.y * 600, w: a.box.width * 400, h: a.box.height * 600 }));
    for (const p of placed) {
      if (!p.rect) continue;
      expect(p.rect.x).toBeGreaterThanOrEqual(0);
      expect(p.rect.x + p.rect.width).toBeLessThanOrEqual(400);
      for (const t of texts) {
        const overlap = p.rect.x < t.x + t.w && t.x < p.rect.x + p.rect.width && p.rect.y < t.y + t.h && t.y < p.rect.y + p.rect.height;
        expect(overlap).toBe(false);
      }
    }
  });

  it("gives up (list only) when no side has room", () => {
    const [p] = placeCallouts([{ id: "a", box: { x: 0, y: 0, width: 1, height: 1 } }], size, view);
    expect(p.rect).toBeNull();
  });
});
