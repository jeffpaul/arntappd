## Goal and current evidence

Move from the approved still-photo MVP toward holding up the camera and seeing information beside recognized beers. Start with an interaction/performance prototype on iOS Safari and Android Chrome. Recognition needs motion handling, throttling, stable anchors, and a deliberate privacy/cost model.

## Dependencies

- {{MVP-05}}
- {{MVP-06}}

## Acceptance criteria

- [ ] Camera lifecycle, permission denial and a photo-mode fallback work on supported browsers.
- [ ] Tracking keeps overlays associated with the correct beer through motion and temporary occlusion.
- [ ] Recognition frequency, latency, battery/network usage and API cost have measured budgets; video is not continuously uploaded without explicit product/privacy decisions.

## Tracking

Backlog ID: `POST-05`. Phase: Post-MVP.
