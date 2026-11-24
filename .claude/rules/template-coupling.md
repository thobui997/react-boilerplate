---
paths:
  - "public/theme-init.js"
  - "src/shared/config/**"
  - "deploy/**"
  - "src/test/deploy-config.test.ts"
---

# Files that must change together

- `STORAGE_PREFIX` (`src/shared/config/storage-keys.ts`): also update `public/theme-init.js`,
  which reads the theme key before first paint and hard-codes it.
  `src/shared/config/storage-keys.test.ts` fails if the script does not contain
  `STORAGE_KEYS.Theme`.
- The CSP in `deploy/nginx.conf`: change `src/test/deploy-config.test.ts` in the same commit.
  The test reads the config and compares its CSP directives with a canonical list, so both
  must pass.

Check with `npx vitest run storage-keys deploy-config`.
