import { describe, expect, it } from "vitest";
import { gridBoxToBox, normalizeReading, type RawReadingBeer } from "@/lib/reading";
import sample from "@/lib/sample-menu.reading.json";

const beer = (over: Partial<RawReadingBeer>): RawReadingBeer => ({
  name: "Pliny the Elder",
  brewery: "Russian River",
  style: null,
  vintage: null,
  abv: 8,
  price: "$9",
  box: { left: 100, top: 200, right: 400, bottom: 240 },
  ...over,
});

describe("gridBoxToBox", () => {
  it("converts the 0-1000 grid to fractions", () => {
    expect(gridBoxToBox({ left: 100, top: 200, right: 400, bottom: 250 })).toEqual({ x: 0.1, y: 0.2, width: 0.3, height: 0.05 });
  });
  it("fixes swapped corners and clamps to the image", () => {
    const box = gridBoxToBox({ left: 1200, top: 300, right: 900, bottom: -20 })!;
    expect(box.x).toBe(0.9);
    expect(box.y).toBe(0);
    expect(box.x + box.width).toBe(1);
    expect(box.y + box.height).toBeCloseTo(0.3);
  });
  it("drops degenerate boxes instead of placing a pin at a guessed spot", () => {
    expect(gridBoxToBox({ left: 100, top: 100, right: 100, bottom: 300 })).toBeNull();
    expect(gridBoxToBox(null)).toBeNull();
  });
});

describe("normalizeReading", () => {
  it("drops blank names and exact repeats but keeps the same name from another brewery", () => {
    const out = normalizeReading([
      beer({}),
      beer({ name: "  pliny the  elder " , brewery: "russian river" }),
      beer({ name: "   " }),
      beer({ name: "IPA", brewery: "Lagunitas" }),
      beer({ name: "IPA", brewery: "Sierra Nevada" }),
    ]);
    expect(out.map((b) => `${b.brewery}/${b.name}`)).toEqual([
      "Russian River/Pliny the Elder",
      "Lagunitas/IPA",
      "Sierra Nevada/IPA",
    ]);
  });
  it("discards impossible ABV values rather than showing them", () => {
    expect(normalizeReading([beer({ abv: 750 })])[0].abv).toBeNull();
    expect(normalizeReading([beer({ abv: 0 })])[0].abv).toBe(0);
  });
});

describe("recorded sample reading", () => {
  it("has a box inside the image for every beer", () => {
    expect(sample.beers.length).toBe(8);
    for (const b of sample.beers) {
      expect(b.box.x).toBeGreaterThanOrEqual(0);
      expect(b.box.y).toBeGreaterThanOrEqual(0);
      expect(b.box.x + b.box.width).toBeLessThanOrEqual(1);
      expect(b.box.y + b.box.height).toBeLessThanOrEqual(1);
    }
  });
});
