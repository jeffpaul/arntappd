import type { BeerDetails, MatchResult, MenuBeer } from "@/lib/types";

export type Load<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: T }
  | { status: "error"; message: string };

export type Item = {
  key: string;
  /** Position on the menu, from 0. Shown to people as index + 1. */
  index: number;
  menu: MenuBeer;
  match: Load<MatchResult>;
  /** Only a deliberate tap sets this; a suggestion never does. */
  selectedId: number | null;
  details: Load<BeerDetails>;
  removed: boolean;
};

export const newItems = (beers: MenuBeer[], scanId: number): Item[] =>
  beers.map((menu, index) => ({
    key: `${scanId}-${index}`,
    index,
    menu,
    match: { status: "idle" },
    selectedId: null,
    details: { status: "idle" },
    removed: false,
  }));

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("No connection. Check your network and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${response.status}).`);
  }
  return body as T;
}

export const fmtRating = (n: number | null) => (n === null ? "—" : n.toFixed(2));

export function fmtCount(n: number | null): string {
  if (n === null) return "?";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
