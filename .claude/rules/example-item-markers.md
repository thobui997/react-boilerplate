---
paths:
  - "src/**"
  - "e2e/**"
  - "steiger.config.ts"
  - "scripts/**"
---

# `example-item` markers

`example-item` is the sample CRUD feature (`/example-items`). It must stay
removable by a script, so every trace of it outside its own folders is fenced.

## Where it lives

Owned paths, deleted whole by the removal script:

- `src/entities/example-item/`
- `src/pages/example-items/`
- `src/test/msw/example-items.ts`

## Marker rule

Every line in a shared file that exists only for the sample goes between two
marker lines:

```ts
// <example-item>
import { Permissions } from '@/shared/lib/access'
// </example-item>
```

This covers: imports used only by the sample, the route in
`src/app/router/routes.tsx`, the nav item in `src/app/navigation/nav-items.ts`,
`Permissions.ItemRead`/`ItemWrite` in `src/shared/lib/access/access.config.ts`,
`ROUTES.ExampleItems`, `messages.exampleItems`, the landing rule in
`src/entities/session/model/landing-path.ts`, the MSW handler wiring, test cases,
e2e steps (`e2e/`), and the Steiger exception in `steiger.config.ts`.

Exact rules enforced by `scripts/remove-example.mjs`:

- A marker is a `//` line comment alone on its line (any indentation):
  `// <example-item>` opens, `// </example-item>` closes. Any other line that
  contains `<example-item>` or `</example-item>` (trailing comment, JSX
  `{/* … */}`, block comment) is an error.
- Blocks never nest; every opening marker has exactly one closing marker.
- The script removes both marker lines and everything between them, then runs
  Prettier on the edited files, so leftover empty `{}`/`[]` are fine.
- Only `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` files under `src/` and `e2e/`
  (skipping `node_modules`, `dist`) plus `steiger.config.ts` are scanned. Markers
  anywhere else (docs, config) are not processed.
- The script validates every file before writing anything: a malformed marker
  aborts with `file:line` and changes nothing.
- Code that cannot be fenced with whole `//` lines (e.g. inside JSX children)
  must be restructured so the sample part sits in plain TS lines (an array entry,
  a separate statement).

## After editing

- After touching sample code or any fenced block, run
  `npm run verify:example-removal` (alias for `node scripts/verify-example-removal.mjs`).
  It copies the tree to a temp dir, runs the removal, checks no reference to
  `example-item`/`ExampleItem` remains in `src/`, `e2e/`, `steiger.config.ts`,
  then runs `typecheck`, `lint`, `format:check`, `npm test` and `build` there.
- Outside a marker block, never import from `@/pages/example-items` or
  `@/entities/example-item`.

## Removing the sample (projects created from the template)

Run `node scripts/remove-example.mjs`, then
`npm run typecheck && npm run lint && npm test && npm run build`. Manual
follow-ups (docs, `Permissions`, landing rules, this rule file) are listed in
`docs/removing-example-item.md`.
