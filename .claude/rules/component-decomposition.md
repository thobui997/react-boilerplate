---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Component Size & Decomposition

Keep every component and hook file under **300 lines**. ESLint enforces it with
`max-lines` set to `error` on all `.ts`/`.tsx` files (`eslint.config.js`), not
only pages. Features, entities, `app` and shared code count too.

Split by **responsibility**, never by arbitrary line cuts. A file that is long
but has one responsibility is a smell to inspect, not an automatic split.

## 1. Choose the pattern by the symptom

| Symptom | Pattern | Result |
|---|---|---|
| Fetching, form setup, submit logic mixed with JSX | **Custom hook extraction** | One hook per concern |
| One big JSX tree with distinct regions | **Presentational sections** (container/presentational) | `<noun>-section.tsx` pieces |
| Many boolean/label props configuring child UI | **Composition (children/slots)** | Caller composes the parts |
| Interdependent parts sharing state (Dialog, Tabs, Select) | **Compound components** | Parts share context, not props |
| Same markup repeated with small variations | **Reusable field/wrapper component** | `<noun>-field.tsx` or a small local component |
| Same behavior needed under different UIs | **Headless hook** | Logic in a hook, UI stays separate |
| Prop passes through 3+ levels | **Context or state colocation** | Move state next to its user |
| Branches switching between several variants | **Variant components / lookup map** | No giant `if`/`switch` in JSX |

## 2. Core patterns

### 2.1 Custom hook extraction

Give each concern its own hook, named `use-<verb>-<noun>.ts`, in the slice's
`model/`. Examples in this repo: `use-login-submit.ts`,
`use-change-password-submit.ts`, `use-sign-out.ts`.

A hook returns plain values and callbacks. It does not render JSX. Do not
create a wrapper hook around a single `useQuery`/`useState` call unless it
adds composition, derived state or side effects (see `react-query-layering.md`
for the one accepted exception, `useCurrentUser`).

### 2.2 Container + presentational sections

The main component only wires hooks to sections. Sections are presentational:
they receive data and callbacks and hold no business logic. The login page is
the reference (`src/pages/login/ui/`):

```tsx
// ui/login-page.tsx  (container: wiring only)
export function LoginPage() {
  const { submit, isPending, error } = useLoginSubmit()
  return (
    <main>
      {error && <p role="alert">{error.message}</p>}
      <LoginFormSection onSubmit={submit} isPending={isPending} />
    </main>
  )
}
```

Name sections `<noun>-section.tsx` and keep them in the same slice's `ui/`
(`src/pages/settings/ui/` has `account-section.tsx`, `profile-section.tsx`, …).

### 2.3 Composition over configuration

If a component grows boolean and label props (`showX`, `xText`, `onXClick`),
expose slots or `children` instead. Combine with compound components when
parts need shared state.

### 2.4 Headless hook

When the logic is reusable but the markup varies, put the logic in a hook that
returns state and callbacks. Each UI renders it its own way
(`useLeaveConfirm` returns `blocked`/`confirm`/`cancel` and renders nothing).

### 2.5 State colocation

Keep state in the lowest component that needs it. Lift it only when siblings
share it. Use context only for state needed across many levels.

## 3. Placement and promotion

- **Start in the owning slice.** Hooks go in its `model/`, JSX sections in its
  `ui/`. Same layout for pages and features. There is no `widgets` layer: the
  app shell lives in `src/app/layouts`, the menu in `src/app/navigation`.
- **Promote late (Pages First).** A hook or component that touches entity data
  or business logic moves out of its slice only when a second consumer
  genuinely needs it. A write follows the same rule: it stays in the page until
  a second page or `app` needs it (see `react-query-layering.md`).
- **Exception: pure presentational wrappers.** Once the project adds a UI kit,
  a wrapper that only composes its primitives and takes generic props (no
  entity types, no business logic) may go straight into `shared/`. Being wrong
  costs one file move later.

## 4. Naming

| Kind | Pattern |
|---|---|
| Hook | `use-<verb>-<noun>.ts` |
| Page/section JSX | `<noun>-page.tsx`, `<noun>-section.tsx`, `<noun>-form.tsx` |
| Reusable field wrapper | `<noun>-field.tsx` |

## 5. Rules for AI agents

1. Before adding to a file near the limit, split first by the table in section 1.
2. Never add a `max-lines` violation. Run `npm run lint` instead of guessing.
3. Split by pattern and responsibility. Do not move code into a file merely to
   reduce line count.
4. When refactoring, keep behavior identical and run lint and tests afterward.

## 6. Project bindings

- Lint command: `npm run lint` (ESLint + Steiger) · config: `eslint.config.js`
- Slice layout: `api/`, `model/` (hooks, schemas, domain types), `ui/`, `index.ts`
- Reference examples: `src/pages/login/` (submit hook + section + page),
  `src/features/change-password/` (schema, policy, submit hook, form)
- Data-layer rule: `.claude/rules/react-query-layering.md`

## 7. Checklist

- [ ] File under 300 lines, `npm run lint` clean
- [ ] Each hook has one concern; the container only wires
- [ ] Sections are presentational and carry no business logic
- [ ] Composition used instead of boolean/label prop sprawl
- [ ] Nothing promoted to `shared/` or `features/` without a second consumer, except pure presentational wrappers
