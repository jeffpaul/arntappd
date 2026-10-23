# Untappd API findings (MVP step 1)

Probe run 2026-10-23 with `scripts/untappd-probe.py` against one real account
(84 friends, 4,932 distinct beers). Field shapes only; no raw data committed.

## What works

| Need | Endpoint | Result |
| --- | --- | --- |
| Match a menu line to a beer | `GET /search/beer?q=` | Top hit correct 5/5 on menu-style text ("Two Hearted Ale Bells", "Hazy Little Thing Sierra Nevada", ...). Returns `bid`, name, style, ABV, brewery. |
| Global rating | `GET /beer/info/{bid}` | `rating_score`, `weighted_rating_score`, `rating_count`, `stats.total_count`. |
| Your rating | `GET /user/beers` | Every item has `rating_score` (0/50 unrated in sample), `count`, first/last had dates. 50 per page, so a 4,932-beer history is ~99 calls. |
| Your rating, one beer | `GET /beer/info/{bid}` with token | `auth_rating`, `stats.user_count`. |
| Friends' recent ratings | `GET /checkin/recent` | Paged by `max_id`, but stops after ~350 check-ins (~1 month). That covered 27 of 84 friends; 274 of 351 check-ins had a rating. |
| One friend's full history | `GET /user/beers/{username}` | Readable, rated. One friend had 8,024 beers (~161 calls). |

## What doesn't

- `beer/info` has a `friends` block, but it stayed empty (`count: 0`) even for
  beers friends had checked in and rated that week. Not usable.
- There is no "friends' ratings for this beer" endpoint.

## Limits

- 100 calls per hour per client key, and a separate 100 per hour per user token
  (`X-Ratelimit-Remaining` header).
- One menu of ~20 beers needs ~20 searches plus details: caching by `bid` and
  by normalized menu text is required.

## Friends rating options

1. **Feed only:** friends' ratings from the last ~month. Cheap and simple, but
   most menu beers will show no friend rating.
2. **Feed plus background history sync:** pull each friend's `/user/beers`
   slowly within the rate limit and cache it, then keep fresh from the feed.
   Rough estimate: 84 friends at ~2,000 beers each is ~3,400 calls, about 1.5
   days at 100/hour for the first sync.
3. **Drop friends for the MVP:** show You and Global only.
