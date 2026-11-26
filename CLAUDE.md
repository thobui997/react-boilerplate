# React Boilerplate

## Project Overview (WHAT & WHY)

- **Purpose:** TODO: replace this line with one or two sentences on what this app does and for whom.
- **Tech Stack:** Vite, React 19, TypeScript (strict), React Router 7 (data router), TanStack Query, axios, react-hook-form + zod, Tailwind 4, shadcn/ui on Base UI, Vitest + jsdom + MSW + Testing Library, fast-check (property tests), Playwright (e2e), ESLint, Prettier, Steiger (FSD lint), Docker + nginx. Node `>=22.13`.
- **Repo Map:**
  - `src/app/` - Composition root: providers, router (routes, guard loaders, session-event wiring), layouts, navigation, styles
  - `src/pages/` - Route-level screens (login, change-password, settings, not-found, example-items)
  - `src/features/` - User actions (sign-out, change-password, toggle-theme)
  - `src/entities/` - Domain models (session, example-item)
  - `src/shared/` - `api` (HTTP client, `AuthAdapter`), `config`, `i18n`, `lib` (access, notify, hooks), `ui` (shadcn/ui)
  - `src/test/` - Test setup, `renderRoute`, MSW handlers, fixtures
  - `e2e/` - Playwright specs (API mocked with `page.route` in `e2e/support/mock-api.ts`, visual baselines in `e2e/__screenshots__/`)
  - `.claude/` - `rules/` (path-scoped, auto-loaded when you edit matching files), `skills/` (`verify`, `verify-design`), `hooks/guard-git.sh` (git guard, wired in `settings.json`)
  - `docs/` - Code conventions, ADRs (`docs/decisions/`), example-feature removal guide
  - `deploy/`, `Dockerfile`, `.github/workflows/` - nginx config (with CSP), image build, CI and image publishing
  - `scripts/` - `remove-example.mjs` and `verify-example-removal.mjs`

## Commands (HOW)

- **Build:** `npm run build` (`tsc -b && vite build`)
- **Dev Server:** `npm run dev` (proxies `/api` to `VITE_DEV_API_TARGET`; copy `.env.example` to `.env` first)
- **Test (Single):** `npx vitest run <path/to/file.test.ts>` or `npx vitest run -t "<test name>"` (all tests: `npm test`; property tests are `*.property.test.ts` using `@fast-check/vitest`, e.g. `npx vitest run safe-redirect.property`)
- **E2E:** `npm run test:e2e` (starts `npm run dev`, no backend needed; first time `npx playwright install chromium`; intentional UI change: `npm run test:e2e -- --update-snapshots` and review the image diff)
- **Gate:** `npm run typecheck && npm run lint && npm run format:check && npm test` (`npm run format` auto-fixes; lint runs ESLint then Steiger)

## Engineering & Workflow Rules

- **Verification:** Never mark a task complete before the Gate passes. Before committing, run the `verify` skill (`.claude/skills/verify/SKILL.md`): it adds the build and e2e and lists extra checks per kind of change.
- **Design Links:** Given a design link, view it rendered (screenshot via Claude in Chrome) before writing UI code; `Artifact read` returns source and does not count. If it cannot be opened, stop and ask the user. Steps: `.claude/skills/verify-design/SKILL.md`.
- **Minimal Changes:** Touch only the files the request needs: no renames, moves or reformatting elsewhere, and keep the existing slice layout (below).
- **Git:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Work on `<type>/<slug>` branches, e.g. `fix/login-redirect`; for plan work one branch per task with the number in the slug (`feature/task-03-<slug>`). `.claude/hooks/guard-git.sh` blocks commits and pushes on `main`/`develop` and asks before tags and `gh pr merge` (local `git merge` is not gated).
- **CLAUDE.md:** Add only durable, project-wide rules or commands, and only when asked; never progress, task status, changelogs or session notes. Rules for one area go in `.claude/rules/` with `paths:`; multi-step workflows go in `.claude/skills/`.
- **Architecture (FSD):**
  - Layers `app → pages → features → entities → shared`; imports go one way only, never across slices of the same layer. There is no `widgets` layer (layouts live in `src/app/layouts`, menu in `src/app/navigation`).
  - Pages First: keep code in the page until a second consumer exists, then extract `entities/<noun>` or `features/<verb>-<noun>`.
  - Each slice has `api/`, `model/`, `ui/` and is exposed only via `index.ts`; import from outside through the `@/` alias.
  - `shared/api` must not import `app`: it emits events and `src/app/router/wire-session-events.ts` handles navigation.
- **UI & i18n:**
  - All UI strings live in `src/shared/i18n/messages.vi.ts`; import `messages` from `@/shared/i18n`.
  - UI is shadcn/ui on Base UI in `src/shared/ui` (import `@/shared/ui/<name>`); add components with `npx shadcn@latest add <name>`.
  - Toasts go through `notify`; destructive confirmations use `AlertDialog`; dark mode follows `data-theme`.
- **Language:** Commit messages, PR text and identifiers in English; `README.md`, `docs/` and UI strings in Vietnamese.
- **Template:** `src/test/no-domain-traces.test.ts` fails on leftover domain keywords from the source project, and it scans `.claude/` and this file too; projects created from the template may delete it.

## Progressive Disclosure (Deep-dive documentation - Read on demand)

- Setup, env vars, backend swap, adding UI, deployment: `README.md`
- Code conventions for humans (mirrors `.claude/rules/`; the rules are authoritative): `docs/code-conventions.md`
- Architecture decisions (FSD, auth contract and token storage, data router, shadcn/Base UI): `docs/decisions/`
- Removing the example feature and `// <example-item>` markers: `docs/removing-example-item.md`
