import type { BeerCandidate, MatchResult, MenuBeer } from "./types";

/** A search hit from Untappd, reduced to what ranking needs. */
export type SearchHit = {
  id: number;
  name: string;
  brewery: string;
  style: string | null;
  abv: number | null;
  checkinCount: number | null;
  slug: string | null;
};

const BREWERY_NOISE = new Set([
  "brewing", "brewery", "brewers", "brewhouse", "beer", "beers", "company", "co",
  "inc", "ltd", "llc", "the", "brasserie", "brouwerij", "craft", "ales", "and",
]);

/** Lowercase, strip accents and punctuation, unify apostrophes. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// "14.1%" in an Untappd name is a variant label, not part of the beer's name.
const stripAbv = (s: string) => s.replace(/\b\d{1,2}(\.\d+)?\s?%/g, " ");
const tokens = (s: string) => normalizeText(stripAbv(s)).split(" ").filter(Boolean);
const breweryTokens = (s: string) => tokens(s).filter((t) => !BREWERY_NOISE.has(t));

/** Share of menu tokens found in the candidate (recall), blended with Dice overlap. */
export function tokenSimilarity(menu: string[], candidate: string[]): number {
  if (!menu.length || !candidate.length) return 0;
  const cand = new Set(candidate);
  const hits = menu.filter((t) => cand.has(t)).length;
  const recall = hits / menu.length;
  const dice = (2 * hits) / (menu.length + candidate.length);
  return 0.5 * recall + 0.5 * dice;
}

/** Search text for Untappd: brewery plus beer name, as Untappd's docs suggest. */
export function buildQuery(beer: Pick<MenuBeer, "name" | "brewery" | "vintage">): string {
  // Untappd lists each vintage as its own beer, so a printed year helps search.
  const year = beer.vintage && !beer.name.includes(beer.vintage) ? beer.vintage : "";
  const parts = [beer.brewery ?? "", beer.name, year];
  let q = parts.join(" ").replace(/\s+/g, " ").trim();
  // Drop a brewery repeated inside the name ("Guinness Guinness Draught").
  const words = q.split(" ");
  q = words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase()).join(" ");
  return q.slice(0, 120);
}

const YEAR = /\b(19|20)\d{2}\b/g;
const YEAR_TOKEN = /^(19|20)\d{2}$/;
const withoutYears = (ts: string[]) => ts.filter((t) => !YEAR_TOKEN.test(t));

export function untappdBeerUrl(id: number, slug: string | null): string {
  return slug
    ? `https://untappd.com/b/${encodeURIComponent(slug)}/${id}`
    : `https://untappd.com/beer/${id}`;
}

/** Minimum score for a candidate to be offered as the suggested match. */
export const SUGGEST_THRESHOLD = 0.5;

/**
 * Re-rank Untappd's hits against what the menu said. Name agreement matters
 * most, then brewery, then an explicit vintage and a close ABV. Check-in volume only breaks
 * near-ties. Returns at most three candidates.
 */
export function rankCandidates(
  beer: Pick<MenuBeer, "name" | "brewery" | "vintage"> & { abv?: number | null },
  hits: SearchHit[],
  query = buildQuery(beer),
): MatchResult {
  const nameTokens = withoutYears(tokens(beer.name));
  const menuBrewery = beer.brewery ? breweryTokens(beer.brewery) : [];
  const menuYears = new Set([...(beer.name + " " + (beer.vintage ?? "")).matchAll(YEAR)].map((m) => m[0]));
  const maxCheckins = Math.max(1, ...hits.map((h) => h.checkinCount ?? 0));

  const scored = hits.map((hit, index) => {
    const candName = withoutYears(tokens(hit.name));
    const candBrewery = breweryTokens(hit.brewery);
    // Brewery words sometimes appear in the beer name on menus and vice versa.
    const nameScore = Math.max(
      tokenSimilarity(nameTokens, candName),
      tokenSimilarity(nameTokens, [...candName, ...candBrewery]) * 0.9,
    );
    const breweryScore = menuBrewery.length
      ? tokenSimilarity(menuBrewery, candBrewery)
      : 0.5;
    const candYears = new Set([...hit.name.matchAll(YEAR)].map((m) => m[0]));
    let vintageScore = 0;
    if (menuYears.size) {
      const agree = [...menuYears].some((y) => candYears.has(y));
      vintageScore = agree ? 1 : candYears.size ? -1 : 0;
    } else if (candYears.size) {
      vintageScore = -0.3; // menu named no year; prefer the base beer
    }
    // ABV printed on the menu helps pick between near-identical variants.
    let abvScore = 0;
    if (beer.abv && hit.abv) {
      const diff = Math.abs(beer.abv - hit.abv);
      abvScore = diff <= 0.15 ? 1 : diff <= 0.5 ? 0.5 : diff >= 2 ? -0.5 : 0;
    }
    const popularity = Math.log10(1 + (hit.checkinCount ?? 0)) / Math.log10(1 + maxCheckins);
    const providerOrder = 1 - index / Math.max(1, hits.length);
    const score =
      0.6 * nameScore +
      0.25 * breweryScore +
      0.08 * vintageScore +
      0.03 * abvScore +
      0.015 * popularity +
      0.005 * providerOrder;
    return { hit, score: Math.max(0, Math.min(1, score)) };
  });

  scored.sort((a, b) => b.score - a.score || a.hit.id - b.hit.id);
  const top = scored.slice(0, 3);
  const candidates: BeerCandidate[] = top.map(({ hit, score }) => ({
    id: hit.id,
    name: hit.name,
    brewery: hit.brewery,
    style: hit.style,
    abv: hit.abv,
    checkinCount: hit.checkinCount,
    untappdUrl: untappdBeerUrl(hit.id, hit.slug),
    score: Math.round(score * 1000) / 1000,
  }));
  const best = candidates[0];
  return {
    query,
    candidates,
    suggestedId: best && best.score >= SUGGEST_THRESHOLD ? best.id : null,
  };
}
