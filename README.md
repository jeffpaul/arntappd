# Arntappd

A mobile web app for photographing a beer menu, confirming Untappd matches,
and comparing personal, friends' and global ratings.

## Start with the rebuild roadmap

Read [ROADMAP.md](ROADMAP.md) for the complete restart specification: agreed
product scope, rating semantics, API constraints, architecture, photo/OCR and
matching pipelines, implementation milestones, Render setup, verification,
troubleshooting, and post-MVP work. It includes a brief for a new developer or
coding agent and links every existing issue.

Use [the validation template](docs/validation/TEMPLATE.md) to record actual
results during the rebuild.

## Run it

Needs Node 22 or later.

```sh
npm ci
cp .env.example .env.local   # then fill in the values you have
npm run dev                  # http://localhost:3000
```

| Variable | What it turns on |
| --- | --- |
| `UNTAPPD_CLIENT_ID`, `UNTAPPD_CLIENT_SECRET` | Beer search and global ratings. Required. |
| `ANTHROPIC_API_KEY` | Reading menu photos with Claude (one vision call per photo). Without it, only the sample menu works, using a stored reading. |
| `ANTHROPIC_MODEL` | Optional model override. Defaults to `claude-opus-5-5`. |
| `UNTAPPD_ACCESS_TOKEN` | Development only, until Untappd sign-in lands: shows your own and your friends' ratings. |

Other commands: `npm test` (unit tests), `npm run typecheck`, `npm run build`
then `npm start`, and `npm run sample-menu` to regenerate the sample menu image
and its stored reading.

## How it works

1. **Read the menu.** `POST /api/scan` shrinks the photo to 2,200 px, strips
   metadata, and makes one Claude vision call that returns each beer's name,
   brewery, style, vintage, ABV, price and a box around it on the photo.
2. **Match on Untappd.** The browser asks `GET /api/match` for each beer, two
   at a time. The server searches Untappd for "brewery + name (+ year)" and
   re-ranks the hits by name, brewery, vintage and ABV, returning up to three.
3. **Confirm.** Nothing is treated as identified until you tap Confirm (or
   "Confirm all suggested"). You can pick another candidate, search by hand,
   or mark a line as not a beer.
4. **Ratings.** `GET /api/beer/{id}` returns three separate numbers: You (your
   own rating and check-ins for this beer), Friends (from your friends' recent
   check-ins, roughly the last month) and Global (Untappd's average, with
   rating and check-in counts kept apart). Missing data shows as a dash with
   the reason, never as zero.
5. **Photo and list.** Numbered pins sit on the photo with a short ratings
   callout where there is room; every beer is also in the List view, which
   sorts by global, friends' or your rating and filters to "New to me".

Untappd allows 100 calls an hour per key. The server stops at 85, caches
searches (6 hours), beer details (1 hour) and the friends feed (10 minutes),
and limits photo reading to 30 scans an hour.

## Status

MVP step 2 of 3: the core flow works end to end on the sample menu. Step 3 is
Untappd sign-in, deploying to Render, and testing real menus on an iPhone.
[Untappd API findings](docs/validation/untappd-api-findings.md) and the
[step 2 record](docs/validation/step-2-sample-menu.md) have the details.

See [the backlog](docs/backlog/README.md) for 7 MVP issues and 8 post-MVP issues,
including Render deployment, live-provider validation, Untappd sign-in, physical
iPhone testing, shelf/tap-handle recognition, and live camera overlays.

All 15 backlog issues have been created on GitHub and verified. The backlog
index links to each issue and preserves its submitted body. A resumable
publishing script skips existing matching issues to avoid duplicates.
