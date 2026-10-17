## Goal and current evidence

Before expanding beyond a small invited alpha, formalize what photo and account data is processed, retained and deleted. Add useful monitoring and incident/recovery procedures without logging photos, access tokens or credential-bearing provider URLs. Review Untappd API terms, attribution, provider restrictions and branding for the proposed release.

## Dependencies

- {{MVP-07}}
- {{POST-01}}

## Acceptance criteria

- [ ] Publish accurate privacy/retention information and implement account/session-data deletion for any stored data.
- [ ] Operational metrics cover error rates, latency, quota pressure and availability while excluding sensitive payloads.
- [ ] Document backups/recovery, credential rotation and abuse/spend controls appropriate to the deployed architecture.
- [ ] Release checks cover current provider terms/attribution and explicitly avoid implying affiliation with Untappd.

## Tracking

Backlog ID: `POST-08`. Phase: Post-MVP.
