## Goal and current evidence

Use Render as the selected alpha host; Railway was rejected because its setup was confusing. Keep deployment settings in the repository and minimize dashboard steps. The intended architecture is one persistent Node.js instance with native image-processing support. An in-memory session store is acceptable for this single-tester alpha if restart/sign-out behavior is explicit.

Prepare a Blueprint or equivalent supported configuration after the app is recovered. Do not purchase a paid plan or assume the user has configured billing. Verify current Render requirements, including Node compatibility, build resources, listening on the platform port, health checks, HTTPS, and free-service sleep behavior.

## Dependencies

- {{MVP-01}}

## Acceptance criteria

- [ ] Repository contains a deploy configuration with verified install/build/start commands, the Node version, a health check, and one instance.
- [ ] A deployed HTTPS URL opens in Safari on the tester’s iPhone 17 and survives a representative photo scan.
- [ ] Private runtime credentials are configured in the host; APP_BASE_URL equals the deployed origin, and no cloud proxy placeholders are copied into the host.
- [ ] Plan/cost and sleep/restart behavior are recorded; no database is required for the initial single-instance alpha.

## Tracking

Backlog ID: `MVP-02`. Phase: MVP.
