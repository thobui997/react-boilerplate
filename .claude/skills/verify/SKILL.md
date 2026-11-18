---
name: verify
description: Prove a change to this repo works before committing or reporting it done. Runs the cheap gate (typecheck, lint, format, unit tests), the build, the Playwright e2e suite, and, for UI changes, drives the real app and looks at it. Use after any code change, before a commit or PR, or when asked to "verify", "check it works" or "run the checks".
---

# Verify

Verification means running the change, not reading it. Unit tests alone are not proof for
anything a user can see or click. Work through the steps in order: cheap checks first so
expensive ones never run on code that does not compile.

## 1. Cheap gate (always)

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
```

`npm run format` auto-fixes formatting; re-run the gate afterwards. Lint is ESLint then
Steiger (FSD layer rules): an import-direction error is a real design error, fix the
import, do not disable the rule.

## 2. Build (always before a commit)

```bash
npm run build
```

`tsc -b` also type-checks `e2e/` and `scripts/`.

## 3. E2E (when behaviour or UI changed, and before any commit touching `src/`)

```bash
npm run test:e2e
```

- Make sure nothing else listens on port 5173 first (`ss -ltn | grep 5173`): Playwright reuses an
  existing server, so a dev server from another checkout or worktree would be tested instead of
  your code and the result would mean nothing. Stop it, or run with `CI=1`.
- Needs no backend: the dev server starts itself and `e2e/support/mock-api.ts` mocks the API
  with `page.route`. First time on a machine: `npx playwright install chromium`.
- Specs: `auth` (guards, `?next=`, login errors, sign-out, theme), `change-password`
  (forced flow, policy, wrong password), `example-items` (permission redirect, list, create,
  delete dialog), `visual` (login and settings, light and dark).
- Failures leave `test-results/<test>/` with a trace and screenshot. Read the screenshot
  (`Read` on the PNG) and `error-context.md` before changing anything.
- Add or extend a spec when you change a user-visible flow. Locate by role and label using
  `messages` from `src/shared/i18n`, never by CSS class or test id. A new API call the app
  makes needs a branch in `mockApi`, otherwise it answers 404 `Chưa giả lập ...`.

### Visual baselines

`e2e/__screenshots__/` holds the expected images (Linux, Chromium). A visual failure means
the page changed:

- Unintended: fix the code.
- Intended: `npm run test:e2e -- --update-snapshots`, then `Read` the changed PNGs, and say in
  the report which screens changed and why. Never refresh baselines just to turn a red run green.

## 4. Drive the real app (UI changes)

Passing specs prove what the specs cover. For a changed screen, also look at it the way a QA
engineer would.

**With a real backend:** if `.env` sets `VITE_DEV_API_TARGET` to a backend that is actually running,
start `npm run dev` and drive the app with the in-app browser or the chrome-devtools MCP: sign in,
perform the new interaction, try the failure path, and read screenshots. Stop the dev server when done.

**Without one (the usual case):** the mocked API only exists inside Playwright, so use a throwaway spec:

1. Write `e2e/scratch.spec.ts` that calls `mockApi(page, { permissions: [...] })`, signs in with
   `signIn(page)`, performs the new interaction, and calls `page.screenshot({ path:
   'test-results/scratch-<name>.png', fullPage: true })` for each state (empty, filled, error,
   dark).
2. `npx playwright test e2e/scratch.spec.ts`, then `Read` each PNG and check layout, copy,
   focus and error states. Try the failure path, not only the happy path.
3. Delete `e2e/scratch.spec.ts`. If it caught a real bug, turn it into a permanent spec.

Skip this step when no rendered output changed.

## 5. Extra checks by what you touched

| You touched | Also run |
| --- | --- |
| Anything between `// <example-item>` markers, `example-items` code, `src/test/msw/example-items.ts`, `e2e/example-items*` | `npm run verify:example-removal` (slow: copies the repo, removes the sample, runs the whole gate and build there) |
| `STORAGE_PREFIX` | also edit `public/theme-init.js`; `storage-keys.test.ts` enforces it |
| CSP in `deploy/nginx.conf` | change `src/test/deploy-config.test.ts` together; both must pass |
| Guards or `landingPathFor` | `auth` and `change-password` e2e specs; every landing path must be reachable without missing permissions or the redirect loops |
| `AuthAdapter` contract or endpoints | update `signInAs`, `makeMeDto` and `e2e/support/mock-api.ts` (see `.claude/rules/auth-adapter.md`) |
| `src/shared/i18n/messages.vi.ts` | e2e locates elements by these strings; run e2e and refresh `visual` baselines if copy changed |

## Rules of the road

- **Checks are not yours to weaken.** Do not edit a test, a mock, a baseline, a lint rule or this
  skill in the same change to make it pass, unless the check itself is what the task is about.
  If you must, say so explicitly in the report.
- **Three rounds, then stop.** Run, diagnose, fix; after three failing rounds on the same check,
  stop and report what you tried, the failing output and your best hypothesis. Do not guess a
  fourth time.
- **Flaky tests are bugs.** Never skip a test, add `waitForTimeout` or sleeps, or raise retries
  to pass. Use web-first assertions (`await expect(locator)...`), which retry on their own. If
  you cannot find the root cause, delete the test and record why in the report.
- **Report evidence, not confidence.** End with: each command run and its result (counts, not
  "looks fine"), what you looked at in step 4, baselines you refreshed, and what you did not
  verify (for example: no real backend, only Chromium, only Linux baselines).
- **Verified commits only.** If a step could not be run (browser missing, port busy), the work is
  not verified: say "not verified" and why, do not claim success.
