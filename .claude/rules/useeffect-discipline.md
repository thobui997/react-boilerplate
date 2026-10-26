---
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
---

# useEffect Discipline

An Effect is an escape hatch for synchronizing with systems **outside React**.
Before writing `useEffect`, check it against React's *You Might Not Need an
Effect*. Most cases need no Effect at all. Today the only `useEffect` calls in
`src/` are inside named hooks in `src/shared/lib/hooks` (`useBeforeUnload`,
`useDebouncedCallback`); keep it that way.

## 1. Decision table

| Situation | Do this instead of an Effect |
|---|---|
| Compute data from props or state | Compute inline during render; `useMemo` only if measurably expensive |
| Respond to a user action | Put the logic in the event handler |
| Reset or adjust state when a prop changes | Give the component a `key`, adjust during render, or handle it in the handler that changes the driving value |
| Field A changes, so clear or derive field B | Do it in field A's `onChange` handler |
| Fetch or cache server data | TanStack Query (`useQuery(xQueries.list())`); route loaders only for the session guard |
| Notify a parent after state changes | Call the parent callback in the same event handler |
| Share state between components | Lift state up, or use context, a store or the query cache |
| Subscribe to an external store | `useSyncExternalStore` (`useOnlineStatus`, `useMediaQuery`, `useTheme`) |
| Initialize app-wide logic once | Module scope or `src/main.tsx` (`wireSessionEvents`, `setNotifier`) |

## 2. When an Effect is correct

Use an Effect only to synchronize with something outside React:

- DOM or browser APIs (focus, scroll, `IntersectionObserver`)
- timers and intervals (`useDebouncedCallback`)
- event listeners on `window` (`useBeforeUnload`); prefer
  `useSyncExternalStore` when the listener feeds a value into render
- third-party imperative instances (maps, charts, players)
- imperative methods of form libraries (e.g. `reset()` in react-hook-form)
- analytics that must fire because the component was **displayed**, not because
  of a user action

## 3. Rules for every Effect

1. **One purpose per Effect.** Split unrelated synchronizations.
2. **Complete dependency array.** `react-hooks/exhaustive-deps` is `error` in
   `eslint.config.js`. Do not suppress it; restructure the code instead.
3. **Always clean up** subscriptions, timers, listeners and in-flight requests
   by returning a cleanup function. The Effect must survive mount, unmount and
   remount (Strict Mode runs it twice in development).
4. **No state-chain Effects.** Do not write an Effect whose only job is to set
   state that triggers another Effect. Compute in one place.
5. **No mirrored props.** Do not copy a prop into state with an Effect.
6. **No "run once" refs as a workaround.** `initRef` / `hasRunRef` guards signal
   a missing key, handler or shared hook.
7. **Wrap it in a named hook** in `src/shared/lib/hooks` (or the slice's
   `model/` if only that slice uses it). The hook's name documents the intent;
   keep raw Effects out of `.tsx` bodies.

## 3.1 Anti-patterns

```tsx
// Avoid: derived data in an Effect
const [fullName, setFullName] = useState('')
useEffect(() => setFullName(`${first} ${last}`), [first, last])

// Prefer
const fullName = `${first} ${last}`
```

```tsx
// Avoid: reacting to a field with watch + Effect
const mode = useWatch({ control, name: 'mode' })
useEffect(() => {
  setValue('targets', [])
}, [mode, setValue])

// Prefer: do it where the change happens
const modeField = register('mode')
<select {...modeField} onChange={(event) => { void modeField.onChange(event); setValue('targets', []) }} />
```

```tsx
// Avoid: resetting state when a prop changes
useEffect(() => setDraft(initialDraft), [initialDraft])

// Prefer: reset by identity (as example-items-page.tsx does for its form)
<ExampleItemForm key={item?.id ?? 'create'} item={item} onClose={close} />
```

## 4. Canonical patterns

### 4.1 Reset a form when its source record changes

1. **Preferred: remount instead of reset.** Mount the form only while it is
   shown and give it a `key` tied to the record, so defaults come from
   `defaultValues` on each mount (`src/pages/example-items/ui/example-items-page.tsx`).
2. **Fallback:** if data arrives after mount, prefer react-hook-form's
   declarative `values` option. Only if that cannot work, call `reset()` from one
   reusable named hook, never a hand-inlined Effect with an `initRef` guard.

### 4.2 Set a default once async data loads

Derive the default during render instead of storing it:

```tsx
const [selected, setSelected] = useState<string | undefined>()
const value = selected ?? options[0]?.value // derived default, no Effect
```

### 4.3 Server state

Use TanStack Query through the slice's query factory. Never
`useEffect` + `fetch` + `useState`.

### 4.4 Reuse and extraction

- Reuse the existing hooks first: `useOnlineStatus`, `useMediaQuery`,
  `useBeforeUnload`, `useLeaveConfirm` (in-app navigation via `useBlocker` +
  tab close), `useDebouncedCallback` (`flush`, `cancel`, `flushOnUnmount`), and
  `useTheme` / `setTheme` (`@/shared/lib/theme`).
- If the same Effect appears a second time and no hook exists, extract one named
  hook into `src/shared/lib/hooks`, export it from its `index.ts`, add a test
  next to it, and reuse it from then on.
- Session events (expired, remote sign-out, password change required) are
  handled once in `src/app/router/wire-session-events.ts`, not in components.

## 5. Rules for AI agents

1. Before adding `useEffect`, state in one sentence what **external system** it
   synchronizes with. If you cannot name one, do not use an Effect.
2. Walk the decision table in section 1 first.
3. When you find an existing anti-pattern Effect in code you are editing, refactor
   it only if it is in scope. Otherwise, mention it.
4. Do not silence `react-hooks/exhaustive-deps` and do not add a ref guard to
   dodge the dependency array. Use the canonical patterns in section 4.
5. Always include cleanup for subscriptions, timers and listeners.

## 6. Review checklist

- [ ] The Effect synchronizes with an external system (named in the code or hook)
- [ ] No derived data, event logic, prop-reset or field-chain logic inside Effects
- [ ] Dependency array complete; the lint rule is not disabled
- [ ] Cleanup returned; safe under Strict Mode double invocation
- [ ] An existing hook or a canonical pattern from section 4 is used instead of a new ad hoc Effect
