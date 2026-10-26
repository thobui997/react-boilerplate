# React Boilerplate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng GitHub template repo `react-boilerplate` (SPA có đăng nhập + API) bằng cách port có chọn lọc hạ tầng từ `commune-police-daily-client`, bỏ nghiệp vụ, sửa các lỗi đã biết, kèm feature mẫu `example-item`.

**Architecture:** Feature-Sliced Design (app / pages / features / entities / shared, không có widgets). Cơ chế auth (single-flight refresh, khóa liên tab, retry 401, token store) tách khỏi hợp đồng backend qua interface `AuthAdapter`; adapter mặc định = hợp đồng hiện tại. Mọi chuỗi UI chung nằm trong `shared/i18n/messages.vi.ts`.

**Tech Stack:** Vite, React 19, TypeScript strict, React Router 7 (data router), TanStack Query, axios, react-hook-form + zod, Tailwind 4 + shadcn/Base UI, Vitest + jsdom + MSW + Testing Library, Playwright, ESLint 10 flat, Prettier, Steiger, Docker + nginx.

**Spec:** `docs/superpowers/specs/2026-10-26-react-boilerplate-design.md` (executor đọc cả spec lẫn plan).

**Port source (chỉ đọc):** `/home/tho-bui/Documents/projects/commune-police-daily-client`, viết tắt `$SRC`. Task "port" nghĩa là: copy test từ `$SRC` trước (chạy thấy đỏ vì thiếu code), rồi port code với các thay đổi được liệt kê, chạy xanh. Không viết lại thân hàm khi `$SRC` đã có; chỉ đổi những chỗ plan nêu.

## Global Constraints

- Repo: `/home/tho-bui/Documents/projects/react-boilerplate`, nhánh `main`. Package manager npm; lần cài đầu dùng `npm install` (chưa có lockfile) rồi commit `package-lock.json`.
- Node `>=22.13` trong `engines`; `.nvmrc` = `22`.
- Phiên bản dependency: **copy nguyên văn số phiên bản (pin cứng, không `^`) từ `$SRC/package.json`**; bỏ `dayjs`, `react-day-picker`, `vite-plugin-pwa`, `@vite-pwa/assets-generator`, mọi `workbox-*`. Kiểm tra peer range của `steiger@0.7.0` với `@feature-sliced/steiger-plugin@0.8.0` khi cài.
- `tsconfig.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `isolatedModules`, `verbatimModuleSyntax`, `skipLibCheck`, `noEmit`, alias `@/*` → `./src/*` (đồng bộ trong `vite.config.ts`).
- Prettier: không dấu chấm phẩy, nháy đơn, `trailingComma: all`, `printWidth: 100`, plugin `prettier-plugin-tailwindcss`.
- ESLint: `max-lines` 300, `react-hooks/exhaustive-deps` là `error`, cấm import file `**/api/dto`, `**/api/**/dto`, `**/api/*-dto` ngoài `api/` của chính slice. Luật cấm `new Date`/`Date.now`/`dayjs` của `$SRC` **không bật** (để dạng comment mẫu).
- FSD: không có layer `widgets`; layer rule ép bởi Steiger (`fsd.configs.recommended`) và ESLint; mỗi slice có `index.ts` làm public API; `entities`/`features` tách `api/` và `model/`.
- Script npm: `typecheck`, `dev`, `build` (`tsc -b && vite build`), `preview`, `lint` (`eslint . && steiger ./src`), `format`, `format:check`, `test` (`vitest run`), `test:watch`, `test:e2e`.
- Chuỗi UI chung chỉ nằm trong `src/shared/i18n/messages.vi.ts`, không dùng thư viện i18n.
- Khóa localStorage dùng tiền tố hằng số `STORAGE_PREFIX = 'app'` (`app:session`, `app:session-lock`, `app:theme`); `AUTH_CHANNEL = 'app-auth'`; `REFRESH_LOCK_NAME = 'app-refresh'`.
- Env: chỉ `VITE_API_BASE` (mặc định `/api/v1`) và `VITE_DEV_API_TARGET` (dev proxy, mặc định `http://127.0.0.1:8080`). Không có biến domain.
- Không PWA/service worker, không husky/commitlint/lint-staged, không thư viện i18n, không đồng bộ đồng hồ server (`Date.now()` thay `nowMs`).
- Không từ khóa domain trong repo (trừ `docs/superpowers/`): `police`, `commune`, `bcx`, `Công an`, `ict-time`, `VITE_UNIT_NAME`, `báo cáo ngày`.
- Test đặt cạnh code (`*.test.ts[x]`); test hạ tầng chung ở `src/test/`.
- Mỗi task kết thúc bằng một commit; thông điệp theo `type: mô tả`.

## Review Focus

Các tình huống spec ngầm đòi hỏi nhưng không task nào kiểm bằng test sẵn có, theo mức dễ gặp:

1. **Đăng xuất giữa lúc refresh đang bay**: token mới không được ghi đè lại phiên đã xóa (test `phiên bị xoá (đăng xuất) trong lúc refresh đang bay` port từ `$SRC` ở Task 6; adapter không có refresh thì tình huống này không tồn tại).
2. **Backend chỉ có access token + reload trang**: phiên phải còn (Task 5, test `token-store` access-only).
3. **`localStorage` ném lỗi (chế độ riêng tư)**: không crash, không trả lại token cũ đã bị thu hồi (Task 5, port test `token-store`).
4. **`?next=` trỏ ra ngoài (`//evil.com`, `https://evil.com`, `/\evil.com`)**: không bao giờ redirect ra ngoài, về landing path (Task 7, `safeRedirect`).
5. **Xóa `example-item` theo hướng dẫn**: repo vẫn typecheck, lint, test, build xanh (Task 16, `scripts/verify-example-removal.mjs`).

Ngoài ra Task 11 có test "guard thất bại không tạo vòng redirect" (đích của `landingPathFor` luôn qua được guard của chính nó).

---

### Task 1: Khung tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `steiger.config.ts`, `.prettierrc.json`, `.prettierignore`, `.nvmrc`, `.gitignore`, `.env.example`, `components.json`, `index.html`, `public/theme-init.js`, `src/main.tsx`, `src/app/styles/index.css`, `src/shared/lib/cn/{cn.ts,cn.test.ts,index.ts}`, `src/test/setup.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` tại `@/shared/lib/cn` (clsx + tailwind-merge); `src/test/setup.ts` chỉ `import '@testing-library/jest-dom/vitest'` và `configure({ asyncUtilTimeout: 4000 })` (MSW thêm ở Task 2).

- [ ] **Step 1: Viết test thất bại** `src/shared/lib/cn/cn.test.ts`: `cn('p-2', 'p-4')` trả `'p-4'`; `cn('a', false && 'b', undefined, 'c')` trả `'a c'`.
- [ ] **Step 2: Dựng khung.** Tạo các file cấu hình port từ `$SRC` (`tsconfig.json`, `eslint.config.js`, `steiger.config.ts`, `.prettierrc.json`, `components.json`, `.gitignore`) với thay đổi: `package.json` đặt `name` `react-boilerplate`, `version` `0.1.0`, `private`, `type: module`, danh sách script ở Global Constraints; `eslint.config.js` bỏ mảng `DAYJS_AND_DATE_FILES` và hai luật dayjs/Date (giữ DTO restriction, `max-lines`, `exhaustive-deps`; để hai luật cũ dạng comment mẫu); `.gitignore` bỏ `.superpowers/`, `.worktrees/`, `e2e/.auth/` giữ `.env.*` + `!.env.example`; `components.json` giữ nguyên aliases; `vite.config.ts` bỏ VitePWA, `__APP_VERSION__`, `env: { VITE_UNIT_NAME }`, giữ: plugin react + tailwind, alias `@`, `server.proxy` và `preview.proxy` `/api` → `VITE_DEV_API_TARGET || 'http://127.0.0.1:8080'` (đọc bằng `loadEnv`), khối `test` (jsdom, globals, `setupFiles`, `css: false`, `testTimeout: 15_000`, `exclude: ['e2e/**','node_modules/**']`, hai alias ESM của `react-router` **kèm comment giải thích dual-package** và `server.deps.inline`). `.env.example` chỉ có `VITE_API_BASE` (comment, mặc định `/api/v1`) và `VITE_DEV_API_TARGET`.
- [ ] **Step 3: `index.html` + `public/theme-init.js`.** Port script đặt `data-theme` từ `$SRC/index.html` thành file `public/theme-init.js` đọc khóa `app:theme`, nạp bằng `<script src="/theme-init.js"></script>` trong `<head>` (không còn script inline vì CSP ở Task 15). `<html lang="vi">`, `<title>React Boilerplate</title>`, bỏ mọi meta/icon PWA. `src/main.tsx` tạm render `<div>React Boilerplate</div>` (Task 11 thay thế); `src/app/styles/index.css` chỉ `@import 'tailwindcss';`.
- [ ] **Step 4: Cài và chạy test**
  Run: `npm install && npx vitest run src/shared/lib/cn`
  Expected: FAIL (thiếu `cn.ts`), sau Step 5 PASS.
- [ ] **Step 5: Implement** `cn` trong `src/shared/lib/cn/cn.ts`, export qua `index.ts`.
- [ ] **Step 6: Xác minh khung**
  Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
  Expected: tất cả exit 0. Nếu `steiger` báo lỗi vì cây còn trống, ghi lại luật bị báo và chỉ nới tạm trong `steiger.config.ts` bằng comment `// gỡ ở Task N`; không tắt toàn bộ.
- [ ] **Step 7: Commit** `git add -A && git commit -m "chore: tooling skeleton (vite, ts, eslint, steiger, vitest)"`

---

### Task 2: Config, i18n và hạ tầng test

**Files:**
- Create: `src/shared/config/{env.ts,env.test.ts,storage-keys.ts,storage-keys.test.ts,app-info.ts,routes.ts,index.ts}`, `src/env.d.ts`, `src/shared/i18n/{messages.vi.ts,index.ts}`, `src/test/{query-client.ts,wrapper.tsx}`, `src/test/msw/{server.ts,handlers.ts,api.ts,respond.ts}`
- Modify: `src/test/setup.ts`

**Interfaces:**
- Produces:
  - `requireEnv(name: string, source?: Record<string, string | undefined>): string` (mặc định `source = import.meta.env`; ném `Error` có chứa `name` khi thiếu hoặc rỗng).
  - `env: { apiBase: string }` với `apiBase = import.meta.env.VITE_API_BASE || '/api/v1'`.
  - `STORAGE_PREFIX = 'app'`, `STORAGE_KEYS = { Session: 'app:session', SessionLock: 'app:session-lock', Theme: 'app:theme' } as const`, `AUTH_CHANNEL`, `REFRESH_LOCK_NAME` (giá trị ở Global Constraints).
  - `APP_NAME = 'React Boilerplate'` (`app-info.ts`).
  - `ROUTES = { Home: '/', Login: '/login', ChangePassword: '/change-password', Settings: '/settings', ExampleItems: '/example-items' } as const`. Dòng `ExampleItems` nằm trong cặp marker `// <example-item>` … `// </example-item>`.
  - `messages` (const object) với các khóa ban đầu: `messages.errors.network` = `'Không có kết nối mạng. Kiểm tra mạng rồi thử lại.'`, `.fallback` = `'Có lỗi xảy ra. Vui lòng thử lại.'`, `.sessionMissing` = `'Không còn phiên đăng nhập.'`, `.sessionChanged` = `'Phiên đăng nhập đã thay đổi.'`; `messages.auth.sessionExpired` = `'Phiên đã hết hạn'`. Các task sau thêm khóa vào nhóm riêng của mình.
  - Test infra: `server` (msw `setupServer(...handlers)`), `handlers: RequestHandler[]` (rỗng), `api(path: string): string` (= `${env.apiBase}${path}`), `RespondTo<T>` (copy `$SRC/src/test/msw/respond.ts`), `createTestQueryClient(): QueryClient`, `createQueryWrapper(client: QueryClient)`.

- [ ] **Step 1: Test thất bại.**
  - `env.test.ts`: `requireEnv('X', {})` ném lỗi chứa `X`; `requireEnv('X', { X: 'v' })` trả `'v'`; `requireEnv('X', { X: '' })` ném lỗi; `env.apiBase` bằng `'/api/v1'` khi không đặt `VITE_API_BASE`.
  - `storage-keys.test.ts`: mọi giá trị `STORAGE_KEYS` bắt đầu bằng `${STORAGE_PREFIX}:`; nội dung `public/theme-init.js` (đọc bằng `node:fs`) chứa chuỗi `STORAGE_KEYS.Theme`.
- [ ] **Step 2: Chạy, thấy FAIL** — `npx vitest run src/shared/config`
- [ ] **Step 3: Implement** các file `shared/config`, `shared/i18n`, `src/env.d.ts` (khai báo `ImportMetaEnv` cho hai biến VITE). Port `src/test/{query-client.ts,wrapper.tsx,msw/server.ts,msw/respond.ts}` từ `$SRC`; `api.ts` chỉ còn `api()` (bỏ `signInAs`, sẽ thêm Task 9); `setup.ts` thêm đúng vòng đời MSW như `$SRC/src/test/setup.ts` (`server.listen({ onUnhandledFrame: 'error' })`, `resetHandlers`, `close`).
- [ ] **Step 4: Chạy PASS** — `npm run typecheck && npm test`
- [ ] **Step 5: Commit** `git commit -am "feat: config, messages and test infrastructure"` (sau `git add -A`).

---

### Task 3: Lỗi API và HTTP client factory

**Files:**
- Create: `src/shared/lib/const-enum/index.ts` (port), `src/shared/api/{api-error.ts,error-codes.ts,problem-json.ts,normalize-error.ts,create-http-client.ts,create-http-client.test.ts,errors.test.ts}`

**Interfaces:**
- Consumes: `env`, `messages` (Task 2).
- Produces:
  - `ApiError`, `ApiFieldErrors`, `getErrorMessage(error: unknown, fallback: string): string` (copy nguyên `$SRC/src/shared/api/api-error.ts`).
  - `ApiErrorCode` = `{ Conflict:'conflict', Forbidden:'forbidden', InvalidCredentials:'invalid_credentials', NetworkError:'network_error', NotFound:'not_found', PasswordChangeRequired:'password_change_required', SessionChanged:'session_changed', SessionMissing:'session_missing', WeakPassword:'weak_password' }`; `HttpStatus` = `{ Unauthorized:401, Forbidden:403, NotFound:404, Conflict:409, UnprocessableEntity:422, TooManyRequests:429, InternalServerError:500 }`; cả hai kèm type cùng tên (`ValueOf` từ `const-enum`). Mã domain **không** có ở đây: mỗi entity tự khai báo.
  - `readProblem(data: unknown, status: number): { code: string; detail: string; errors?: ApiFieldErrors }`; `toApiError(error: AxiosError): ApiError`; `readHeader(response: AxiosResponse | undefined, name: string): string | undefined`.
  - `createHttpClient(options?: { baseURL?: string; timeoutMs?: number; install?: (client: AxiosInstance) => void }): AxiosInstance` — mặc định `baseURL = env.apiBase`, `timeoutMs = 20_000`. `install` chạy **trước** khi đăng ký interceptor chuẩn hóa lỗi (interceptor auth phải thấy `AxiosError` gốc). Interceptor chuẩn hóa: lỗi không phải `AxiosError` hoặc là hủy (`axios.isCancel`) giữ nguyên; còn lại `Promise.reject(toApiError(error))`.

- [ ] **Step 1: Port test.** Copy `$SRC/src/shared/api/http.test.ts` thành `errors.test.ts` + `create-http-client.test.ts`, giữ: `422 problem+json thành ApiError đủ trường`, `mất mạng thành ApiError isNetwork`, `phản hồi lỗi không phải problem+json vẫn thành ApiError có detail dự phòng`, `đọc Retry-After trên 429`, `thiếu Retry-After thì undefined`, `huỷ bằng AbortSignal giữ nguyên lỗi huỷ`; **bỏ** cả nhóm "đồng bộ đồng hồ". Thêm test: `install` được gọi trước chuẩn hóa — interceptor đăng ký trong `install` nhận `AxiosError` gốc (`axios.isAxiosError` đúng), còn promise cuối cùng reject bằng `ApiError`; `timeout` mặc định 20000; `baseURL` mặc định bằng `env.apiBase`. Test đổi `import { http }` thành `createHttpClient()`.
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/shared/api`
- [ ] **Step 3: Port code** từ `$SRC/src/shared/api/{api-error,problem-json,normalize-error,error-codes}.ts` với thay đổi: chuỗi tiếng Việt lấy từ `messages.errors.*`; `ApiErrorCode`/`HttpStatus` theo danh sách trên; không còn import `ict-time`.
- [ ] **Step 4: Chạy PASS** — `npm run typecheck && npm run lint && npx vitest run src/shared/api`
- [ ] **Step 5: Commit** `feat: api errors and http client factory`

---

### Task 4: Hợp đồng AuthAdapter và adapter mặc định

**Files:**
- Create: `src/shared/api/auth/{auth-adapter.ts,auth-user.ts,active-adapter.ts,auth.config.ts}`, `src/shared/api/auth/adapters/{default.ts,default.test.ts}`, `src/test/auth/{access-only-adapter.ts,adapter-contract.test.ts}`

**Interfaces:**
- Consumes: `ApiError`, `ApiErrorCode`, `HttpStatus` (Task 3).
- Produces (`auth-user.ts`, `auth-adapter.ts`):
```ts
export interface AuthUser { id: string; username: string; displayName: string; role: string; permissions: readonly string[]; mustChangePassword: boolean }
export interface Credentials { username: string; password: string }
export interface AuthTokens { accessToken: string; refreshToken?: string }
export interface ChangePasswordInput { currentPassword: string; newPassword: string }
export interface AuthAdapter {
  refreshSupported: boolean
  unauthenticatedPaths: readonly string[]
  login(client: AxiosInstance, credentials: Credentials): Promise<AuthTokens>
  refresh(client: AxiosInstance, refreshToken: string): Promise<AuthTokens>
  logout(client: AxiosInstance, refreshToken: string | null): Promise<void>
  changePassword(client: AxiosInstance, input: ChangePasswordInput): Promise<void>
  fetchCurrentUser(client: AxiosInstance, signal?: AbortSignal): Promise<AuthUser>
  isRefreshTokenSpent(error: ApiError): boolean
  forbiddenRequiresPasswordChange(error: ApiError): boolean
}
```
  Cùng file khai báo `declare module 'axios' { interface AxiosRequestConfig { skipAuthRefresh?: boolean }; interface InternalAxiosRequestConfig { _retry?: boolean } }`.
  - `getAuthAdapter(): AuthAdapter` và `setAuthAdapterForTest(adapter: AuthAdapter | null): void` (`active-adapter.ts`; `null` trả về adapter của `auth.config.ts`). `auth.config.ts`: `export const authAdapter: AuthAdapter = defaultAdapter` — **đây là file duy nhất dự án mới phải sửa** để đổi backend.
  - `defaultAdapter` (`adapters/default.ts`): `refreshSupported: true`; `unauthenticatedPaths: ['/auth/login', '/auth/refresh']`; `login` POST `/auth/login` `{username,password}` → `{accessToken, refreshToken}`; `refresh` POST `/auth/refresh` `{refreshToken}` → `{accessToken, refreshToken}`; `logout` POST `/auth/logout` `{refreshToken}` với `skipAuthRefresh: true`; `changePassword` POST `/auth/change-password` `{currentPassword,newPassword}`; `fetchCurrentUser` GET `/me` với wire `{id, username, fullName, role:{id,name}, permissions, mustChangePassword}` map thành `AuthUser` (`displayName = fullName`, `role = role.name`); `isRefreshTokenSpent(e)` = `e.status === 401 || e.isNetwork || e.status >= 500`; `forbiddenRequiresPasswordChange(e)` = `e.status === 403 && e.code === ApiErrorCode.PasswordChangeRequired`.
  - `accessOnlyAdapter: AuthAdapter` (`src/test/auth/access-only-adapter.ts`, adapter thử nghiệm khác hợp đồng): `refreshSupported: false`; `unauthenticatedPaths: ['/session/start']`; `login` POST `/session/start` `{email: username, secret: password}` → `{token}` map thành `{accessToken: token}`; `logout` POST `/session/end`; `changePassword` POST `/session/secret`; `fetchCurrentUser` GET `/session/me` wire `{uid, name, roles: string[], perms: string[]}` → `AuthUser` (`mustChangePassword: false`, `role = roles[0]`); `refresh` ném `Error('unsupported')`; `isRefreshTokenSpent` = `true`; `forbiddenRequiresPasswordChange` = `false`.

- [ ] **Step 1: Test thất bại.**
  - `default.test.ts` (client giả `{ post: vi.fn(), get: vi.fn() }` hoặc MSW + `createHttpClient()`): `login` gửi đúng body và trả token; `refresh` gửi `{refreshToken}`; `logout` gửi `{refreshToken}` kèm `skipAuthRefresh: true`; `fetchCurrentUser` map wire `fullName/role.name` thành `displayName/role`; `isRefreshTokenSpent` bảng: 401 → true, `isNetwork` → true, 500 → true, 429 → false, 400 → false; `forbiddenRequiresPasswordChange`: 403+`password_change_required` → true, 403+`forbidden` → false, 401+`password_change_required` → false.
  - `adapter-contract.test.ts` `describe.each([defaultAdapter, accessOnlyAdapter])`: `unauthenticatedPaths` không rỗng; `login` trả `accessToken` là chuỗi không rỗng khi MSW trả thành công; `fetchCurrentUser` trả `AuthUser` đủ 6 trường đúng kiểu.
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/shared/api/auth src/test/auth`
- [ ] **Step 3: Implement** theo chữ ký trên.
- [ ] **Step 4: Chạy PASS + typecheck + lint**
- [ ] **Step 5: Commit** `feat: AuthAdapter contract with default adapter`

---

### Task 5: Primitives phiên (token store, kênh, khóa, sự kiện)

**Files:**
- Create: `src/shared/api/auth/{token-store.ts,token-store.test.ts,auth-channel.ts,refresh-lock.ts,refresh-lock.test.ts,session-events.ts,session-events.test.ts}`

**Interfaces:**
- Consumes: `getAuthAdapter` (Task 4), `STORAGE_KEYS`, `AUTH_CHANNEL`, `REFRESH_LOCK_NAME` (Task 2).
- Produces:
  - `tokenStore` với `setSession(tokens: AuthTokens): void`, `getAccess(): string | null`, `getRefresh(): string | null`, `clear(): void`, `hasSession(): boolean`, `resetMemoryForTest(): void` (xóa biến trong bộ nhớ, không đụng localStorage, mô phỏng reload).
  - Hành vi theo `getAuthAdapter().refreshSupported`: `true` → như `$SRC` (access chỉ ở bộ nhớ, refresh ở `STORAGE_KEYS.Session`); `false` → credential dài hạn là chính access token: `setSession` lưu access token vào `STORAGE_KEYS.Session`, `getAccess()` trả bản bộ nhớ hoặc bản đã lưu, `getRefresh()` trả `null`, `hasSession()` đúng khi có credential đã lưu.
  - `AuthMessage`, `openAuthChannel()`, `postAuthMessage(message)`, `subscribeAuthMessages(listener)`, `awaitRefreshedAccess(sinceMs, timeoutMs)` (port nguyên, thay `nowMs` bằng `Date.now`).
  - `withRefreshLock<T>(task: () => Promise<T>): Promise<T>` (port, `Date.now`, khóa lưu ở `STORAGE_KEYS.SessionLock`).
  - `onSessionExpired(handler)`, `onRemoteSignOut(handler)`, `onPasswordChangeRequired`, `emitPasswordChangeRequired`, `expireSession()`, `broadcastSignOut()` (port nguyên).

- [ ] **Step 1: Port test** từ `$SRC/src/shared/api/auth/`: `token-store.test.ts` (5 test: `access token chỉ ở bộ nhớ, refresh token ở localStorage`, `clear xoá cả hai token`, `localStorage ném lỗi thì không crash và coi như không có phiên`, `ghi refresh token mới thất bại thì không bao giờ trả lại token cũ đã bị thu hồi`, `clear sau khi storage từng lỗi vẫn xoá sạch phiên`), `refresh-lock.test.ts` (4), `session-events.test.ts` (3); đổi khóa sang `STORAGE_KEYS.Session`/`SessionLock`. Thêm vào `token-store.test.ts` với `setAuthAdapterForTest(accessOnlyAdapter)` (reset `null` ở `afterEach`):
  - `adapter không có refresh: sau reload (resetMemoryForTest) phiên vẫn còn và getAccess trả đúng token`: `setSession({accessToken:'a'})`, `resetMemoryForTest()`, `hasSession() === true`, `getAccess() === 'a'`, `getRefresh() === null`.
  - `adapter không có refresh: clear xoá credential đã lưu`.
  - `adapter không có refresh: localStorage ném lỗi thì phiên chỉ còn trong bộ nhớ và không crash`.
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/shared/api/auth`
- [ ] **Step 3: Port code** theo Interfaces; `token-store.ts` đọc `getAuthAdapter()` tại thời điểm gọi (không cache).
- [ ] **Step 4: Chạy PASS + typecheck + lint**
- [ ] **Step 5: Commit** `feat: session primitives (token store, channel, lock, events)`

---

### Task 6: Refresh single-flight, interceptor auth và `http`

**Files:**
- Create: `src/shared/api/auth/{refresh-session.ts,install-auth.ts,index.ts,install-auth.test.ts,refresh-failures.test.ts,refresh-two-tabs.test.ts,auth-contract.test.ts}`, `src/shared/api/{http.ts,index.ts}`

**Interfaces:**
- Consumes: Task 3–5.
- Produces:
  - `refreshSession(): Promise<string>` (single-flight, khóa liên tab; dùng `getAuthAdapter().refresh` và `refreshClient = createHttpClient()` không có interceptor auth; chính sách kết thúc phiên qua `adapter.isRefreshTokenSpent`; lỗi offline dùng `messages.errors.network`; lỗi thiếu/đổi phiên dùng `messages.errors.sessionMissing/sessionChanged`).
  - `installAuth(client: AxiosInstance): void`: gắn Bearer; khi 401 trên đường dẫn **không** thuộc `adapter.unauthenticatedPaths`, chưa `_retry`, không `skipAuthRefresh`, `tokenStore.hasSession()`: nếu `adapter.refreshSupported` thì refresh một lần rồi retry (giữ nhánh "token cũ nhưng phiên đã làm mới → retry không xoay thêm"), nếu **không** hỗ trợ refresh thì `expireSession()` rồi ném lỗi gốc; 403 với `adapter.forbiddenRequiresPasswordChange(error)` thì `emitPasswordChangeRequired()` rồi ném.
  - `http: AxiosInstance = createHttpClient({ install: installAuth })` (`http.ts`).
  - Barrel `src/shared/api/index.ts` export: `http`, `ApiError`, `getErrorMessage`, `ApiErrorCode`, `HttpStatus`, `readProblem`, `tokenStore`, `refreshSession`, `broadcastSignOut`, `expireSession`, `onSessionExpired`, `onRemoteSignOut`, `onPasswordChangeRequired`, `getAuthAdapter`, `setAuthAdapterForTest`, types `AuthAdapter`, `AuthUser`, `AuthTokens`, `Credentials`, `ChangePasswordInput`, `ApiFieldErrors`.

- [ ] **Step 1: Port test** `install-auth.test.ts`, `refresh-failures.test.ts`, `refresh-two-tabs.test.ts` từ `$SRC` giữ nguyên tên và assertion (đổi `/auth/refresh` payload về `{accessToken, refreshToken}`; bỏ test `phản hồi của /auth/refresh cũng cập nhật độ lệch đồng hồ`). Tên cần có: `5 request cùng 401 chỉ refresh đúng 1 lần…`, `refresh_reuse_detected phát onSessionExpired đúng một lần…`, `401 muộn của request gửi bằng token cũ được retry bằng token hiện tại mà không refresh`, `401 ở /auth/login` và `401 ở /auth/refresh` không kích hoạt refresh, `403 password_change_required phát sự kiện đúng một lần và không refresh`, `401 khi không có phiên: không refresh, không phát hết phiên`, `request gắn Bearer từ access token hiện tại`, `refresh bị giới hạn tần suất (429) giữ nguyên phiên`, `đang ngoại tuyến thì không gửi refresh`, `phiên bị xoá (đăng xuất) trong lúc refresh đang bay: token mới KHÔNG được ghi lại`, `hai tab refresh đồng thời`, `hai lần refreshSession trong cùng tab chia sẻ một request`, `tab khác được báo hết phiên khi một tab bị từ chối refresh`.
- [ ] **Step 2: Thêm `auth-contract.test.ts`** `describe.each([defaultAdapter, accessOnlyAdapter])` (dùng `setAuthAdapterForTest`):
  - mọi đường dẫn trong `adapter.unauthenticatedPaths` trả 401 → không refresh, không phát hết phiên;
  - 401 ở đường dẫn thường khi `refreshSupported === true` → refresh đúng 1 lần rồi retry; khi `false` → không gọi refresh, phát `onSessionExpired` đúng một lần, token bị xóa;
  - đăng nhập qua `adapter.login` rồi `adapter.fetchCurrentUser(http)` chạy được với endpoint của adapter, và `adapter.logout(http, tokenStore.getRefresh())` không ném (chứng minh mọi điểm chạm hợp đồng đi qua adapter, không có endpoint hard-code ngoài adapter).
- [ ] **Step 3: Chạy FAIL** — `npx vitest run src/shared/api`
- [ ] **Step 4: Port code** `refresh-session.ts` và `install-auth.ts` từ `$SRC` theo Interfaces. Thay: `nowMs` → `Date.now`; xóa `syncServerClock`/`readHeader('date')`; `UNAUTHENTICATED_PATHS` → `getAuthAdapter().unauthenticatedPaths`; `RefreshResponse` + `refreshClient.post('/auth/refresh')` → `adapter.refresh(refreshClient, current)`; `isRefreshTokenSpent` → `adapter.isRefreshTokenSpent`; kiểm `PasswordChangeRequired` → `adapter.forbiddenRequiresPasswordChange(apiError)`. Vì interceptor auth thấy `AxiosError` gốc (chưa chuẩn hóa), tự dựng `apiError = new ApiError({ status: response.status, ...readProblem(response.data, response.status) })` để hỏi adapter.
- [ ] **Step 5: Chạy PASS + typecheck + lint**
- [ ] **Step 6: Commit** `feat: single-flight refresh, auth interceptor and http client`

---

### Task 7: `shared/lib` (access, form-errors, safe-redirect, hooks, theme)

**Files:**
- Create: `src/shared/lib/access/{access.config.ts,can.ts,can.test.ts,index.ts}`, `src/shared/lib/form-errors/{to-rhf-path.ts,to-rhf-path.test.ts,index.ts}`, `src/shared/lib/safe-redirect/{safe-redirect.ts,safe-redirect.test.ts,index.ts}`, `src/shared/lib/hooks/{use-online-status.ts,use-before-unload.ts,use-leave-confirm.ts,use-media-query.ts,use-debounced-callback.ts,index.ts}` + test cạnh mỗi hook, `src/shared/lib/theme/{theme-store.ts,theme-store.test.ts,index.ts}`

**Interfaces:**
- Produces:
  - `access.config.ts`: `Roles = { Admin: 'admin', Member: 'member' } as const`, `Permissions = { ItemRead: 'item:read', ItemWrite: 'item:write' } as const` (hai hằng số này là điểm dự án mới thay bằng role/permission của mình; các dòng `Permissions.Item*` nằm trong marker `// <example-item>`).
  - `can(user: { permissions: readonly string[] }, permission: string): boolean`, `canAny(user, permissions: readonly string[]): boolean`, `hasRole(user: { role: string }, roles: readonly string[]): boolean`.
  - `toRhfPath(path: string): string`, `safeRedirect(next: string | null, fallback: string): string`, `FORCED_NAVIGATION_STATE = { forcedByApp: true } as const`, `useLeaveConfirm`, `useOnlineStatus`, `useBeforeUnload`, `useMediaQuery`, `useDebouncedCallback`, `getTheme()/setTheme(theme)/useTheme()`, `Theme`.

- [ ] **Step 1: Port test** của `to-rhf-path`, `safe-redirect`, các hook và `theme-store` từ `$SRC` (bỏ `use-now`, `use-today`, `use-auto-grow`, `use-form-draft-sync`, `use-week-team-params`: thuộc nghiệp vụ hoặc chưa cần). Viết test `can.test.ts`: `can` đúng/sai theo permission; `canAny` rỗng → false; `hasRole`. Trong `safe-redirect.test.ts` bắt buộc có (Review Focus 4): `'//evil.com'`, `'https://evil.com'`, `'/\\evil.com'`, `'javascript:alert(1)'`, `null`, `''` đều trả `fallback`; `'/example-items?page=2'` được giữ nguyên.
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/shared/lib`
- [ ] **Step 3: Port code** từ `$SRC/src/shared/lib/{form-errors,safe-redirect,hooks,theme}`; `theme-store` dùng `STORAGE_KEYS.Theme`. `access`: viết mới theo Interfaces (không port `Position`/`Permission` của `$SRC`).
- [ ] **Step 4: Chạy PASS + typecheck + lint**
- [ ] **Step 5: Commit** `feat: shared lib (access, form errors, safe redirect, hooks, theme)`

---

### Task 8: `shared/ui`

**Files:**
- Create: `src/shared/ui/**` (port các thư mục: `button`, `icon-button`, `label`, `field`, `form`, `text-field`, `card`, `badge`, `banner`, `skeleton`, `separator`, `switch`, `select`, `table`, `confirm-dialog`, `toast`, `auth-shell`, `bottom-nav`, `styles`, `index.ts`, `base-ui-guard.test.ts`, `type-utility-guard.test.ts`), `src/app/styles/theme.css` (port)
- Modify: `src/app/styles/index.css`, `src/shared/i18n/messages.vi.ts`

**Interfaces:**
- Produces: barrel `@/shared/ui` export các component trên cùng `toast` (API `toast.info/success/error`), `Toaster`, `mutateWithToast`, `toastApiError(error: unknown, fallback: string): void` (dùng `ApiError`/`getErrorMessage`).
- Không port: `attendance-cell`, `carry-over-card`, `comment-bubble`, `completion-ring`, `deadline-countdown`, `done-toggle`, `rating-badge`, `stat-tabs`, `status-chip`, `subtask-row`, `task-card`, `team-filter`, `week-switcher`, `brand-mark`, `date-picker`, `calendar`, `drawer`, `sheet`, `searchable-select`, `action-menu`, `app-bar`, `avatar`, `progress-bar`, `radio-group`, `tag`, `tabs`.

- [ ] **Step 1: Port test** `base-ui-guard.test.ts`, `type-utility-guard.test.ts` và test cạnh các component được port; chạy thấy FAIL (thiếu code).
- [ ] **Step 2: Port component** từ `$SRC/src/shared/ui/` theo danh sách. Với mỗi file: grep chuỗi tiếng Việt hiển thị và đưa vào `messages.vi.ts` dưới `messages.ui.*`; `auth-shell` hiển thị `APP_NAME` thay logo domain; `theme.css` đổi màu thương hiệu xanh lục của `$SRC` sang bảng màu trung tính của shadcn `neutral` (`components.json` đã `baseColor: neutral`); `index.css` import `theme.css`.
- [ ] **Step 3: Quét domain** — `grep -rniE "police|commune|bcx|công an|báo cáo|nhiệm vụ|chức vụ" src/shared/ui` không có kết quả.
- [ ] **Step 4: Chạy PASS + typecheck + lint + format:check**
- [ ] **Step 5: Commit** `feat: shared ui components`

---

### Task 9: `entities/session`

**Files:**
- Create: `src/entities/session/{index.ts,api/{queries.ts,requests.ts,sign-in.ts,queries.test.ts,requests.test.ts,sign-in.test.ts},model/{landing-path.ts,landing-path.test.ts,use-current-user.ts}}`
- Modify: `src/test/msw/api.ts`

**Interfaces:**
- Consumes: `http`, `tokenStore`, `getAuthAdapter`, `AuthUser`, `Credentials` (Task 6); `can` (Task 7).
- Produces:
  - `type User = AuthUser`.
  - `sessionQueries = { all: () => readonly ['session'], current: () => queryOptions<User> }` (queryKey `['session','current']`, `staleTime` 5 phút, `queryFn: ({signal}) => getCurrentUser(signal)`).
  - `getCurrentUser(signal?: AbortSignal): Promise<User>` = `getAuthAdapter().fetchCurrentUser(http, signal)`.
  - `signIn(credentials: Credentials): Promise<void>` (= `adapter.login` rồi `tokenStore.setSession`); `signInAndLoadUser(queryClient: QueryClient, credentials: Credentials): Promise<void>` (port: `fetchQuery({...current(), staleTime: 0})`, lỗi thì `tokenStore.clear()` rồi ném lại).
  - `landingPathFor(user: User): string`: trả `ROUTES.Settings`; trong marker `// <example-item>`: nếu `can(user, Permissions.ItemRead)` trả `ROUTES.ExampleItems`. Mọi đích trả về phải truy cập được không cần quyền nào chưa có (không tạo vòng).
  - `useCurrentUser(): User | undefined` (`useQuery(sessionQueries.current())`).
  - `signInAs(user?: Partial<AuthUser>): AuthUser` trong `src/test/msw/api.ts`: đặt token giả (`setSession({accessToken:'test-access', refreshToken:'test-refresh'})`) và đăng ký handler MSW cho endpoint `fetchCurrentUser` của adapter mặc định (`GET /me`) trả user tương ứng; kèm `makeUser(overrides?)`, `makeMeDto(overrides?)` ở `src/test/fixtures/user.ts`.

- [ ] **Step 1: Port test** `requests.test.ts` (`GET /me` map thành user; regression `token cũ`: 401 → refresh → retry đúng 1 lần, không phát hết phiên), `queries.test.ts` (`queryKey` bắt đầu bằng `all()`, `staleTime` 5 phút), `sign-in.test.ts` (đăng nhập đúng đặt token; `signInAndLoadUser` lỗi `/me` thì token bị xóa). Viết mới `landing-path.test.ts` (không quyền → `ROUTES.Settings`; có `item:read` → `ROUTES.ExampleItems`). Thêm biến thể `describe.each([defaultAdapter, accessOnlyAdapter])` cho `signInAndLoadUser`: đăng nhập thành công với endpoint riêng của từng adapter và `useCurrentUser`-query trả `displayName` đúng.
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/entities/session`
- [ ] **Step 3: Implement** theo Interfaces; `index.ts` export `sessionQueries`, `getCurrentUser`, `signIn`, `signInAndLoadUser`, `landingPathFor`, `useCurrentUser`, `type User`.
- [ ] **Step 4: Chạy PASS + typecheck + lint**
- [ ] **Step 5: Commit** `feat: session entity`

---

### Task 10: Features (sign-out, change-password, toggle-theme)

**Files:**
- Create: `src/features/sign-out/{index.ts,model/use-sign-out.ts,model/use-sign-out.test.tsx,ui/sign-out-confirm-dialog.tsx}`, `src/features/change-password/{index.ts,api/{requests.ts,requests.test.ts,mutations.ts,mutations.test.tsx},model/{change-password-schema.ts,password-policy.ts,password-policy.test.ts,use-change-password-submit.ts},ui/{change-password-form.tsx,change-password-form.test.tsx}}`, `src/features/toggle-theme/{index.ts,ui/{theme-switch.tsx,theme-switch.test.tsx,theme-toggle-button.tsx,theme-toggle-button.test.tsx}}`
- Modify: `src/shared/i18n/messages.vi.ts` (nhóm `messages.signOut`, `messages.changePassword`, `messages.theme`)

**Interfaces:**
- Consumes: `signInAndLoadUser`, `sessionQueries` (Task 9); `getAuthAdapter`, `tokenStore`, `broadcastSignOut`, `ChangePasswordInput` (Task 4–6); `useTheme` (Task 7); `ui` (Task 8).
- Produces: `useSignOut(): () => Promise<void>` (gọi `adapter.logout(http, tokenStore.getRefresh())` đua với chờ `SERVER_LOGOUT_WAIT_MS = 4000`, chỉ khi `tokenStore.hasSession()`, lỗi bị nuốt; sau đó `tokenStore.clear()`, `queryClient.clear()`, `broadcastSignOut()`; bỏ phần nháp/`session-tasks` của `$SRC`); `SignOutConfirmDialog`; `changePassword(input: ChangePasswordInput): Promise<void>` (= `getAuthAdapter().changePassword(http, input)`); `useChangePasswordSubmit()` (đổi xong thì đăng nhập lại ngầm bằng `signInAndLoadUser` như `$SRC`); `ChangePasswordForm`; `ThemeSwitch`, `ThemeToggleButton`.

- [ ] **Step 1: Port test** từ `$SRC/src/features/*` tương ứng (giữ tên/assertion; bỏ assertion về nháp). `use-sign-out.test.tsx` thêm: `adapter không có refresh vẫn đăng xuất: logout gọi với refreshToken null, token bị xóa`. `requests.test.ts` kiểm `changePassword` đi qua `adapter.changePassword` (chạy với cả hai adapter).
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/features`
- [ ] **Step 3: Port code** từ `$SRC`; thay `signOutOnServer`/`/auth/*` hard-code bằng adapter; chuỗi tiếng Việt vào `messages.*`; `password-policy` giữ luật độ dài/ký tự nếu không gắn nghiệp vụ, ngược lại rút về `minLength: 8` kèm test.
- [ ] **Step 4: Chạy PASS + typecheck + lint**
- [ ] **Step 5: Commit** `feat: sign-out, change-password and theme features`

---

### Task 11: App layer (providers, router, guard, shell) và trang login/not-found

**Files:**
- Create: `src/app/bootstrap/{index.ts,app-providers.tsx,query-client.ts,query-client.test.ts,refresh-session-on-forbidden.ts,refresh-session-on-forbidden.test.ts}`, `src/app/router/{index.ts,create-app-router.ts,routes.tsx,loaders.ts,loaders.test.ts,routes.test.tsx,wire-session-events.ts,wire-session-events.test.tsx,hydrate-fallback.tsx,route-error-boundary.tsx}`, `src/app/layouts/app-shell/{index.ts,app-shell.tsx,app-shell.test.tsx,side-nav-section.tsx,bottom-nav-section.tsx,account-footer-section.tsx}`, `src/app/navigation/{index.ts,nav-items.ts,nav-items.test.ts}`, `src/pages/login/{index.ts,api/mutations.ts,model/{login-form-schema.ts,use-login-submit.ts,describe-sign-in-error.ts},ui/{login-page.tsx,login-form-section.tsx}}` + test cạnh, `src/pages/not-found/{index.ts,ui/not-found-page.tsx}`, `src/test/render.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: Task 6–10.
- Produces:
  - `createQueryClient(): QueryClient` (port: `retry` 1 cho query, 0 cho mutation, `networkMode: 'always'`, refetch khi focus/reconnect; `QueryCache`/`MutationCache.onError` = `createSessionRefresher` thay `createForbiddenRefresher`: `error.status === 403 && error.code === ApiErrorCode.Forbidden` → invalidate `sessionQueries.all()`, tối thiểu 10 giây giữa hai lần, dùng `Date.now`).
  - `RouteRequires = { roles?: readonly string[]; anyPermission?: readonly string[] }` (cả hai có thì phải thỏa cả hai).
  - `createLoaders(queryClient)` → `{ sessionLoader, homeLoader, guard(requires: RouteRequires), loginLoader, changePasswordLoader }`; thứ tự kiểm: có phiên (không có thì redirect `ROUTES.Login` kèm `?next=` trừ khi đích là Home) → `mustChangePassword` (redirect `ROUTES.ChangePassword`) → `requires` (thất bại redirect `landingPathFor(user)`); `getUser` trả `null` khi không có phiên hoặc API trả 401, các lỗi khác (mạng, 5xx) được ném để hiện `RouteErrorBoundary`; `homeLoader` redirect tới `landingPathFor(user)`; `loginLoader` đã đăng nhập thì redirect `safeRedirect(next, landingPathFor(user))`.
  - `createRoutes({ queryClient }): RouteObject[]` (mỗi route lazy-load, `hydrateFallbackElement`, `errorElement: <RouteErrorBoundary />`; cây: `/login`, `/change-password`, `/` (loader `sessionLoader`, `AppShell`, con: index → `homeLoader`, `*` → NotFound)). Các task sau thêm route con vào đúng chỗ này.
  - `createAppRouter({ queryClient })` (`createBrowserRouter(..., { basename: import.meta.env.BASE_URL })`); `wireSessionEvents(router: DataRouter, queryClient: QueryClient): () => void` (toast `messages.auth.sessionExpired`, `FORCED_NAVIGATION_STATE`).
  - `NavItem = { id: string; label: string; to: string; icon: ComponentType; visibleFor?: (user: User) => boolean }`, `navItemsFor(user: User): NavItem[]` (ban đầu chỉ có Settings; item `ExampleItems` thêm ở Task 13 trong marker).
  - `AppShell` (sidebar từ `md` trở lên, bottom nav bên dưới `md`, footer tài khoản hiện `displayName`, `ThemeToggleButton`, nút đăng xuất qua `useSignOut` + `SignOutConfirmDialog`); không port `rail-nav-section`, badge, push.
  - `renderRoute(path: string, options?: { user?: User | null; handlers?: RequestHandler[]; setup?: () => void }): { router: DataRouter; queryClient: QueryClient; user: UserEvent }` (`user === undefined` → đăng nhập bằng user mặc định, `null` → chưa đăng nhập).

- [ ] **Step 1: Port test** từ `$SRC/src/app/`: `query-client.test.ts`, `refresh-me-on-forbidden.test.ts` (đổi tên theo `createSessionRefresher`), `wire-session-events.test.tsx`, `app-shell.test.tsx` (bỏ phần badge/push), `loaders.test.ts` (chỉ các ca còn nghĩa: guard thiếu quyền → redirect `landingPathFor`, đổi mật khẩu được kiểm trước quyền); `$SRC/src/pages/login/**` test và `describe-sign-in-error.test.ts`.
- [ ] **Step 2: Viết thêm test** `loaders.test.ts`/`routes.test.tsx`:
  - chưa đăng nhập vào `/example-nonexistent` → redirect `/login?next=%2Fexample-nonexistent`; vào `/` → `/login` (không `next`);
  - có refresh token nhưng `/me` trả 5xx hoặc mất mạng → `RouteErrorBoundary` hiện, **không** bị đẩy về login;
  - `/login?next=//evil.com` khi đã đăng nhập → vào `landingPathFor`, không rời origin;
  - `mustChangePassword: true` vào `/` → `/change-password`;
  - **không vòng redirect**: với `guard({ anyPermission: ['nobody:has'] })` và hai user (không quyền / `item:read`), `redirect` trỏ tới `landingPathFor(user)` và đích đó qua được loader của chính nó (chạy loader của route đích, không redirect tiếp);
  - `wireSessionEvents`: `onSessionExpired` → xóa cache, về `/login?next=…`; `onPasswordChangeRequired` → set `mustChangePassword` trong cache `/me` rồi tới `/change-password`.
- [ ] **Step 3: Chạy FAIL** — `npx vitest run src/app src/pages`
- [ ] **Step 4: Port code** theo Interfaces. `main.tsx`: `StrictMode` → `AppProviders` → `RouterProvider` + `Toaster` (bỏ `ServiceWorkerUpdateNotifier` và `createDraftStorage`). Chuỗi tiếng Việt (error boundary, hydrate fallback, shell, login, not-found) vào `messages.routeError`, `messages.shell`, `messages.login`, `messages.notFound`. `describe-sign-in-error` dùng `ApiErrorCode.InvalidCredentials` + 429 `retryAfterSeconds`.
- [ ] **Step 5: Chạy PASS** — `npm run typecheck && npm run lint && npm test && npm run build`
- [ ] **Step 6: Commit** `feat: app layer, guards, shell and login page`

---

### Task 12: Trang change-password và settings

**Files:**
- Create: `src/pages/change-password/{index.ts,ui/change-password-page.tsx,ui/change-password-page.test.tsx}`, `src/pages/settings/{index.ts,ui/{settings-page.tsx,settings-page.test.tsx,profile-section.tsx,profile-section.test.tsx,account-section.tsx,appearance-section.tsx,password-section.tsx}}`
- Modify: `src/app/router/routes.tsx` (thêm hai route), `src/app/navigation/nav-items.ts` (item Settings), `src/shared/i18n/messages.vi.ts` (nhóm `messages.settings`)

**Interfaces:**
- Consumes: `ChangePasswordForm`, `ThemeSwitch`, `useSignOut`/`SignOutConfirmDialog` (Task 10), `useCurrentUser` (Task 9).
- Produces: `ChangePasswordPage`, `SettingsPage` (các section: hồ sơ hiển thị `displayName`/`username`/`role`; giao diện (theme); mật khẩu (liên kết tới `ROUTES.ChangePassword`); tài khoản (đăng xuất)). Route `/change-password` dùng `changePasswordLoader`; route `/settings` nằm dưới `AppShell`, **không có** `requires` (đích hạ cánh an toàn của `landingPathFor`).

- [ ] **Step 1: Port test** `change-password-page.test.tsx`, `settings-page.test.tsx`, `profile-section.test.tsx` từ `$SRC` (bỏ `reminders-section`, `leave-link-section`, push). Thêm test đi qua route: người dùng `mustChangePassword` đổi mật khẩu thành công thì tới `landingPathFor`; đổi sai mật khẩu hiện lỗi từ server dưới đúng field (`toRhfPath`).
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/pages`
- [ ] **Step 3: Port code** từ `$SRC`; bỏ section nhắc việc/nghỉ phép; `profile-section` không có chức vụ/tổ.
- [ ] **Step 4: Chạy PASS + typecheck + lint + build**
- [ ] **Step 5: Commit** `feat: change-password and settings pages`

---

### Task 13: Feature mẫu `example-item`

**Files:**
- Create: `src/entities/example-item/{index.ts,api/{dto.ts,mappers.ts,mappers.test.ts,requests.ts,requests.test.ts,queries.ts},model/example-item.ts}`, `src/pages/example-items/{index.ts,api/{mutations.ts,mutations.test.tsx},model/example-item-form-schema.ts,ui/{example-items-page.tsx,example-items-page.test.tsx,example-item-form-dialog.tsx}}`, `src/test/msw/example-items.ts`
- Modify: `src/app/router/routes.tsx`, `src/app/navigation/nav-items.ts`, `src/test/msw/handlers.ts`, `src/shared/i18n/messages.vi.ts` (nhóm `messages.exampleItems`)
- Mọi đoạn thêm vào file dùng chung (routes, nav, handlers, messages, `ROUTES`, `Permissions`, `landingPathFor`) bọc trong marker `// <example-item>` … `// </example-item>` (ở JSON/CSS dùng cùng ký hiệu nếu có; thực tế chỉ file `.ts`/`.tsx`).

**Interfaces:**
- Produces:
  - `ExampleItem = { id: string; name: string; description: string; createdAt: string }`; `ExampleItemInput = { name: string; description: string }`.
  - `exampleItemQueries = { all: () => readonly ['example-items'], list: () => queryOptions<ExampleItem[]> }`; `listExampleItems(signal?)`, `createExampleItem(input)`, `updateExampleItem(id, input)`, `deleteExampleItem(id)` (endpoint `/example-items[/:id]`; wire DTO `{id, name, description, created_at}` chỉ ở `api/dto.ts`, map trong `mappers.ts`).
  - `ExampleItemsPage`; route `/example-items` với `loaders.guard({ anyPermission: [Permissions.ItemRead] })`; item nav `ExampleItems` với `visibleFor: (u) => can(u, Permissions.ItemRead)`; nút tạo/sửa/xóa chỉ khi `can(u, Permissions.ItemWrite)`.
  - Schema form (zod): `name` bắt buộc, tối đa 100 ký tự; `description` tối đa 500.
  - Handlers MSW in-memory (`resetExampleItems()` gọi trong `afterEach`).

- [ ] **Step 1: Viết test thất bại.**
  - `mappers.test.ts`: `created_at` → `createdAt`.
  - `requests.test.ts`: list/create/update/delete gọi đúng method + URL + body.
  - `example-items-page.test.tsx` (qua `renderRoute('/example-items')`): hiện skeleton rồi danh sách; trạng thái rỗng; lỗi tải có nút thử lại; tạo mới thành công (toast + dòng mới); sửa; xóa qua `ConfirmDialog` và hủy không xóa; 422 `errors` từ server hiện dưới đúng field; user không có `item:write` không thấy nút ghi; user không có `item:read` vào `/example-items` bị chuyển về `ROUTES.Settings` (guard).
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/entities/example-item src/pages/example-items`
- [ ] **Step 3: Implement** theo Interfaces: mutation dùng `mutateWithToast` và `queryClient.invalidateQueries(exampleItemQueries.all())`; form dùng `react-hook-form` + `zodResolver`; DTO chỉ import trong `api/` (luật ESLint). Thêm route con dưới `/` và đổi `homeLoader` không cần sửa (đã dùng `landingPathFor`).
- [ ] **Step 4: Chạy PASS** — `npm run typecheck && npm run lint && npm test && npm run build`
- [ ] **Step 5: Commit** `feat: example-item sample feature`

---

### Task 14: E2E mẫu (Playwright)

**Files:**
- Create: `playwright.config.ts`, `e2e/login.spec.ts`, `e2e/support/mock-api.ts`
- Modify: `tsconfig.json` (include `e2e` đã có từ Task 1), `.gitignore`

**Interfaces:**
- Produces: `mockApi(page: Page): Promise<void>` (đăng ký `page.route('**/api/v1/**')` giả lập `/auth/login`, `/auth/logout`, `/me`, `/example-items` với user có `item:read`).

- [ ] **Step 1: Viết `e2e/login.spec.ts`** gồm hai test: `chưa đăng nhập vào / bị chuyển tới /login` (URL khớp `/login`); `đăng nhập thành công tới danh sách mẫu rồi đăng xuất về /login` (điền form, thấy bảng example-items, mở menu tài khoản, xác nhận đăng xuất, URL `/login`).
- [ ] **Step 2: `playwright.config.ts`**: `webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI }`, `use.baseURL`, một project chromium, `testDir: 'e2e'`. Script `test:e2e` = `playwright test` (đã có).
- [ ] **Step 3: Chạy** — `npx playwright install chromium` (tải binary trình duyệt, báo cho người dùng trước khi chạy nếu phiên cần phê duyệt) rồi `npm run test:e2e`. Expected: 2 passed.
- [ ] **Step 4: Commit** `test: playwright login e2e with mocked api`

---

### Task 15: Docker, nginx (CSP) và CI

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `deploy/nginx.conf`, `.github/workflows/ci.yml`, `.github/workflows/publish-image.yml`, `src/test/deploy-config.test.ts`

**Interfaces:**
- Produces: image nginx-unprivileged cổng 8080, `/healthz` trả `ok`, build-arg duy nhất `VITE_API_BASE` (rỗng → client dùng `/api/v1`).

- [ ] **Step 1: Test thất bại** `deploy-config.test.ts` (đọc file bằng `node:fs`): `nginx.conf` chứa `Content-Security-Policy` với đúng các chỉ thị `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`; có `location = /healthz`; có `location /api/` trả 404; `Dockerfile` không chứa `VITE_DEV_API_TARGET` và không chứa `VITE_UNIT_NAME`; `ci.yml` không chứa `branches: ['develop']` và có đủ các bước typecheck, lint, format:check, test, build; `index.html` không chứa thẻ `<script>` inline (mọi `<script>` đều có `src`).
- [ ] **Step 2: Chạy FAIL** — `npx vitest run src/test/deploy-config.test.ts`
- [ ] **Step 3: Port** `Dockerfile`, `.dockerignore`, `deploy/nginx.conf`, `ci.yml` từ `$SRC` với thay đổi: Dockerfile bỏ `VITE_UNIT_NAME`, `VITE_DEV_API_TARGET`, `verify:pwa`, ghi `.env` chỉ từ `VITE_API_BASE`; nginx bỏ cấu hình `sw.js`/`manifest.webmanifest`, thêm header CSP ở mọi location có `add_header` (nhắc: `add_header` trong `location` ghi đè header cấp server nên lặp lại `X-Content-Type-Options` và CSP ở từng location); `ci.yml`: `on: push: branches: [main]` và `pull_request:` (không lọc nhánh), bỏ bước `test:tz` và `verify-pwa`, chèn comment "đổi nhánh kích hoạt ở đây". `publish-image.yml`: kích hoạt khi push tag `v*`, build và push lên `ghcr.io/${{ github.repository }}` bằng `GITHUB_TOKEN` (`permissions: packages: write`), không runner tự host, không secret ngoài `GITHUB_TOKEN`.
- [ ] **Step 4: Chạy PASS** — `npx vitest run src/test/deploy-config.test.ts`
- [ ] **Step 5: Xác minh container** (docker có sẵn): `docker build -t react-boilerplate-test .` rồi `docker run -d --rm -p 18080:8080 --name rb-test react-boilerplate-test`, `curl -fsS localhost:18080/healthz` Expected `ok`; `curl -sI localhost:18080/ | grep -i content-security-policy` có kết quả; `curl -s -o /dev/null -w '%{http_code}' localhost:18080/api/x` Expected `404`; `curl -s -o /dev/null -w '%{http_code}' localhost:18080/deep/link` Expected `200`; rồi `docker stop rb-test`.
- [ ] **Step 6: Commit** `ci: docker, nginx with CSP and workflows`

---

### Task 16: Tài liệu, quét domain, kiểm tra xóa example, xác minh cuối

**Files:**
- Create: `README.md`, `CLAUDE.md`, `docs/code-conventions.md`, `docs/decisions/{0001-feature-sliced-design.md,0002-auth-contract-and-token-storage.md,0003-data-router.md}`, `docs/removing-example-item.md`, `scripts/{remove-example.mjs,verify-example-removal.mjs}`, `src/test/no-domain-traces.test.ts`

**Interfaces:**
- Produces: `node scripts/remove-example.mjs [rootDir]` xóa các thư mục/file `src/entities/example-item`, `src/pages/example-items`, `src/test/msw/example-items.ts` và mọi đoạn nằm giữa marker `// <example-item>` … `// </example-item>` trong `src/`; `node scripts/verify-example-removal.mjs` sao chép repo (bỏ `node_modules`, `.git`, symlink `node_modules` từ bản gốc) vào thư mục tạm, chạy `remove-example`, rồi `npm run typecheck && npm run lint && npm test && npm run build` ở đó, exit 0 khi tất cả xanh.

- [ ] **Step 1: Test thất bại** `no-domain-traces.test.ts`: duyệt mọi file text trong repo (bỏ `node_modules`, `dist`, `.git`, `docs/superpowers`, `package-lock.json`, chính file test này) và khẳng định không file nào khớp `/police|commune|\bbcx\b|Công an|ict-time|VITE_UNIT_NAME|báo cáo ngày/i`.
- [ ] **Step 2: Chạy** `npx vitest run src/test/no-domain-traces.test.ts`; sửa mọi dấu vết còn sót ở các task trước đến khi PASS.
- [ ] **Step 3: Viết `scripts/*` và chạy** `node scripts/verify-example-removal.mjs`. Expected: exit 0 (Review Focus 5). Nếu thất bại, sửa marker còn thiếu ở các file dùng chung rồi chạy lại.
- [ ] **Step 4: Viết tài liệu.**
  - `README.md`: khởi tạo từ template (`Use this template` hoặc `npx degit`), script, cấu trúc FSD, thêm slice mới, đổi `Roles`/`Permissions` (`access.config.ts`), **đổi backend bằng cách viết lại adapter và `auth.config.ts`** kèm giới hạn (OIDC/redirect, session cookie, refresh token httpOnly phải thay cả module auth), xóa `example-item` (trỏ tới `docs/removing-example-item.md`), triển khai Docker/CI, đổi `STORAGE_PREFIX` đồng thời với `public/theme-init.js` (test canh sự đồng bộ), nhắc bật "Template repository" trong GitHub settings.
  - ADR-0001 FSD (không `widgets`, lý do, cách ép bằng Steiger + ESLint); ADR-0002 hợp đồng auth và token (access in-memory, refresh localStorage, đánh đổi XSS, CSP bắt buộc, chính sách xoay token/`isRefreshTokenSpent`, adapter); ADR-0003 data router. Đánh số liền mạch.
  - `docs/code-conventions.md` rút gọn từ `$SRC/docs/10-code-conventions.md` bỏ phần domain; `CLAUDE.md` ngắn (kiến trúc, lệnh, quy ước import, nơi đặt chuỗi UI, quy tắc `example-item`).
- [ ] **Step 5: Xác minh cuối trên bản sạch**
  Run: `rm -rf node_modules && npm ci && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
  Expected: tất cả exit 0; `git status` sạch sau `npm run format` không tạo thay đổi.
- [ ] **Step 6: Commit** `docs: readme, ADRs, example removal script and domain scan`
