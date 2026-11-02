import type { Box, MenuBeer } from "./types";

/**
 * What the vision model returns for one beer. Coordinates are integers on a
 * 0..1000 grid over the image, which is easier for the model than fractions.
 */
export type RawReadingBeer = {
  name: string;
  brewery: string | null;
  style: string | null;
  vintage: string | null;
  abv: number | null;
  price: string | null;
  box: { left: number; top: number; right: number; bottom: number } | null;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function gridBoxToBox(
  box: RawReadingBeer["box"],
): Box | null {
  if (!box) return null;
  const values = [box.left, box.top, box.right, box.bottom];
  if (!values.every((v) => Number.isFinite(v))) return null;
  const x1 = clamp01(Math.min(box.left, box.right) / 1000);
  const x2 = clamp01(Math.max(box.left, box.right) / 1000);
  const y1 = clamp01(Math.min(box.top, box.bottom) / 1000);
  const y2 = clamp01(Math.max(box.top, box.bottom) / 1000);
  if (x2 - x1 < 0.002 || y2 - y1 < 0.002) return null;
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return { x: r(x1), y: r(y1), width: r(x2 - x1), height: r(y2 - y1) };
}

const tidy = (s: string | null | undefined): string | null => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? t : null;
};

/** Clean the model's reading into menu beers, dropping blanks and exact repeats. */
export function normalizeReading(raw: RawReadingBeer[]): MenuBeer[] {
  const seen = new Set<string>();
  const out: MenuBeer[] = [];
  for (const item of raw) {
    const name = tidy(item.name);
    if (!name) continue;
    const brewery = tidy(item.brewery);
    const key = `${name.toLowerCase()}|${(brewery ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const abv =
      typeof item.abv === "number" && Number.isFinite(item.abv) && item.abv >= 0 && item.abv <= 70
        ? item.abv
        : null;
    out.push({
      name,
      brewery,
      style: tidy(item.style),
      vintage: tidy(item.vintage),
      abv,
      price: tidy(item.price),
      box: gridBoxToBox(item.box),
    });
  }
  return out;
}
