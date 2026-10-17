# Arntappd alpha backlog

All 15 issues below were created on GitHub and read back successfully on October 17, 2026. The Markdown files preserve the submitted issue bodies; GitHub is authoritative for subsequent discussion and status.

## Current repository state

On October 17, 2026, this restored checkout and remote `main` contained only the original `.gitkeep`. The earlier application files described in the conversation were absent. Checking available workspace files, Git objects, branches and reflogs found no recoverable application source. The user-provided `arntappd.zip` was inspected as well: it contains the same `.gitkeep` plus Git metadata for the initial commit, with no source/tests to recover. No archive hooks or configuration were executed. Do not deploy this repository as an app until MVP-01 is resolved.

Historical chat reports described a Next.js 16.4 / React photo-menu MVP using Google Vision OCR and the Untappd API, with sample data, up to three match candidates, manual search and rating overlays. Those files and reported passing checks cannot currently be reproduced from this checkout. Issue bodies distinguish that history from current evidence.

Render is the selected alpha host. Railway was rejected; no deployment has been created by this backlog work. API credentials must stay in secure environment settings, never source or issue bodies.

## Proposed issues

### MVP

- [MVP-01 / #1: Recover and commit the photo-menu implementation](https://github.com/jeffpaul/arntappd/issues/1) ([submitted body](mvp-01.md))
- [MVP-02 / #2: Configure Render and publish a reachable HTTPS alpha](https://github.com/jeffpaul/arntappd/issues/2) ([submitted body](mvp-02.md))
- [MVP-03 / #3: Verify Google Vision and Untappd from the deployed host](https://github.com/jeffpaul/arntappd/issues/3) ([submitted body](mvp-03.md))
- [MVP-04 / #4: Complete deployed Untappd sign-in and personalized-data validation](https://github.com/jeffpaul/arntappd/issues/4) ([submitted body](mvp-04.md))
- [MVP-05 / #5: Test camera capture and photo-library upload on iPhone 17](https://github.com/jeffpaul/arntappd/issues/5) ([submitted body](mvp-05.md))
- [MVP-06 / #6: Evaluate real drink menus and verify matching/overlay fallbacks](https://github.com/jeffpaul/arntappd/issues/6) ([submitted body](mvp-06.md))
- [MVP-07 / #7: Document alpha guardrails and an end-to-end tester checklist](https://github.com/jeffpaul/arntappd/issues/7) ([submitted body](mvp-07.md))

### Post-MVP

- [POST-01 / #8: Persist sessions, caches and rate limits for broader deployment](https://github.com/jeffpaul/arntappd/issues/8) ([submitted body](post-01.md))
- [POST-02 / #9: Improve personal history coverage and friends-rating context](https://github.com/jeffpaul/arntappd/issues/9) ([submitted body](post-02.md))
- [POST-03 / #10: Recognize individual beers in store-shelf photos](https://github.com/jeffpaul/arntappd/issues/10) ([submitted body](post-03.md))
- [POST-04 / #11: Identify beers from rows of tap handles](https://github.com/jeffpaul/arntappd/issues/11) ([submitted body](post-04.md))
- [POST-05 / #12: Add live camera recognition and stable AR overlays](https://github.com/jeffpaul/arntappd/issues/12) ([submitted body](post-05.md))
- [POST-06 / #13: Broaden browser, Android-device and accessibility coverage](https://github.com/jeffpaul/arntappd/issues/13) ([submitted body](post-06.md))
- [POST-07 / #14: Improve OCR quality, matching confidence and scan efficiency](https://github.com/jeffpaul/arntappd/issues/14) ([submitted body](post-07.md))
- [POST-08 / #15: Prepare privacy, retention and operational support for a public beta](https://github.com/jeffpaul/arntappd/issues/15) ([submitted body](post-08.md))

## Publishing the issues

Initial GitHub API requests were blocked by the network proxy. After `api.github.com` was added to the cloud configuration draft, authenticated API requests became available and all 15 issues were created and verified. The domain requirement is saved in the draft; publication remains a separate user action. Git push access was also verified.

To resume or verify publication without duplicating matching issues, run:

```sh
python3 scripts/publish-backlog.py --repo jeffpaul/arntappd
```

The script reads existing issues (including closed ones), skips exact matching titles, creates issues in dependency order, and replaces dependency placeholders with actual issue links. It stops on API errors. Re-running resumes using remote titles; it does not duplicate an already-created matching issue. Creation is followed by a read-back check. A local receipt is ignored by Git.

To validate the files without accessing GitHub:

```sh
python3 scripts/publish-backlog.py --dry-run
```
