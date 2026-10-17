## Goal and current evidence

The earlier design stores sessions and request counters in one process. That is suitable only for the documented single-instance alpha. Replace that state before using multiple replicas, worker/serverless hosting, or a wider public audience. Define secret encryption, session expiry, logout/revocation and provider-budget behavior.

## Dependencies

- {{MVP-07}}

## Acceptance criteria

- [ ] Shared session storage supports expiry and revocation without exposing provider tokens to the browser.
- [ ] Caches and atomic rate limits behave correctly across concurrent instances and restarts.
- [ ] Tests exercise cross-instance login, expiry/revocation and quota enforcement; hosting documentation identifies the supported architecture.

## Tracking

Backlog ID: `POST-01`. Phase: Post-MVP.
