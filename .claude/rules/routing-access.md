---
paths:
  - "src/app/router/**"
  - "src/shared/lib/access/**"
  - "src/entities/session/**"
---

# Routing & access

- Guards are loaders (`src/app/router/loaders.ts`), checked in order: session → password
  change → permissions. Loaders never fetch page data; they only read the session
  (`ensureQueryData(sessionQueries.current())`).
- Every destination of `landingPathFor` (`src/entities/session/model/landing-path.ts`) must
  be reachable without permissions the user lacks, or redirects will loop. The property test
  `src/app/router/landing-reachability.property.test.ts` checks this:
  `npx vitest run landing-reachability.property`.
- Declare `Roles`/`Permissions` in `src/shared/lib/access/access.config.ts`; check with
  `can`/`canAny`/`hasRole`.
- Session-driven navigation (expired, remote sign-out, password change required) lives only in
  `src/app/router/wire-session-events.ts`.
