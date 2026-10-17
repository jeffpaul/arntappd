## Goal and current evidence

Use alpha measurements to improve multi-column line grouping, heading/price filtering, brewery/vintage association and candidate ranking. The earlier plan searches at most 12 recognized lines serially; larger menus need explicit coverage and budget-aware behavior. Evaluate optimizations against a fixed labeled set rather than adding heuristics without evidence.

## Dependencies

- {{MVP-06}}

## Acceptance criteria

- [ ] A repeatable evaluation records extraction accuracy, top-three match coverage, confidence calibration and failure modes.
- [ ] Improved matching reduces wrong associations while preserving explicit confirmation and manual recovery.
- [ ] Large-menu handling makes unprocessed lines visible; caching/request deduplication improve latency within provider quotas.
- [ ] Any recognition-provider change includes measured cost and privacy tradeoffs.

## Tracking

Backlog ID: `POST-07`. Phase: Post-MVP.
