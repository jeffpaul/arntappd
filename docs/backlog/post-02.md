## Goal and current evidence

The planned personal history scan covers at most 200 recent distinct beers, and friends context comes from up to 100 recent check-ins. This does not reproduce the historical You/Friends/Global table from Untappd’s website. Investigate the approved API’s actual capabilities and rate-budget tradeoffs before promising parity. Do not add scraping as an assumed fallback.

## Dependencies

- {{MVP-04}}

## Acceptance criteria

- [ ] Document which personal/friends aggregates the approved API can provide and which remain unavailable.
- [ ] Improve pagination/caching where permitted without violating quotas or incorrectly interpreting missing data as zero.
- [ ] Keep coverage, timestamps, unique-friend versus check-in semantics and unavailable historical aggregates clear in the UI.

## Tracking

Backlog ID: `POST-02`. Phase: Post-MVP.
