## Goal and current evidence

OAuth initiation was reported as tested earlier, but interactive sign-in, authorization-code exchange and personal/friends responses were not verified. Register the HTTPS callback in Untappd API Central and complete the entire flow on the deployed alpha.

Compare known beers with the user’s Untappd history. Preserve distinctions between signed out, missing data, untried, checked in but unrated, and an actual score of zero. The planned friends data is recent check-ins, not the historical friends aggregate shown on Untappd’s website.

## Dependencies

- {{MVP-02}}
- {{MVP-03}}

## Acceptance criteria

- [ ] The registered callback exactly matches APP_BASE_URL/api/auth/callback; sign-in, cancel/denial, invalid state and sign-out behave correctly.
- [ ] Access tokens remain server-side; cookies have appropriate HttpOnly, Secure and SameSite settings.
- [ ] Known personal check-in counts and ratings agree with API results; truncated history cannot incorrectly mark a beer untried.
- [ ] Friends counts explicitly mean recent check-ins, not unique friends; averages exclude unrated entries and limited coverage is explained.
- [ ] Restarting the single-instance app has documented, predictable sign-in behavior.

## Tracking

Backlog ID: `MVP-04`. Phase: MVP.
