# Validation record template

Copy this file for an actual milestone or release. An unchecked field is pending,
not a passed result. Keep photos, provider tokens and private account data out
of public records. Use anonymous fixture data or private evidence references.

## Identity and environment

- Date/time and timezone:
- Milestone / linked GitHub issues:
- Commit SHA and branch:
- Remote commit confirmed:
- Deployed commit/version (if applicable):
- Canonical HTTPS URL (public app URL only; no token-bearing query strings):
- Runtime and framework versions:
- Host/plan and instance count:
- Physical device, OS and browser version, or explicit emulation designation:
- Fixture/mock, live-provider, or mixed run (describe boundaries):

## Reproduction and results

| Check | Command or user steps | Expected | Actual | Pass / fail / skipped / pending |
| --- | --- | --- | --- | --- |
| Install from fresh checkout | | | | |
| Typecheck / meaningful unit tests | | | | |
| Production build/start/health | | | | |
| Deterministic sample | | | | |
| Browser integration suite | | | | |
| Live Untappd search/details | | | | |
| Live controlled-menu OCR flow | | | | |
| Interactive Untappd authorization | | | | |
| Known personal/friends data | | | | |
| Physical camera and library input | | | | |
| Orientation and HEIC-origin images | | | | |
| Error/quota/retry behavior | | | | |
| Photo/list parity and accessibility | | | | |
| Secret/log/privacy review | | | | |
| Fresh source preservation / remote SHA | | | | |

## Real-menu evaluation (if applicable)

For each photo, record a non-sensitive ID, source permission/private location,
conditions, actual beer-line count, extracted usable lines, false positives,
correct candidate in top three, wrong brewery/vintage matches, manual recovery,
overlay association, latency and provider call count. Include denominators.

- Evaluation-set/version and held-out examples:
- Expected identities / ground-truth procedure:
- OCR feature used:
- Results and baseline comparison:
- Known unsupported examples:
- Numerical acceptance threshold, if agreed with owner:

## API and data semantics

- Current quota headers / observed request budget (no credential values):
- Check-in versus rating count verification:
- Personal history coverage and completeness:
- Friends-feed coverage and unrated handling:
- Sample versus live-data labeling:
- Restart/session behavior:

## Evidence and remaining work

- Sanitized logs/screenshots or private evidence references:
- Failures and linked issues:
- Limitations accepted by the owner (who/when):
- Untested or blocked capabilities and exact prerequisite:
- Last known-good commit and rollback procedure:
- Next action / owner action if needed:

## Handoff conclusion

State exactly which milestone is supported by the evidence. Do not infer physical
phone success from emulation, interactive sign-in from an OAuth redirect, API
readiness from variable presence, or current results from historical chat claims.
