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
  - `.claude/rules/` - Path-scoped rules, auto-loaded only when editing files matching each rule's `paths:` header
  - `.claude/skills/verify/` - The `verify` skill: how to prove a change works (gate, e2e, drive the real app)
  - `.claude/skills/verify-design/` - The `verify-design` skill: compare a built screen with its design (pixel diff, measured styles, token check); `e2e/support/design-compare.ts` is its helper
  - `docs/` - Code conventions, ADRs (`docs/decisions/`), example-feature removal guide
  - `deploy/`, `Dockerfile`, `.github/workflows/` - nginx config (with CSP), image build, CI and image publishing
  - `scripts/` - `remove-example.mjs` and `verify-example-removal.mjs`

## Commands (HOW)

- **Build:** `npm run build` (`tsc -b && vite build`)
- **Dev Server:** `npm run dev` (proxies `/api` to `VITE_DEV_API_TARGET`; copy `.env.example` to `.env` first)
- **Test (Single):** `npx vitest run <path/to/file.test.ts>` or `npx vitest run -t "<test name>"` (all tests: `npm test`; property tests are `*.property.test.ts` using `@fast-check/vitest`, e.g. `npx vitest run safe-redirect.property`)
- **E2E:** `npm run test:e2e` (starts `npm run dev`, no backend needed; first time `npx playwright install chromium`; intentional UI change: `npm run test:e2e -- --update-snapshots` and review the image diff)
- **Lint & Format:** `npm run typecheck && npm run lint && npm run format:check` (Always run before completing tasks; `npm run format` auto-fixes; lint runs ESLint then Steiger)

## Engineering & Workflow Rules

- **Plan First:** For complex tasks or multi-file changes, always inspect related code and outline a plan before writing code.
- **Verification:** Never mark a task as complete without running tests or builds to verify correctness. Full gate: `npm run typecheck && npm run lint && npm run format:check && npm test`. Run the `verify` skill (`.claude/skills/verify/SKILL.md`) before committing; it adds the build and e2e and tells you which extra checks a given change needs.
- **Design Links:** When given a design link, look at it rendered (screenshot via Claude in Chrome) before writing UI code; `Artifact read` returns source and does not count as seeing it. If it cannot be opened, stop and ask the user; never build from the source alone. Follow `.claude/skills/verify-design/SKILL.md`.
- **Minimal Changes:** Modify only code directly relevant to the request while respecting the existing architecture.
- **Git Conventions:** Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.). Never commit directly to `develop` / `main`; work on a separate branch named `<type>/<slug>`, where `<type>` matches the commit type (`feature`, `fix`, `refactor`, `docs`, `chore`, ...), e.g. `fix/login-redirect`. For work from a plan, use one branch per plan task and put the task number in the slug (`feature/task-03-<slug>`). Merging to `main` or tagging requires asking the user first.
- **Keep CLAUDE.md Lean:** Keep this file short and clean. Never add progress, task status, changelogs, session notes, or one-off details on your own; only add durable, project-wide rules or commands, and only when asked. Put deep-dive detail in `docs/` or `.claude/rules/` and link it from here.
- **Architecture (FSD):**
  - Layers `app → pages → features → entities → shared`; imports go one way only, never across slices of the same layer. There is no `widgets` layer (layouts live in `src/app/layouts`, menu in `src/app/navigation`).
  - Pages First: keep code in the page until a second consumer exists, then extract `entities/<noun>` or `features/<verb>-<noun>`.
  - Each slice has `api/`, `model/`, `ui/` and is exposed only via `index.ts`; import from outside through the `@/` alias.
  - `shared/api` must not import `app`: it emits events and `src/app/router/wire-session-events.ts` handles navigation.
- **Routing & Access:**
  - Guards are loaders (`src/app/router/loaders.ts`), checked in order: session → password change → permissions. Loaders never fetch page data.
  - Every destination of `landingPathFor` must be reachable without permissions the user lacks, or redirects will loop.
  - Declare `Roles`/`Permissions` in `src/shared/lib/access/access.config.ts`; check with `can`/`canAny`/`hasRole`.
- **UI & i18n:**
  - All UI strings live in `src/shared/i18n/messages.vi.ts`; import `messages` from `@/shared/i18n`.
  - UI uses shadcn/ui on Base UI in `src/shared/ui` (import `@/shared/ui/<name>`). Add components with `npx shadcn@latest add`; never run `shadcn init`.
  - Keep semantic HTML and a11y (`role="alert"`, `aria-invalid`, `aria-describedby`); toasts go through `notify`; destructive confirmations use `AlertDialog`; dark mode follows `data-theme`.
- **Language:** Project docs are in Vietnamese; identifiers in code are in English.
- **Template Maintenance:**
  - `src/test/no-domain-traces.test.ts` guards against leftover domain keywords from the source project (it scans `.claude/` and this file); projects created from the template may delete it.
  - Do not edit `.superpowers/`.
  - If you change `STORAGE_PREFIX`, also update `public/theme-init.js` (`src/shared/config/storage-keys.test.ts` enforces this).
  - The CSP in `deploy/nginx.conf` is enforced by `src/test/deploy-config.test.ts`: change both together.
  - Example feature code is wrapped in `// <example-item>` markers; see `docs/removing-example-item.md` and run `npm run verify:example-removal` after touching them.

## Progressive Disclosure (Deep-dive documentation - Read on demand)

Instead of cluttering this file, read these specific files when working on corresponding modules:

- Setup, env vars, backend swap, adding UI, deployment: `README.md`
- Code conventions (same content as the rules below): `docs/code-conventions.md`
- Architecture decisions (FSD, auth contract and token storage, data router, shadcn/Base UI): `docs/decisions/`
- Removing the example feature and marker conventions: `docs/removing-example-item.md`
- Path-scoped rules in `.claude/rules/` (auto-loaded on matching files):
  - `component-decomposition.md`, `react-clean-code.md`, `react-component-design.md` - 300-line limit, naming, small functions, props, composition
  - `react-forms.md`, `react-query-layering.md`, `useeffect-discipline.md` - react-hook-form + zod, dto/mapper/request/query layers, `useEffect` usage
  - `auth-adapter.md` - auth mechanism and the `AuthAdapter` contract (`shared/api`, session, sign-out, change-password)
  - `example-item-markers.md` - `// <example-item>` markers
