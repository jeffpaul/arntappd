# Arntappd alpha backlog

These are prepared GitHub issue bodies, not proof that remote issues exist.

## Current repository state

On October 17, 2026, this restored checkout and remote `main` contained only the original `.gitkeep`. The earlier application files described in the conversation were absent. Checking available workspace files, Git objects, branches and reflogs found no recoverable application source. The user-provided `arntappd.zip` was inspected as well: it contains the same `.gitkeep` plus Git metadata for the initial commit, with no source/tests to recover. No archive hooks or configuration were executed. Do not deploy this repository as an app until MVP-01 is resolved.

Historical chat reports described a Next.js 16.4 / React photo-menu MVP using Google Vision OCR and the Untappd API, with sample data, up to three match candidates, manual search and rating overlays. Those files and reported passing checks cannot currently be reproduced from this checkout. Issue bodies distinguish that history from current evidence.

Render is the selected alpha host. Railway was rejected; no deployment has been created by this backlog work. API credentials must stay in secure environment settings, never source or issue bodies.

## Proposed issues

### MVP

- [MVP-01: Recover and commit the photo-menu implementation](mvp-01.md)
- [MVP-02: Configure Render and publish a reachable HTTPS alpha](mvp-02.md)
- [MVP-03: Verify Google Vision and Untappd from the deployed host](mvp-03.md)
- [MVP-04: Complete deployed Untappd sign-in and personalized-data validation](mvp-04.md)
- [MVP-05: Test camera capture and photo-library upload on iPhone 17](mvp-05.md)
- [MVP-06: Evaluate real drink menus and verify matching/overlay fallbacks](mvp-06.md)
- [MVP-07: Document alpha guardrails and an end-to-end tester checklist](mvp-07.md)

### Post-MVP

- [POST-01: Persist sessions, caches and rate limits for broader deployment](post-01.md)
- [POST-02: Improve personal history coverage and friends-rating context](post-02.md)
- [POST-03: Recognize individual beers in store-shelf photos](post-03.md)
- [POST-04: Identify beers from rows of tap handles](post-04.md)
- [POST-05: Add live camera recognition and stable AR overlays](post-05.md)
- [POST-06: Broaden browser, Android-device and accessibility coverage](post-06.md)
- [POST-07: Improve OCR quality, matching confidence and scan efficiency](post-07.md)
- [POST-08: Prepare privacy, retention and operational support for a public beta](post-08.md)

## Publishing the issues

The current environment can access the Git repository, but the initial GitHub API checks were rejected by the network proxy. `api.github.com` has been added to the cloud configuration draft; that save does not apply or publish it. API connectivity and authentication remain to be verified after the settings are applied.

Once GitHub API access is available, run:

```sh
python3 scripts/publish-backlog.py --repo jeffpaul/arntappd
```

The script reads existing issues (including closed ones), skips exact matching titles, creates issues in dependency order, and replaces dependency placeholders with actual issue links. It stops on API errors. Re-running resumes using remote titles; it does not duplicate an already-created matching issue. Creation is followed by a read-back check. A local receipt is ignored by Git.

To validate the files without accessing GitHub:

```sh
python3 scripts/publish-backlog.py --dry-run
```
