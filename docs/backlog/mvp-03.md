## Goal and current evidence

The earlier conversation reports successful live OCR and Untappd search/detail requests from the cloud environment. Those results do not establish access from Render. Host credentials, Google key restrictions, provider access and rate limits must be checked again from the deployed app.

Use one controlled three-beer photo and then a real drink-menu photo. Keep the demo’s illustrative statistics visibly distinct from live results. Verify upload consent, input bounds, OCR word locations, vintage preservation, top-three candidates, manual search and confirmation.

## Dependencies

- {{MVP-02}}

## Acceptance criteria

- [ ] The deployed server can call Google Vision TEXT_DETECTION and Untappd beer search/detail using server-only credentials.
- [ ] A photo submitted through the actual browser flow yields candidates and confirmed overlays/list entries with current global ratings.
- [ ] A missing credential, invalid image, upstream failure and provider rate limit produce useful errors without substituting demo data or exposing credentials.
- [ ] Evidence distinguishes live-provider checks from fixture-based UI tests.

## Tracking

Backlog ID: `MVP-03`. Phase: MVP.
