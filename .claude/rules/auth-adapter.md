---
paths:
  - "src/shared/api/**"
  - "src/entities/session/**"
  - "src/features/sign-out/**"
  - "src/features/change-password/**"
  - "src/test/auth/**"
---

# Auth: mechanism vs. adapter

Background and trade-offs: `docs/decisions/0002-auth-contract-and-token-storage.md`.

## 1. Two halves

- **Mechanism** (`src/shared/api/auth/`) is backend-agnostic and is not edited
  per backend:
  - `install-auth.ts`: the axios interceptor. Adds `Authorization: Bearer …`,
    and on a qualifying 401 refreshes once and retries the request (`_retry`).
  - `refresh-session.ts`: single-flight refresh (one in-flight promise per tab),
    run under a cross-tab lock (`refresh-lock.ts`: Web Locks `navigator.locks`
    on `REFRESH_LOCK_NAME`, localStorage lock as fallback). A tab that waited
    reuses the peer's new access token received over `BroadcastChannel`
    (`auth-channel.ts`, `AUTH_CHANNEL`) instead of spending the rotated refresh token.
  - `token-store.ts`: access token in memory; the long-lived credential (the
    refresh token, or the access token when `refreshSupported` is false) in
    localStorage under `STORAGE_KEYS.Session`.
  - `session-events.ts`: `onSessionExpired`, `onRemoteSignOut`,
    `onPasswordChangeRequired`, `expireSession`, `broadcastSignOut`.
- **Backend contract** goes only through `AuthAdapter` (`auth-adapter.ts`).
  The active adapter is chosen in `auth.config.ts`; the default is
  `adapters/default.ts`. Changing backend = write an adapter and point
  `authAdapter` at it.

## 2. `AuthAdapter` members (each owns one decision)

| Member | Decides |
|---|---|
| `refreshSupported` | Whether the backend has refresh tokens; `false` stores the access token as the session and a rejected 401 ends the session |
| `unauthenticatedPaths` | Paths (relative to `baseURL`) that get no Bearer and never trigger refresh; matched exactly or at a `/`, `?`, `#` boundary |
| `login` | Endpoint and body for credentials → `AuthTokens` |
| `refresh` | Endpoint and body for refresh token → new `AuthTokens` |
| `logout` | Server sign-out; must send `{ skipAuthRefresh: true }` |
| `changePassword` | Endpoint and body for `ChangePasswordInput` |
| `fetchCurrentUser` | Current-user endpoint and mapping of its wire shape to `AuthUser` |
| `isRefreshTokenSpent` | Whether a failed refresh means the token can no longer be used (→ `expireSession()`) |
| `forbiddenRequiresPasswordChange` | Whether a 403 means "change password first" (→ password-change event) |
| `isAccessTokenRejected` | Whether a 401 means the access token was rejected, as opposed to a credential check failing on a live session (wrong current password) |

## 3. Rules

- Code outside `src/shared/api/auth` calls `getAuthAdapter()` (from
  `@/shared/api`) and never hard-codes auth endpoints or wire shapes
  (`entities/session/api/requests.ts`, `entities/session/api/sign-in.ts`,
  `features/change-password/api/requests.ts`, `features/sign-out/model/use-sign-out.ts`).
- Every adapter sets `skipAuthRefresh: true` on its logout request: a 401
  during sign-out must not refresh (minting a token being discarded) or expire
  the session.
- `defaultAdapter` is exported from `@/shared/api` for tests only; app code uses
  `getAuthAdapter()`. Tests swap adapters with `setAuthAdapterForTest(adapter)`
  and reset with `null`.
- Unauthenticated paths get no Bearer and a 401 there never refreshes (it means
  wrong credentials).
- A 401 triggers refresh/expiry only when the request was not already retried,
  is not `skipAuthRefresh`, is not an unauthenticated path, a session exists,
  **and** `isAccessTokenRejected(error)` is true. Otherwise the error goes to
  the caller unchanged: no refresh, no expiry, no resend.
- A 403 for which `forbiddenRequiresPasswordChange` is true emits the
  password-change event, then the error is still thrown.
- Adapters do not import `session-events` or `token-store` (avoids a cycle with
  `active-adapter.ts`); they map errors to booleans and return data.
- `shared/api` must not import `app`. It emits events;
  `src/app/router/wire-session-events.ts` turns them into navigation and cache clearing.
- Sign-out (`useSignOut`) calls the adapter before clearing tokens (the request
  needs the Bearer), never lets a logout failure block local sign-out, then
  clears the token store and query cache and calls `broadcastSignOut()`.
- After a password change the server has revoked refresh tokens: clear the
  token store, then sign in again with `signInAndLoadUser`
  (`features/change-password/model/use-change-password-submit.ts`).
- Changing an adapter or the mechanism requires the contract tests to pass for
  both `defaultAdapter` and `accessOnlyAdapter` (`src/test/auth/access-only-adapter.ts`):
  `src/test/auth/adapter-contract.test.ts`, `src/shared/api/auth/auth-contract.test.ts`
  and the other `src/shared/api/auth/*.test.ts`. A new adapter is added to the
  `cases` array of both contract tests.
- Default-contract test helpers to update with a new backend: `signInAs`
  (`src/test/msw/api.ts`), `makeMeDto` (`src/test/fixtures/user.ts`),
  `e2e/support/mock-api.ts`.
- Storage key names (`STORAGE_KEYS`, `AUTH_CHANNEL`, `REFRESH_LOCK_NAME`) live in
  `src/shared/config/storage-keys.ts`; renaming them after deploy drops users' sessions.

## 4. Out of adapter scope

Redirect-based OAuth/OIDC, session cookies, or a refresh token in an `httpOnly`
cookie need a replacement of the whole `shared/api/auth` module, not an adapter
(the mechanism must read the refresh token from JS).
