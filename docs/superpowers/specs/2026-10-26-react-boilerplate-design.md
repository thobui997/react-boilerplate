# React Boilerplate — Thiết kế

Ngày: 2026-10-26 · Nguồn tham chiếu: `/home/tho-bui/Documents/projects/commune-police-daily-client`

## 1. Mục tiêu và phạm vi

**Mục tiêu.** Một GitHub template repo để khởi tạo nhanh mọi dự án React sau này, không phải dựng lại hạ tầng từ đầu. Kiến trúc lấy từ `commune-police-daily-client`, đã loại nghiệp vụ và sửa các lỗi phát hiện trong repo gốc.

**Quyết định đã chốt với chủ dự án:**

| Chủ đề | Quyết định |
|---|---|
| Loại dự án | SPA có đăng nhập và gọi API (app nội bộ, dashboard, admin) |
| Hợp đồng backend | Mặc định giữ nguyên: Bearer access token + refresh token, lỗi RFC 7807. Tách qua `AuthAdapter` để backend khác đổi một file (mục 4.1) |
| Cách dùng | GitHub template repo ("Use this template" hoặc `npx degit`) |
| Ngôn ngữ UI | Tiếng Việt, mọi chuỗi chung gom vào một file messages, không dùng thư viện i18n |
| Cách làm | Dựng repo mới, port có chọn lọc, kèm một feature mẫu (không clone-rồi-xóa) |

**Ngoài phạm vi (YAGNI):** PWA/service worker/push, thư viện i18n, husky/commitlint, tầng `widgets`, tách package npm, CLI sinh code. Có thể thêm sau.

## 2. Stack

Vite, React 19, TypeScript strict, React Router 7 (data router), TanStack Query, axios, react-hook-form + zod + `@hookform/resolvers`, Tailwind 4 + shadcn/ui (Base UI) + class-variance-authority + clsx + tailwind-merge + lucide-react, Vitest + jsdom + MSW + Testing Library, Playwright, ESLint 10 (flat config) + typescript-eslint + eslint-plugin-react-hooks, Prettier + prettier-plugin-tailwindcss, Steiger + `@feature-sliced/steiger-plugin`. Package manager: npm.

Phiên bản lấy đúng bản đã chạy ổn trong `package.json` của repo gốc (Vite 8.3.x, TS 6.0.x, React 19.3.x, ESLint 10, Vitest 5, Steiger 0.7 + plugin 0.8). Khi cài, kiểm tra peer range của Steiger/plugin.

## 3. Cấu trúc thư mục

Feature-Sliced Design, không có `widgets`. Quy tắc layer được ép bởi Steiger và ESLint `no-restricted-imports`.

```
src/
  main.tsx
  app/
    bootstrap/      app-providers, query-client
    router/         create-app-router, routes, loaders, route-error-boundary,
                    hydrate-fallback, wire-session-events
    layouts/        app-shell
    styles/         index.css
  pages/            login, change-password, not-found, settings, example-items (mẫu)
  features/         sign-out, change-password, toggle-theme
  entities/
    session/        api/ + model/
    example-item/   api/ (dto, mappers, requests, queries) + model/   (mẫu)
  shared/
    api/            http (factory), api-error, problem-json, normalize-error, error-codes,
                    auth/ (install-auth, refresh-session, token-store, auth-channel,
                           refresh-lock, session-events,
                           auth-adapter.ts          interface AuthAdapter
                           adapters/default.ts      adapter mặc định = hợp đồng hiện tại
                           auth.config.ts           chọn adapter đang dùng)
    config/         env, routes, storage-keys
    lib/            cn, hooks, form-errors, safe-redirect, theme, access
    ui/             component thuần (button, input, form, field, table, dialog, toast, ...)
    i18n/           messages.vi.ts
  test/             setup, render, wrapper, query-client, msw/
```

Mỗi slice có `index.ts` làm public API. `entities` và `features` tách `api/` và `model/` như repo gốc.

**Feature mẫu `example-item`.** Slice CRUD tối giản (danh sách + form tạo/sửa) minh họa đủ chuỗi dto → mapper → request → query → page, kèm test MSW. Xóa được trong một commit; README có hướng dẫn xóa và nhân bản.

## 4. HTTP và auth

Hợp đồng mặc định giữ như repo gốc, nhưng được tách khỏi cơ chế để mỗi backend sau này có thể khác (xem 4.1). Sửa các lỗi phát hiện khi port.

### 4.1 Tách cơ chế và hợp đồng (AuthAdapter)

- **Cơ chế (cố định, có test, không sửa theo từng backend):** single-flight refresh, khóa liên tab, retry sau 401, token store, thứ tự guard, phát sự kiện session.
- **Hợp đồng (đổi theo backend):** interface `AuthAdapter` trong `shared/api/auth/auth-adapter.ts`. Mọi điểm chạm với hợp đồng backend đều đi qua adapter, không còn endpoint hay field nào hard-code ngoài nó:
  - `login(client, credentials)`, `refresh(client, refreshToken)`, `logout(client, refreshToken)`: gọi endpoint, trả về token.
  - `fetchCurrentUser(client, signal)`: gọi endpoint "người dùng hiện tại" và map response thành `AuthUser` chung (`id`, `username`, `displayName`, `role`, `permissions`, `mustChangePassword`).
  - `unauthenticatedPaths`: các đường dẫn không gắn Bearer và không bao giờ kích hoạt refresh (mặc định `/auth/login`, `/auth/refresh`).
  - `isRefreshTokenSpent(error)`: chính sách khi refresh thất bại, lỗi nào coi refresh token đã bị dùng/thu hồi nên phải kết thúc phiên (mặc định 401, lỗi mạng, 5xx). Đây là chính sách xoay token và phát hiện tái sử dụng của backend.
  - `forbiddenRequiresPasswordChange(error)`: 403 nào nghĩa là bị ép đổi mật khẩu.
  - `refreshSupported`: `false` nếu backend chỉ có access token. Khi đó phiên được giữ qua reload bằng cách lưu chính access token (token store lưu "credential dài hạn" = refresh token nếu có, ngược lại access token).
- `adapters/default.ts` hiện thực đúng hợp đồng hiện tại (Bearer + refresh token xoay vòng, lỗi RFC 7807). `auth.config.ts` chọn adapter đang dùng. Dự án mới đổi backend chỉ viết lại một file adapter.
- **Ngoài khả năng của adapter** (phải thay cả module auth): OAuth/OIDC kiểu redirect; session cookie hoặc refresh token httpOnly (cơ chế refresh cần đọc được refresh token từ JS để so sánh khi lấy khóa, phát hiện đăng xuất giữa chừng và hỗ trợ `hasSession`). Ranh giới `AuthAdapter`/cơ chế được giữ sạch để thay module không chạm các phần còn lại. README ghi rõ giới hạn này.
- Lưu ý khi port: `nowMs`/`syncServerClock` của `ict-time` được thay bằng `Date.now()` (luật ESLint cấm `Date` bị tắt mặc định); chuỗi tiếng Việt trong `refresh-session`, `problem-json`, `normalize-error` và toast hết phiên chuyển vào `messages.vi.ts`; script theme inline trong `index.html` chuyển thành `public/theme-init.js` để CSP không cần `unsafe-inline` cho script; tiền tố khóa localStorage là hằng số `STORAGE_PREFIX` và có test canh sự đồng bộ với `public/theme-init.js`.

- **Factory duy nhất** `createHttpClient(options)` trong `shared/api/http.ts`. Client chính và client refresh dùng chung timeout/interceptor nền (repo gốc lặp ở `http.ts` và `refresh-session.ts`). Client refresh không gắn auth để tránh vòng lặp 401.
- **Auth interceptor:** gắn Bearer; khi 401 refresh đúng một lần rồi retry; cờ `skipAuthRefresh` để bỏ qua. Lỗi 403 `PasswordChangeRequired` phát sự kiện để điều hướng.
- **Refresh single-flight**, khóa liên tab bằng `BroadcastChannel` + refresh lock. Lỗi không rõ ràng thì kết thúc phiên.
- **Token store:** access token trong bộ nhớ, refresh token trong localStorage. README và ADR ghi rõ đây là đánh đổi (XSS đọc được localStorage) và dựa vào CSP. Repo gốc không có CSP trong `nginx.conf`; template **thêm CSP** vào `nginx.conf`.
- **Bỏ khỏi lõi:** đồng bộ đồng hồ server từ header `Date` (phục vụ nghiệp vụ ICT).
- **Lỗi:** `problem-json` (RFC 7807), `normalize-error`, `api-error`. `error-codes.ts` chỉ giữ mã chung (network, unauthorized, forbidden, validation, ...). Mã domain do từng entity khai báo.

## 5. Routing

- `createBrowserRouter`, mỗi route lazy-load, có `HydrateFallback` và `RouteErrorBoundary` (chuỗi lấy từ `messages.vi.ts`).
- Guard dạng loader chạy theo thứ tự cố định: có session → không bị ép đổi mật khẩu → đủ quyền. Thất bại thì redirect về `landingPathFor`.
- `Position`/`Permission` của repo gốc thay bằng `Role`/`Permission` dạng chuỗi, khai báo trong một file cấu hình (`shared/lib/access`). Route khai báo `requires` tùy chọn.
- `app/navigation` dùng bảng cấu hình item nav (`enabled`, `visibleFor`) nhưng nội dung chỉ gồm mục chung.
- `shared/config/routes.ts` chỉ chứa route chung (login, change-password, settings, not-found) và route của `example-item`.

## 6. Env

- `shared/config/env.ts` có helper `requireEnv(name)`; không còn `VITE_UNIT_NAME` hay biến domain.
- `.env.example`: `VITE_API_BASE`, `VITE_DEV_API_TARGET` (có chú thích).
- Docker build nhận `VITE_API_BASE` làm build-arg. `VITE_DEV_API_TARGET` bị loại khỏi pipeline build vì chỉ dùng khi dev.
- `.gitignore` bỏ qua `.env.*` nhưng cho phép `.env.example`.

## 7. Tooling

- `tsconfig.json`: strict, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `noUncheckedSideEffectImports`, alias `@/*` → `src/*` (đồng bộ trong `vite.config.ts`).
- ESLint: `max-lines` 300, `react-hooks/exhaustive-deps` là error, cấm import DTO ngoài slice của nó, ép layer FSD. Các luật cấm `new Date`/`Date.now`/`dayjs` là luật ICT của repo gốc: để dạng comment mẫu, mặc định tắt.
- Prettier: không dấu chấm phẩy, nháy đơn, printWidth 100, plugin sort class Tailwind.
- Steiger: `steiger.config.ts`.
- Không thêm husky/commitlint/lint-staged.
- `components.json` cho shadcn, style `base-nova`.

## 8. Test

- Vitest + jsdom, globals, `src/test/setup.ts` dùng MSW với `onUnhandledFrame: 'error'`.
- Giữ alias ESM cho `react-router` trong cấu hình Vitest (tránh lỗi dual-package context), kèm comment giải thích và nhắc kiểm tra khi nâng cấp.
- `src/test/render.tsx` + wrapper chuẩn (QueryClient test, router).
- Test đi kèm: `example-item` (list/form), refresh token (single-flight, 401 retry, khóa liên tab), route guard (thứ tự session → đổi mật khẩu → quyền), `requireEnv`.
- Test cơ chế auth chạy với **hai adapter**: adapter mặc định và một adapter thử nghiệm khác hợp đồng (endpoint/field khác, không có refresh token). Hai adapter cùng pass chứng minh cơ chế không phụ thuộc hợp đồng.
- Playwright: một e2e mẫu cho luồng login; cấu hình trong `playwright.config.ts`.

## 9. CI/CD và triển khai

- `.github/workflows/ci.yml`: typecheck → lint → format:check → test → build. Nhánh kích hoạt cấu hình được (repo gốc hard-code `develop`).
- `Dockerfile` multi-stage: `npm ci` ở layer riêng, runtime `nginxinc/nginx-unprivileged` cổng 8080.
- `deploy/nginx.conf`: SPA fallback, header cache, 404 cho `/api/`, `/healthz`, và CSP.
- Workflow build/push image: để dạng mẫu tối giản, không gắn registry hay runner cụ thể của repo gốc.

## 10. Tài liệu

- `README.md`: khởi tạo từ template, script, cách xóa `example-item`, cách thêm slice mới, cách đổi role/permission, cách triển khai.
- `docs/decisions/`: ADR-0001 FSD, ADR-0002 hợp đồng auth/token (nêu rõ đánh đổi localStorage + CSP), ADR-0003 data router. Đánh số liền mạch.
- `docs/code-conventions.md`: rút gọn từ bản gốc, bỏ phần domain.
- `CLAUDE.md`: mô tả ngắn kiến trúc và quy ước để Claude Code làm việc đúng ở dự án mới.

## 11. Rủi ro và kiểm chứng

| Rủi ro | Xử lý |
|---|---|
| Sót dấu vết domain | `grep` từ khóa domain (police, commune, plan, leave, ICT, Position, ...) trong toàn repo, yêu cầu 0 kết quả |
| Phiên bản công cụ mới, chỉ biết qua `package.json` gốc | Cài đúng bản đã chạy, rồi chạy `typecheck`, `lint`, `test`, `build`, `steiger`; không báo xong khi chưa xanh |
| Auth tinh vi (single-flight, đa tab) | Port kèm test, không viết lại từ đầu; cơ chế tách khỏi hợp đồng qua `AuthAdapter` |
| Interface `AuthAdapter` đoán sai nhu cầu thật | Thiết kế từ hai trường hợp cụ thể (mặc định + adapter thử nghiệm không refresh); chỉ thêm method khi một trường hợp thật cần (YAGNI) |
| Mang theo lỗi của repo gốc | Danh sách đã sửa ở mục 4–7 (HTTP lặp, env gắn domain, chuỗi hardcode, thiếu CSP, nhánh CI cố định) |

## 12. Thứ tự thực hiện (đầu vào cho plan)

1. Khung repo: tooling, tsconfig, lint, CI, Docker/nginx.
2. `shared` (api/auth, config, lib, ui, i18n).
3. `app` (providers, router, guard, layout) và các page chung.
4. `entities/session` và các feature chung.
5. Feature mẫu `example-item` kèm test và e2e.
6. Tài liệu, rà soát domain, xác minh toàn bộ.

## 13. Tiêu chí hoàn thành

- `npm run typecheck`, `lint`, `format:check`, `test`, `build` và Steiger đều pass trên repo sạch.
- `grep` domain trả 0 kết quả.
- Có thể bật "Template repository" trên GitHub và dựng dự án mới chỉ bằng cách đổi tên + chỉnh `.env`.
- Xóa `example-item` theo README vẫn build và test xanh.
- Thay `adapters/default.ts` bằng adapter khác hợp đồng chỉ cần sửa file adapter và `auth.config.ts`; không chạm cơ chế auth.
