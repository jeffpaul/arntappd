import "server-only";
import { createHash } from "node:crypto";
import { type SearchHit } from "@/lib/matching";
import type { BeerInfoStats, FeedCheckin, FriendsFeed } from "@/lib/metrics";
import { canSpend, recordCall } from "./budget";
import { TtlCache, singleton } from "./cache";
import { config } from "./config";
import { AppError } from "./errors";

const API = "https://api.untappd.com/v4";
const USER_AGENT = "Arntappd/0.1 (beer-menu discovery)";
const TIMEOUT_MS = 12_000;

const MINUTE = 60_000;
const searchCache = singleton("untappdSearch", () => new TtlCache<SearchHit[]>(500, 6 * 60 * MINUTE));
const infoCache = singleton("untappdInfo", () => new TtlCache<BeerInfo>(1000, 60 * MINUTE));
const personalCache = singleton("untappdPersonal", () => new TtlCache<BeerInfo>(1000, 10 * MINUTE));
const feedCache = singleton("untappdFeed", () => new TtlCache<FriendsFeed>(50, 10 * MINUTE));
const userCache = singleton("untappdUser", () => new TtlCache<{ uid: number }>(50, 60 * MINUTE));

/** Friends feed: Untappd stops paging after roughly 350 check-ins, so 8 pages of 50 covers it. */
const FEED_PAGE_SIZE = 50;
const FEED_MAX_PAGES = 8;

export type BeerInfo = {
  id: number;
  name: string;
  brewery: string;
  style: string | null;
  abv: number | null;
  vintage: string | null;
  slug: string | null;
  labelUrl: string | null;
  stats: BeerInfoStats;
};

type Auth = { token: string | null };

const tokenScope = (token: string) =>
  "token:" + createHash("sha256").update(token).digest("hex").slice(0, 16);

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

/**
 * GET an Untappd endpoint. Credentials go in the query string (Untappd's
 * convention), so the URL is never logged or put in an error.
 */
async function call(path: string, params: Record<string, string>, auth: Auth): Promise<Json> {
  const id = config.untappdClientId();
  const secret = config.untappdClientSecret();
  if (!auth.token && !(id && secret)) {
    throw new AppError("LOOKUP_UNAVAILABLE", "Untappd lookups are not configured on this server.", 503);
  }
  const scope = auth.token ? tokenScope(auth.token) : "app";
  if (!canSpend(scope)) {
    throw new AppError("PROVIDER_LIMIT", "Untappd's hourly limit is nearly used up. Try again later.", 429);
  }
  const query = new URLSearchParams(params);
  if (auth.token) query.set("access_token", auth.token);
  else {
    query.set("client_id", id as string);
    query.set("client_secret", secret as string);
  }

  let response: Response;
  try {
    response = await fetch(`${API}${path}?${query}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new AppError("LOOKUP_UNAVAILABLE", "Could not reach Untappd. Check the connection and try again.", 502);
  }
  const remaining = Number(response.headers.get("x-ratelimit-remaining"));
  recordCall(scope, response.headers.has("x-ratelimit-remaining") ? remaining : null);

  let body: Json = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const code = body?.meta?.code ?? response.status;
  if (response.status === 429 || code === 429 || body?.meta?.error_type === "invalid_limit") {
    throw new AppError("PROVIDER_LIMIT", "Untappd's hourly limit is used up. Try again later.", 429);
  }
  if (code === 404 || body?.meta?.error_type === "invalid_param") {
    throw new AppError("NOT_FOUND", "Untappd has no beer with that id.", 404);
  }
  if (!response.ok || code !== 200 || !body?.response) {
    throw new AppError("LOOKUP_UNAVAILABLE", "Untappd returned an error. Try again shortly.", 502);
  }
  return body.response;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export function parseSearch(response: Json): SearchHit[] {
  const items: Json[] = Array.isArray(response?.beers?.items) ? response.beers.items : [];
  const hits: SearchHit[] = [];
  for (const item of items) {
    const id = num(item?.beer?.bid);
    const name = str(item?.beer?.beer_name);
    const brewery = str(item?.brewery?.brewery_name);
    if (id === null || !name || !brewery) continue;
    hits.push({
      id,
      name,
      brewery,
      style: str(item.beer.beer_style),
      abv: num(item.beer.beer_abv),
      checkinCount: num(item.checkin_count),
      slug: str(item.beer.beer_slug),
    });
  }
  return hits;
}

export async function searchBeers(q: string): Promise<SearchHit[]> {
  const key = q.toLowerCase().replace(/\s+/g, " ").trim();
  const cached = searchCache.get(key);
  if (cached) return cached;
  // Search with the app key even when signed in, to spare the user's own budget.
  const response = await call("/search/beer", { q: key, limit: "10" }, { token: null });
  const hits = parseSearch(response);
  searchCache.set(key, hits);
  return hits;
}

export function parseBeerInfo(response: Json, authenticated: boolean): BeerInfo | null {
  const beer = response?.beer;
  const id = num(beer?.bid);
  const name = str(beer?.beer_name);
  if (id === null || !name) return null;
  const vintageYear = num(beer.vintage_year);
  return {
    id,
    name,
    brewery: str(beer.brewery?.brewery_name) ?? "Unknown brewery",
    style: str(beer.beer_style),
    abv: num(beer.beer_abv),
    vintage: vintageYear ? String(vintageYear) : null,
    slug: str(beer.beer_slug),
    labelUrl: safeAssetUrl(str(beer.beer_label)),
    stats: {
      ratingScore: num(beer.rating_score),
      ratingCount: num(beer.rating_count),
      totalCheckins: num(beer.stats?.total_count),
      userCount: authenticated ? num(beer.stats?.user_count) : null,
      authRating: authenticated ? num(beer.auth_rating) : null,
    },
  };
}

/** Only pass through Untappd's own HTTPS asset URLs. */
function safeAssetUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "untappd.com" || u.hostname.endsWith(".untappd.com")) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Beer details. With a token, the same call also carries your own check-ins and rating. */
export async function beerInfo(id: number, token: string | null): Promise<BeerInfo> {
  const cache = token ? personalCache : infoCache;
  const key = token ? `${tokenScope(token)}:${id}` : String(id);
  const cached = cache.get(key);
  if (cached) return cached;
  const response = await call(`/beer/info/${id}`, { compact: "true" }, { token });
  const info = parseBeerInfo(response, Boolean(token));
  if (!info) throw new AppError("LOOKUP_UNAVAILABLE", "Untappd returned an unexpected beer record.", 502);
  cache.set(key, info);
  return info;
}

export async function currentUserId(token: string): Promise<number | null> {
  const key = tokenScope(token);
  const cached = userCache.get(key);
  if (cached) return cached.uid;
  const response = await call("/user/info", { compact: "true" }, { token });
  const uid = num(response?.user?.uid);
  if (uid !== null) userCache.set(key, { uid });
  return uid;
}

export function parseCheckins(response: Json): { items: FeedCheckin[]; nextMaxId: number | null } {
  const raw: Json[] = Array.isArray(response?.checkins?.items) ? response.checkins.items : [];
  const items: FeedCheckin[] = [];
  for (const c of raw) {
    const checkinId = num(c?.checkin_id);
    const beerId = num(c?.beer?.bid);
    const userId = num(c?.user?.uid);
    if (checkinId === null || beerId === null || userId === null) continue;
    const created = str(c.created_at);
    const time = created ? new Date(created) : null;
    items.push({
      checkinId,
      beerId,
      userId,
      rating: num(c.rating_score),
      createdAt: time && !Number.isNaN(time.getTime()) ? time.toISOString() : null,
    });
  }
  const nextMaxId = num(response?.pagination?.max_id);
  return { items, nextMaxId };
}

/** Your friends' recent check-ins, paged until Untappd runs out or we hit our cap. */
export async function friendsFeed(token: string): Promise<FriendsFeed> {
  const key = tokenScope(token);
  const cached = feedCache.get(key);
  if (cached) return cached;
  const checkins: FeedCheckin[] = [];
  const seen = new Set<number>();
  let maxId: number | null = null;
  let exhausted = false;
  for (let page = 0; page < FEED_MAX_PAGES; page++) {
    const params: Record<string, string> = { limit: String(FEED_PAGE_SIZE) };
    if (maxId !== null) params.max_id = String(maxId);
    const { items, nextMaxId } = parseCheckins(await call("/checkin/recent", params, { token }));
    let added = 0;
    for (const item of items) {
      if (seen.has(item.checkinId)) continue;
      seen.add(item.checkinId);
      checkins.push(item);
      added++;
    }
    if (!items.length || added === 0 || nextMaxId === null || nextMaxId === maxId) {
      exhausted = true;
      break;
    }
    maxId = nextMaxId;
  }
  const times = checkins.map((c) => c.createdAt).filter((t): t is string => Boolean(t)).sort();
  const feed: FriendsFeed = { checkins, oldest: times[0] ?? null, exhausted };
  feedCache.set(key, feed);
  return feed;
}
