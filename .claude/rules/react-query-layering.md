---
paths:
  - "src/**/*"
---

# React Query Layering (FSD + TanStack Query)

Feature-Sliced Design with TanStack Query, following the **Pages First** rule:
code starts in the page that uses it and is promoted only when a second
consumer appears. Layers: `app → pages → features → entities → shared`; there
is no `widgets` layer.

Reference slices: `src/entities/example-item/` (dto → mapper → request → query
factory) and `src/pages/example-items/` (mutations, form, table).

## 1. Core principles

1. **The slice that owns the data owns its reads, query factory and cache keys.**
   An API endpoint alone does not justify a new entity.
2. **Entities are read-only for the cache.** No `useMutation`, no invalidation in
   `entities/`. An entity may export plain write *request functions*
   (`createExampleItem`, `updateExampleItem`, `deleteExampleItem`); the mutation
   hook that calls them lives with the consumer.
3. **The cache holds domain data, never wire (DTO) data.** Mapping happens in `requests.ts`.
4. **`api/` has no UI.** No `notify`, navigation, `window.confirm` or permission
   check in `requests.ts`/`queries.ts`.
5. **Promote late.** Move code up a layer only when a second consumer needs it.

| Data scope | Location |
|---|---|
| Reused across pages/features | `entities/<noun>/api/` |
| Used by one page only | `pages/<page>/api/` |
| A write used by two pages (or a page and `app`) | `features/<verb>-<noun>/api/` |

Deliberate exceptions:

- `entities/example-item` has a single consumer; it is split out on purpose to
  show the full chain, and `steiger.config.ts` turns `fsd/insignificant-slice`
  off for it. Do not copy that for real slices.
- `entities/session` exports `signInAndLoadUser`, a plain async function (not a
  hook) shared by `pages/login` and `features/change-password`. Each consumer
  wraps it in its own `useMutation` (`useSignInMutation`, `useReloginMutation`).
- `useCurrentUser` (`entities/session/model/use-current-user.ts`) wraps one
  `useQuery` because every consumer needs only `.data`. Do not add more wrappers
  like it.

## 2. `api/` segment layout

```text
<slice>/
  api/
    dto.ts        # wire types exactly as the backend sends/receives; never exported via index.ts
    mappers.ts    # fromXDto / toXDto. Pure, unit-tested (mappers.test.ts)
    requests.ts   # plain HTTP via `http`: domain input in, domain output out (calls mappers)
    queries.ts    # query keys + queryOptions only
    mutations.ts  # useMutation hooks (consumer slices only)
  model/          # domain types, zod schemas, policies, submit/derived-state hooks
  ui/
  index.ts        # public API
```

- `queries.ts`: keys and `queryOptions` only. No hooks, mutations or select
  helpers. Omit the file if the slice has no query factory.
- Mutation hooks live only in `mutations.ts`. Any other hook goes to `model/`.
- Split `api/` into sub-folders when a file exceeds ~200 lines or the slice
  talks to more than one backend module. Never one file per HTTP verb.
- Call a request directly (outside a query or mutation) only if it writes
  nothing the cache holds.
- Auth endpoints never appear in a slice's `requests.ts`: requests delegate to
  `getAuthAdapter()` (`entities/session/api/requests.ts`,
  `features/change-password/api/requests.ts`). See `auth-adapter.md`.

## 3. DTO ↔ domain

- **Wire types** live in `api/dto.ts` with backend naming preserved
  (`created_at`). Only the slice's own `api/` imports them; ESLint
  `no-restricted-imports` blocks `**/api/dto` elsewhere.
- **Domain types** live in `model/` (`model/example-item.ts`): camelCase,
  business names, enums as `as const` objects.
- **Map in `requests.ts`, both directions**: domain input → `to*Dto`; response →
  `from*Dto`. Mappers pick fields explicitly so extra form values never reach
  the wire (`toExampleItemInputDto`). Use `select` only for view projections.
- **Dates** stay ISO strings as the API sends them; format at display time.
- **Write payloads**: the domain input type (`ExampleItemInput`) and the wire
  body (`ExampleItemInputDto`) are declared on their own, never derived from the
  read type. When form values differ from the payload, add a pure
  `model/build-<noun>-payload.ts`; `.tsx` files never build a backend body.
- Backend quirks stay in `api/` (or the payload builder), never in hooks or components.
- A delete request takes a primitive id; the request builds the URL/body.
- **Public API**: `index.ts` exports domain types, query factories and request
  functions. Never DTOs or mappers.
- Name requests and hooks by domain noun and verb (`listExampleItems`,
  `useCreateExampleItemMutation`), never by backend path.

## 4. Query keys and factories

One factory per owning slice in `api/queries.ts`, every key wrapped in
`queryOptions()` so one object serves `useQuery`, `ensureQueryData`,
`fetchQuery` and `setQueryData`:

```ts
// src/entities/example-item/api/queries.ts
export const exampleItemQueries = {
  all: () => ['example-items'] as const,
  list: () =>
    queryOptions<ExampleItem[]>({
      queryKey: [...exampleItemQueries.all(), 'list'] as const,
      queryFn: ({ signal }) => listExampleItems(signal),
    }),
}
```

- No inline or standalone query keys anywhere (`sessionQueries.current().queryKey`, not `['session', 'current']`).
- Pass the `signal` from the query function to the request.
- **Consume the factory at the call site**: `useQuery(exampleItemQueries.list())`.
  Put shared options (`staleTime`) in the factory, caller-specific ones inline.
- Cross-slice code imports factories through the owning slice's `index.ts`.
- Route loaders only read the session (`ensureQueryData(sessionQueries.current())`
  in `src/app/router/loaders.ts`); page data is fetched by TanStack Query in the component.

## 5. Mutations live with their consumer (Pages First)

- **One consumer**: keep the mutation, schema, submit hook and UI in that page
  (`src/pages/example-items/api/mutations.ts`).
- **A second page or `app` needs the same action**: promote it to
  `features/<verb>-<noun>` then, not before (`features/change-password` is used
  by `pages/change-password` and `pages/settings`). A feature with a single
  consumer is merged back (Steiger `fsd/insignificant-slice`).
- A page or feature may import several entities and invalidate every key its
  write affects. Cross-entity invalidation is not a reason to create a feature.
- Do not mix `useQuery` and `useMutation` in one hook.
- Feature names: `upsert-<noun>`, `create-<noun>`, `delete-<noun>`,
  `<verb>-<noun>` (`sign-out`, `change-password`, `toggle-theme`). Hooks keep
  `use<Verb><Noun>`; `index.ts` exports only the UI entry or hook consumers use.

### Mutation hooks

```ts
// src/pages/example-items/api/mutations.ts (simplified)
export function useCreateExampleItemMutation() {
  const queryClient = useQueryClient()
  return useMutation<ExampleItem, ApiError, ExampleItemInput>({
    mutationFn: createExampleItem,
    onSuccess: () => {
      notify.success(text.created)
      return queryClient.invalidateQueries({ queryKey: exampleItemQueries.all() })
    },
    onError: (error) => notifyApiError(error, text.saveFailed),
  })
}
```

- `mutationFn` is the request function itself (or a thin adapter over its arguments).
- `onSuccess` **returns** the invalidation promise (`Promise.all` for several
  keys), so `mutateAsync` resolves after the refetch.
- Invalidate the written slice's `all()` by default; narrow it only with a
  comment saying why, and give every cross-entity key a one-line reason.
- If the write changes the signed-in user's own data, also invalidate
  `sessionQueries.all()`.
- Refresh via invalidation; do not `setQueryData` from the mutation response.
- Type mutations as `useMutation<TData, ApiError, TVariables>`.
- Variables carrying passwords: `gcTime: 0`.

## 6. Notify, navigation and errors

- `notify` / `notifyApiError` (`@/shared/lib/notify`) are called from mutation
  hooks' `onSuccess`/`onError` (`pages/example-items/api/mutations.ts`) or from a
  submit hook in `model/` (`use-change-password-submit.ts`). Never from
  `requests.ts` or `queries.ts`. To use a toast library, call `setNotifier` once
  in `src/main.tsx`.
- Navigation happens in submit hooks or components (`use-login-submit.ts`),
  and session-driven navigation only in `src/app/router/wire-session-events.ts`.
- A server error that belongs to a field goes to `setError`
  (`fieldErrorsFromApi`, see `react-forms.md`), instead of or in addition to a notification.
- Page-only follow-ups after success are callbacks passed by the caller
  (`mutate(vars, { onSuccess: onClose })`, `onChanged`); the mutation never
  learns about the page.
- A 403 `forbidden` from any query or mutation refetches the session
  (`src/app/bootstrap/refresh-session-on-forbidden.ts`, wired in
  `query-client.ts`); do not duplicate that per mutation.

## 7. `shared/api`

Only cross-slice transport with no domain behavior: `http`,
`createHttpClient`, `ApiError`, `getErrorMessage`, RFC 7807 parsing
(`problem-json.ts`), `ApiErrorCode`/`HttpStatus` and the auth mechanism.
Reusable business types belong in `entities/`; single-use DTOs stay with their
owner. Never move a business endpoint into `shared/api` because it is CRUD.

## 8. Pre-commit checklist

- [ ] No inline query keys; all go through the owning factory
- [ ] No `useMutation` or invalidation inside `entities/`
- [ ] `requests.ts` maps DTO ↔ domain; the cache holds domain data only
- [ ] `dto.ts` and mappers are not exported from `index.ts`
- [ ] `onSuccess` returns the invalidation promise
- [ ] No `notify`, navigation or confirm in `requests.ts`/`queries.ts`
- [ ] No feature created for a single consumer
- [ ] Requests and hooks named by domain verb, not backend path
