---
name: pre-commit-checks
description: Run this project's full verification suite (lint, format check, unit tests with coverage thresholds, production build, Playwright end-to-end tests) and report the result. Use it whenever a task is finished and before any commit in this repository, when the user asks to "verify", "check everything", "run the checks", "is it ready to commit", or invokes /pre-commit-checks. It does not commit or push — committing stays a separate, explicit request.
---

# Pre-commit checks

Replays locally what the CI (`.github/workflows/ci.yml`) runs, so a commit never reaches `main`
with a red pipeline. Run it once a task is finished, before committing.

## Steps

1. **Run the five checks, in this order, from the repository root.** Each one is a separate
   command so the failing step is unambiguous; stop at the first failure.

   ```bash
   npm run lint
   npm run format:check
   npm run test:coverage
   npm run build
   npm run test:e2e
   ```

   The order goes from fastest to slowest: a lint error is reported in seconds rather than
   after the browser tests.

2. **On a failure, fix the cause, then start again from step 1** — a fix can break an earlier
   check. What each failure means here:

   - `lint`: fix the code. Never add an `eslint-disable` without a comment justifying it.
   - `format:check`: run `npm run format`, then check the diff it produced.
   - `test:coverage`: either a failing test, or coverage under the thresholds of
     `vite.config.ts` (global ones, and 100% on `layout.ts`, `time.ts`, `eventChanges.ts`).
     Add the missing tests; do not lower a threshold or exclude a file to get green.
   - `build`: `tsc -b` type errors come first, then the Vite build.
   - `test:e2e`: Playwright starts `npm run dev:mock` on port 5174 by itself. If Chromium is
     missing, run `npx playwright install chromium` once, then retry.

   Never weaken a check to make it pass (skipping a test, loosening an assertion, deleting a
   failing case). If a failure looks unrelated to the task or cannot be fixed, stop and report
   it instead.

3. **Report the outcome**: one line per check (passed / failed), the number of unit and
   end-to-end tests, the coverage percentages, and, for a failure, the relevant output. Say
   plainly if a check was not run.

4. **Do not commit.** A green run means the work is ready to be committed, not that it should
   be: wait for the user's explicit request, as `CLAUDE.md` requires.
