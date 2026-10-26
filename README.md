# React Boilerplate

Template cho SPA React có đăng nhập và gọi API (app nội bộ, dashboard, trang quản trị). Hạ tầng đã dựng sẵn và có test:
HTTP + auth (refresh single-flight, khóa liên tab), data router có guard theo quyền, cấu trúc Feature-Sliced Design,
lint ép kiến trúc, CI, Docker/nginx có CSP. Template **không kèm thư viện UI**: các trang dùng HTML ngữ nghĩa thuần để
dự án tự chọn bộ giao diện.

Stack: Vite, React 19, TypeScript strict, React Router 7 (data router), TanStack Query, axios, react-hook-form + zod,
Tailwind 4 (chưa dùng class nào), Vitest + jsdom + MSW + Testing Library, Playwright, ESLint 10, Prettier, Steiger.

Yêu cầu: Node `>=22.13` (xem `.nvmrc`), npm.

## Khởi tạo dự án mới

1. Tạo repo từ template:
   - Trên GitHub: **Use this template** → **Create a new repository**, hoặc
   - `npx degit <owner>/<repo-template> my-app` (sao chép không kèm lịch sử git).
2. Đổi tên: `name` trong `package.json`, `APP_NAME` trong `src/shared/config/app-info.ts`, `<title>` trong
   `index.html`.
3. `cp .env.example .env` rồi chỉnh (xem [Biến môi trường](#biến-môi-trường)).
4. `npm ci && npm run dev`.
5. Chọn tiền tố localStorage (mục [Khóa lưu trữ](#khóa-lưu-trữ-storage_prefix)) **trước lần triển khai đầu tiên**.
6. Khi đã quen cấu trúc, gỡ tính năng mẫu (mục [Gỡ example-item](#gỡ-example-item)).
7. `src/test/no-domain-traces.test.ts` chỉ canh chính template (không còn từ khóa của dự án nguồn); dự án mới có thể
   xóa nó.

Người duy trì template: bật **Settings → General → Template repository** trên GitHub để nút "Use this template" xuất
hiện.

## Lệnh

| Lệnh                              | Việc                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server, proxy `/api` tới `VITE_DEV_API_TARGET`                   |
| `npm run build`                   | `tsc -b && vite build` ra `dist/`                                         |
| `npm run preview`                 | Phục vụ `dist/` (cũng proxy `/api`)                                       |
| `npm run typecheck`               | `tsc --noEmit`                                                            |
| `npm run lint`                    | `eslint .` rồi `steiger ./src` (luật layer FSD)                           |
| `npm run format` / `format:check` | Prettier ghi / kiểm                                                       |
| `npm test` / `npm run test:watch` | Vitest (unit + component, API giả bằng MSW)                               |
| `npm run test:e2e`                | Playwright; tự chạy `npm run dev`, API giả bằng `page.route`              |
| `npm run verify:example-removal`  | Thử gỡ `example-item` trên bản sao tạm rồi chạy typecheck/lint/test/build |

Lần đầu chạy e2e cần cài trình duyệt: `npx playwright install chromium`.

## Biến môi trường

| Biến                  | Dùng ở        | Mặc định                | Ghi chú                                        |
| --------------------- | ------------- | ----------------------- | ---------------------------------------------- |
| `VITE_API_BASE`       | bundle        | `/api/v1`               | Nhúng lúc build; Docker nhận qua `--build-arg` |
| `VITE_DEV_API_TARGET` | `vite.config` | `http://127.0.0.1:8080` | Chỉ cho `dev`/`preview`, không vào bundle      |

Biến bắt buộc mới đọc bằng `requireEnv(name)` (`src/shared/config/env.ts`): thiếu thì lỗi ngay lúc khởi động.

## Cấu trúc (Feature-Sliced Design)

```
src/
  main.tsx          tạo QueryClient, router, nối sự kiện phiên, render
  app/              bootstrap (providers, query-client), router (routes, loaders/guard, error boundary),
                    layouts/app-shell, navigation (bảng mục menu), styles
  pages/            login, change-password, settings, not-found, example-items (mẫu)
  features/         sign-out, change-password, toggle-theme
  entities/         session (người dùng hiện tại, landingPathFor), example-item (mẫu)
  shared/
    api/            http client, ApiError, RFC 7807, auth/ (cơ chế + AuthAdapter)
    config/         env, ROUTES, STORAGE_KEYS, APP_NAME
    lib/            access, notify, cn, hooks, form-errors, safe-redirect, theme, const-enum
    i18n/           messages.vi.ts (mọi chuỗi UI dùng chung)
  test/             setup, renderRoute, MSW handlers, fixtures
```

Import một chiều `app → pages → features → entities → shared`; mỗi slice chỉ lộ ra qua `index.ts`. Không có layer
`widgets` (xem [ADR-0001](docs/decisions/0001-feature-sliced-design.md)). Quy ước chi tiết:
[docs/code-conventions.md](docs/code-conventions.md).

### Thêm một slice

1. Tạo thư mục `src/<layer>/<slice>/` với `api/` (`dto.ts`, `mappers.ts`, `requests.ts`, `queries.ts`), `model/`
   (kiểu miền, schema zod, hook), `ui/` (nếu có), và `index.ts` xuất public API. `dto.ts` không xuất qua `index.ts`
   (ESLint cấm import DTO từ ngoài `api/` của slice).
2. Bắt đầu ở `pages/<page>` (Pages First). Chỉ tách ra `entities/` khi có consumer thứ hai, chỉ tách thao tác ghi ra
   `features/<verb>-<noun>` khi có trang thứ hai dùng. Steiger báo `fsd/insignificant-slice` cho slice chỉ có một
   consumer.
3. Thêm route vào `src/app/router/routes.tsx` (con của khung `AppShell`, `loader: loaders.guard({ anyPermission: [...] })`
   nếu cần quyền), đường dẫn vào `ROUTES` (`src/shared/config/routes.ts`), mục menu vào `NAV_ITEMS`
   (`src/app/navigation/nav-items.ts`), chuỗi UI vào nhóm riêng trong `src/shared/i18n/messages.vi.ts`.
4. Test đặt cạnh code (`*.test.ts[x]`); handler MSW dùng chung ở `src/test/msw/`.

Slice mẫu để chép: `entities/example-item` (dto → mapper → request → query factory) và `pages/example-items`
(mutation, form react-hook-form + zod, lỗi 422 theo ô).

## Vai trò và quyền

`src/shared/lib/access/access.config.ts` khai báo `Roles` và `Permissions` (object `as const`). Giá trị phải khớp
`AuthUser.role` và `AuthUser.permissions` mà backend trả. Dùng ở:

- guard route: `loaders.guard({ roles: [Roles.Admin] })` hoặc `loaders.guard({ anyPermission: [Permissions.X] })`
  (khai báo cả hai thì phải thỏa cả hai);
- mục menu: `visibleFor: (user) => can(user, Permissions.X)`;
- trang đích sau đăng nhập: `LANDING_RULES` trong `src/entities/session/model/landing-path.ts` (không khớp quy tắc nào
  thì về `/settings`). Mọi đích của `landingPathFor` phải vào được mà không cần quyền người dùng chưa có, nếu không
  guard sẽ chuyển hướng vòng.

`can`/`canAny`/`hasRole` chỉ là gợi ý giao diện; backend là nơi quyết định cuối cùng.

## Đổi backend (AuthAdapter)

Cơ chế auth (Bearer, refresh single-flight, khóa liên tab, retry sau 401, token store, thứ tự guard, sự kiện phiên)
không phụ thuộc backend. Mọi điểm chạm với hợp đồng backend đi qua interface `AuthAdapter`
(`src/shared/api/auth/auth-adapter.ts`): `login`, `refresh`, `logout`, `changePassword`, `fetchCurrentUser` (map về
`AuthUser`), `unauthenticatedPaths`, `refreshSupported`, `isRefreshTokenSpent`, `forbiddenRequiresPasswordChange`.

Đổi backend:

1. Viết adapter mới (chép `src/shared/api/auth/adapters/default.ts` làm khung). Backend chỉ có access token thì đặt
   `refreshSupported: false`: token store khi đó lưu access token để giữ phiên qua lần tải lại (xem adapter thử nghiệm
   `src/test/auth/access-only-adapter.ts`).
2. Trỏ `authAdapter` trong `src/shared/api/auth/auth.config.ts` tới adapter đó.
3. Nếu thân lỗi không theo RFC 7807 (`code`, `detail`, `errors`), sửa `src/shared/api/problem-json.ts`; mã lỗi chung ở
   `src/shared/api/error-codes.ts`.
4. Cập nhật test dựng theo hợp đồng mặc định: `signInAs` (`src/test/msw/api.ts`), `makeMeDto`
   (`src/test/fixtures/user.ts`), `e2e/support/mock-api.ts`, và các test giả lập endpoint mặc định
   (`grep -rln "'/auth/\|'/me'" src e2e`). Test cơ chế chạy với cả hai adapter ở
   `src/test/auth/adapter-contract.test.ts`; thêm adapter mới vào đó.

**Ngoài khả năng của adapter** (phải thay cả module `shared/api/auth`):

- OAuth/OIDC kiểu redirect (đăng nhập ở trang của nhà cung cấp, callback);
- session cookie, hoặc refresh token trong cookie `httpOnly`: cơ chế refresh cần đọc được refresh token từ JS để so
  sánh khi lấy khóa liên tab, phát hiện đăng xuất giữa chừng và trả lời `hasSession()`.

Lý do và đánh đổi lưu token: [ADR-0002](docs/decisions/0002-auth-contract-and-token-storage.md).

## Thêm UI cho dự án

Template không có `src/shared/ui`, thư viện component, icon hay toast. Khi dự án chọn bộ giao diện:

1. **Component**: `components.json` đã cấu hình cho shadcn CLI (aliases `@/shared/ui`, `@/shared/lib/cn`, CSS
   `src/app/styles/index.css`). `npx shadcn@latest add button` dùng `style: "base-nova"` (component dựng trên Base UI)
   và `iconLibrary: "lucide"` đang ghi trong file. Muốn chọn khác, chạy `npx shadcn@latest init` hoặc sửa
   `components.json` trước lần `add` đầu tiên. Thư mục `src/shared/ui` do CLI tạo.
2. **Thay markup thuần** trong các trang (`src/pages/*/ui`), khung `src/app/layouts/app-shell`, và `ui/` của feature
   bằng component của dự án. Chuỗi hiển thị vẫn lấy từ `messages.vi.ts`.
3. **Thông báo**: mọi thông báo đi qua `notify` (`src/shared/lib/notify`). Mặc định là một phần tử `role="status"` tự
   gỡ sau 5 giây. Nối thư viện toast một lần trong `src/main.tsx`:
   ```ts
   import { setNotifier } from '@/shared/lib/notify'
   setNotifier({ info: toast.info, success: toast.success, error: toast.error })
   ```
   Xác nhận hành động nguy hiểm hiện dùng `window.confirm`; thay bằng dialog của dự án nếu muốn.
4. **CSP**: nginx đặt `style-src 'self'` vì template không có style inline. Nếu thư viện chèn style inline (thẻ
   `<style>` hoặc thuộc tính `style`, nhiều thư viện headless và toast làm vậy), đổi thành
   `style-src 'self' 'unsafe-inline'` ở **mọi** dòng `add_header Content-Security-Policy` trong `deploy/nginx.conf`
   (cấp server và từng `location`), rồi sửa `CANONICAL_CSP` và test "không có unsafe-inline" trong
   `src/test/deploy-config.test.ts` cho khớp. Không nới `script-src`.

## Khóa lưu trữ (`STORAGE_PREFIX`)

`src/shared/config/storage-keys.ts`: `STORAGE_PREFIX = 'app'` sinh ra `app:session`, `app:session-lock`, `app:theme`.
Đổi tiền tố cho dự án (tránh trùng với app khác cùng domain) **trước lần triển khai đầu tiên**; đổi sau đó làm người
dùng mất phiên và theme đã lưu.

- `public/theme-init.js` chạy trước bundle nên đọc khóa theme bằng chuỗi trần `'app:theme'`: đổi tiền tố thì sửa cả
  file này. Test `src/shared/config/storage-keys.test.ts` báo đỏ nếu hai nơi lệch nhau.
- `AUTH_CHANNEL = 'app-auth'` (BroadcastChannel) và `REFRESH_LOCK_NAME = 'app-refresh'` (Web Lock) là chuỗi riêng,
  không sinh từ tiền tố; đổi tay nếu muốn.

## Gỡ example-item

`example-item` là tính năng CRUD mẫu (`/example-items`). Gỡ bằng:

```bash
node scripts/remove-example.mjs
npm run typecheck && npm run lint && npm test && npm run build
```

Chi tiết, danh sách việc làm tay sau đó và cách giữ quy ước marker:
[docs/removing-example-item.md](docs/removing-example-item.md).

## Triển khai

- **CI** (`.github/workflows/ci.yml`): push lên `main` và mọi pull request chạy typecheck → lint → format:check → test →
  build. Đổi nhánh kích hoạt ở khóa `on.push.branches`. CI không chạy e2e.
- **Image** (`.github/workflows/publish-image.yml`): push tag `v*` build image và đẩy lên
  `ghcr.io/<owner>/<repo>` (tag theo git tag và `latest`), chỉ dùng `GITHUB_TOKEN`.
- **Docker**: `docker build --build-arg VITE_API_BASE=/api/v1 -t my-app .` rồi `docker run -p 8080:8080 my-app`.
  Image là nginx không root, cổng 8080, phục vụ `dist/` với SPA fallback, `/healthz` trả `ok`, `/api/` trả 404
  (reverse proxy phía trước phải chuyển `/api` tới backend), header cache và CSP trong `deploy/nginx.conf`.
- Access token nằm trong bộ nhớ, refresh token trong localStorage: CSP là lớp phòng thủ bắt buộc, đừng gỡ (xem
  [ADR-0002](docs/decisions/0002-auth-contract-and-token-storage.md)).

## Tài liệu khác

- [docs/code-conventions.md](docs/code-conventions.md): quy ước mã nguồn
- [docs/decisions/](docs/decisions/): ADR (FSD, hợp đồng auth và lưu token, data router)
- [docs/removing-example-item.md](docs/removing-example-item.md): gỡ tính năng mẫu
- [CLAUDE.md](CLAUDE.md): tóm tắt cho Claude Code
