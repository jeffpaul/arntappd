## Goal and current evidence

The current checkout and remote `main` contain only the original `.gitkeep` before this backlog was added. The earlier implementation described in the project conversation was not restored into this workspace. Local Git object/reflog checks found no recoverable application commit. The uploaded `arntappd.zip` was also inspected: it contains `.gitkeep` and Git metadata for the same initial commit (`b1d919f2abc7ef1bb44c192184944402cbc1fcf5`), with no application source or tests. Archive hooks/configuration were not executed or imported. This is the first blocker: there is currently no runnable app to deploy.

Recover the earlier environment snapshot or another copy, preserve its contents, and commit the app, lockfile, sample assets, and tests. If recovery is impossible, explicitly scope a replacement implementation; do not represent a reconstruction as the previously tested code.

## Acceptance criteria

- [ ] Application source, dependency manifest/lockfile, sample menu, and tests are committed to GitHub; credentials and generated artifacts are excluded.
- [ ] A fresh checkout installs with the declared Node version, passes its meaningful tests/typecheck, builds, and serves the sample experience.
- [ ] Current verification results are recorded separately from historical results reported in chat.

## Tracking

Backlog ID: `MVP-01`. Phase: MVP.
