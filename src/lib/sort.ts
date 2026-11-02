import type { BeerDetails } from "./types";

export type SortKey = "menu" | "global" | "friends" | "you";
export type Filter = "all" | "new" | "unknown";

/** What sorting needs from each item: its menu position and ratings, if loaded. */
export type SortView = { index: number; details: BeerDetails | null };

const average = (d: BeerDetails | null, key: Exclude<SortKey, "menu">) =>
  d ? (key === "global" ? d.global : key === "friends" ? d.friends : d.you).average : null;

/**
 * Sort by the chosen average, highest first. Beers without that rating go
 * last, and ties keep menu order so cards don't jump around.
 */
export function sortItems<T>(items: T[], key: SortKey, view: (item: T) => SortView): T[] {
  const copy = [...items];
  return copy.sort((ia, ib) => {
    const a = view(ia);
    const b = view(ib);
    if (key === "menu") return a.index - b.index;
    const av = average(a.details, key);
    const bv = average(b.details, key);
    if (av === null && bv === null) return a.index - b.index;
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av || a.index - b.index;
  });
}

/**
 * "new" keeps only beers you have confirmed you never checked in. "unknown"
 * keeps beers whose history is not known (not confirmed, or signed out).
 * Unknown is never folded into new.
 */
export function filterItems<T>(items: T[], filter: Filter, view: (item: T) => SortView): T[] {
  if (filter === "all") return items;
  return items.filter((item) => {
    const exp = view(item).details?.you.experience;
    if (filter === "new") return exp === "untried";
    return exp === undefined || exp === "unknown" || exp === "signed_out";
  });
}
