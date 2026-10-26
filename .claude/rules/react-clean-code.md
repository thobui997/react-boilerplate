---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Clean Code for React

Robert C. Martin's core clean code principles, applied to React and TypeScript.
Code is read far more often than it is written: optimize for the next reader.
When principles conflict, choose the option that is simplest to read and change.

## 1. Meaningful names

- Name things by intent. A reader should not need a comment to know what a
  variable, hook or component is for.
- Components are nouns in PascalCase (`ExampleItemForm`). Hooks are verb phrases
  (`useLoginSubmit`). Event handlers are `handle<Event>` inside a component
  and `on<Event>` as props.
- Booleans read as questions: `isPending`, `canWrite`, `hasSession`. Do not use
  negated names (`isNotVisible`).
- No abbreviations, no type encoding (`strName`, `IProps`), and no noise words
  (`data`, `info`, `manager`, `handler` alone).
- Use one word per concept across the codebase (`list`, not `list`/`get`/`load`
  for the same idea).
- Replace magic numbers and strings with named constants (`ROUTES`,
  `STORAGE_KEYS`, `HttpStatus`, `ApiErrorCode`, `Permissions`). Fixed value sets
  are `as const` objects plus a `ValueOf` type (`src/shared/lib/const-enum`).
- UI strings live in `src/shared/i18n/messages.vi.ts`, never inline in JSX.

## 2. Functions and components

- **Small.** A function or component fits on one screen. See
  `component-decomposition.md` for the 300-line file limit.
- **Do one thing** at one level of abstraction. A component either composes
  other components or renders markup, not both at length. Do not mix
  data fetching, business rules and JSX in one body.
- **Few arguments.** A component's props are its arguments. Aim for 3 or fewer;
  group related values into an object (see `react-component-design.md`).
- **No flag arguments.** A boolean prop that switches behavior means two
  components. Split them or use composition.
- **No hidden side effects.** A function does what its name says and nothing else.
  Render must be pure: no mutation, no network, no timers during render.
- **Command-query separation.** A function either changes state or returns data,
  not both.
- Prefer early returns over nested conditionals. Extract complex conditions
  into a named variable or function (`const canSubmit = ...`).
- Keep `useEffect` for synchronizing with external systems only. Derive values
  during render; do not mirror props into state (see `useeffect-discipline.md`).

## 3. Comments

- Good code explains itself. Rename or extract before commenting.
- Comment **why**, never **what**: business constraints, backend quirks, non-obvious
  trade-offs, intentional rule exceptions.
- Delete commented-out code and noise comments (`// set state`). Version control
  keeps history. (The disabled config samples in `eslint.config.js` are an
  intentional, labelled exception.)
- Every `TODO` includes an owner or ticket.

## 4. Formatting

- Rely on Prettier and ESLint (`npm run format`, `npm run lint`). Do not
  hand-format or debate style in reviews.
- Order inside a file so it reads top-down like a newspaper: public component first,
  helpers after. Keep related code vertically close.
- Inside a component: hooks first, then derived values, then handlers, then JSX.
- One component per file unless the others are tiny, private helpers (like
  `PasswordField` in `change-password-form.tsx`).

## 5. Objects, data and boundaries

- **Hide structure.** Expose a small public API (`index.ts`); keep internals private.
  Import other slices through `@/<layer>/<slice>`; use relative paths inside a slice.
- **Law of Demeter.** Do not reach through nested objects across layers. Pass
  what the child needs, or add a mapper or selector.
- **Data at the edge.** Convert external shapes (API responses, URL params,
  storage) to domain types at the boundary (`api/mappers.ts`), then use domain
  types inside.
- Wrap third-party libraries behind a thin adapter so replacing one touches one
  file: axios sits behind `src/shared/api`, toasts behind `notify`
  (`src/shared/lib/notify`).
- Prefer immutable updates. Never mutate props, state or cached query data.

## 6. Error handling

- Use exceptions or typed error results, not magic return values (`null`, `-1`).
  HTTP errors arrive as `ApiError`; a submit hook may return an outcome union
  (`ChangePasswordOutcome`).
- Handle errors where you can act on them. Display them in the UI layer; do not
  swallow them in `catch {}` without a comment saying why.
- Use error boundaries for render failures (`RouteErrorBoundary`) and explicit
  loading, empty and error states for async data.
- Do not pass `null` around as a control signal; model absence with explicit types.
- Fail fast on impossible states. Exhaustive `switch` with `never` checks on unions.

## 7. SOLID in React

| Principle | In React |
|---|---|
| **S**ingle Responsibility | One reason to change per component or hook. Split UI, state logic and data access. |
| **O**pen/Closed | Extend through composition, `children`, slots and props, not by editing a component for every new variant. |
| **L**iskov Substitution | A component accepting native input props must still behave like that element. Forward native attributes. Do not break the contract. |
| **I**nterface Segregation | Pass only the props a component uses. Do not hand it a whole `user` object for one field. |
| **D**ependency Inversion | Depend on abstractions: inject services and callbacks through props, context, hooks or ports (`AuthAdapter`, `setNotifier`), not hard-coded imports in UI components. |

## 8. DRY, KISS, YAGNI

- **DRY.** Remove duplicated *knowledge* (rules, mappings, constants), not just
  duplicated lines. Wait for the third occurrence before abstracting. A wrong
  abstraction costs more than duplication.
- **KISS.** Choose the simplest design that works. No custom hook, context or
  pattern without a concrete need.
- **YAGNI.** Do not build for hypothetical requirements. No unused props, options
  or generic abstractions.
- Delete dead code and unused exports.

## 9. Tests

- Tests are first-class code; keep them as clean as production code. Put them
  next to the code (`*.test.ts[x]`); shared test infrastructure lives in `src/test/`.
- **F.I.R.S.T.**: Fast, Independent, Repeatable, Self-validating, Timely.
- Test behavior the user sees (roles, text, interactions), not implementation
  details. Mock the API with MSW (`src/test/msw`) and render pages with
  `renderRoute` (`src/test/render.tsx`).
- One concept per test. Name tests by behavior.
- Pure logic (mappers, policies, rules) gets unit tests. Prefer extracting logic
  over mocking heavily.

## 10. Boy Scout Rule and refactoring

- Leave the code cleaner than you found it, in small, safe steps tied to the
  task at hand.
- Refactor with passing tests and no behavior change, and keep refactor commits
  separate from feature commits.
- Do not rewrite unrelated code in the same change.

## 11. Rules for AI agents

1. Before writing code, name the responsibility of each function or component in
   one sentence. If it needs "and", split it.
2. Match the surrounding code's naming, structure and patterns before introducing new ones.
3. Do not add abstractions, props, options or comments that the task does not require.
4. When modifying code, apply the Boy Scout Rule only to the code you touch.
5. After editing, run `npm run typecheck && npm run lint && npm run format:check && npm test`
   and report any failure.

## 12. Review checklist

- [ ] Names reveal intent; no magic values; UI strings in `messages.vi.ts`
- [ ] Each function and component does one thing at one abstraction level
- [ ] Render is pure; effects are used only for external synchronization
- [ ] No flag props, no needless mirrored state, no prop sprawl
- [ ] Comments explain why; no dead or commented-out code
- [ ] Errors, loading and empty states are handled explicitly
- [ ] No duplicated knowledge; no speculative abstraction
- [ ] Behavior is covered by tests that read clearly
