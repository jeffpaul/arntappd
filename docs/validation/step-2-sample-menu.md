# MVP step 2: end to end on the sample menu

Run 2026-11-02 in the cloud development environment, Node 22.23, Next.js
16.4.3, production build (`npm run build && npm start`). Mixed run: Untappd
calls were live; the menu reading came from the stored sample reading because
no Anthropic API key was configured in this environment.

## What was checked

| Check | How | Result |
| --- | --- | --- |
| Unit tests | `npm test` | 38 passed: reading clean-up, candidate ranking (with real Untappd hit lists), rating semantics, sorting/filtering, callout placement, Untappd response parsing, image normalization, and the vision request/response contract against a local stand-in API. |
| Typecheck and build | `npm run typecheck`, `npm run build` | Pass. |
| Health and status | `GET /api/health`, `GET /api/status` | `ok`; Untappd configured, vision not configured, no dev token. |
| Sample scan | Tap "Try the sample menu" | 8 beers with boxes, labeled as a stored reading. |
| Live matching | `GET /api/match` for all 8 sample beers | Correct beer suggested 8/8, including Bourbon County Brand Stout (2023), picked over its 14.1% sibling by the printed ABV. |
| Live global ratings | `GET /api/beer/4133` | Two Hearted IPA: 3.93 from 555k ratings, 1.7M check-ins, matching `beer/info`. |
| Browser flow | Playwright, iPhone 13 emulation | Sample, match, confirm all, photo pins and callouts (8/8 fit), list sorted by global rating, no horizontal overflow, no console errors. |
| Errors | Cross-site POST, non-image upload, bad and unknown beer ids, upload with no vision key | 403, 415, 400, 404, 503, each with a readable message. |

## Not checked yet

- **The live vision call.** The request shape and reply parsing are tested
  against a stand-in, but no real Claude call has run. Set `ANTHROPIC_API_KEY`
  and scan the sample menu (it then goes through the real call) to confirm
  names and box positions.
- **You and Friends ratings.** No Untappd access token was available. The
  friends-feed field names (`checkin_id`, `rating_score`, `user.uid`,
  `beer.bid`, `pagination.max_id`) follow Untappd's documented check-in
  shape and the step 1 probe, but have not been read back live by this code.
  Step 3 (sign-in) is where this gets verified.
- Real photos, iPhone Safari, HEIC input, deployment: step 3.

## Untappd budget for one sample scan

8 searches plus 8 beer-detail calls = 16 calls on the app key, about a fifth
of the hourly budget. Repeat scans within the cache windows cost nothing. With
a token, a first load adds 1 account call and up to 8 friends-feed pages.
