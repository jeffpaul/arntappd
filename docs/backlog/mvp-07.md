## Goal and current evidence

Provide a short checklist that lets the tester open the HTTPS app, try the labeled sample, sign in, photograph a menu, correct matches, compare ratings and report a problem. Explain the friends/history limitations and that this alpha uses photos rather than live camera tracking.

Before making the alpha link available, verify provider-side quotas/budget alerts, server-only secrets, photo handling, and the app’s existing input/rate controls. In-memory request counters are not durable spending controls.

## Dependencies

- {{MVP-03}}
- {{MVP-04}}
- {{MVP-05}}
- {{MVP-06}}

## Acceptance criteria

- [ ] Tester instructions include the live URL, sample-to-photo workflow, expected behavior, known limitations and a reproducible bug-report format.
- [ ] Google quotas/budget alerts and Untappd request limits are checked for the intended small alpha audience; no unlimited public launch is implied.
- [ ] Photos are not persisted unexpectedly, consent explains Google processing, and logs/errors do not disclose images, OAuth tokens or API secrets.
- [ ] A fresh-checkout verification/build workflow exists and the alpha checklist records pass/fail/pending outcomes; unverified personalization is not marked complete.

## Tracking

Backlog ID: `MVP-07`. Phase: MVP.
