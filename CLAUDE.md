# CLAUDE.md

SPA React (Vite, React 19, TypeScript strict, React Router 7 data router, TanStack Query, axios, react-hook-form + zod)
tạo từ template. Tài liệu tiếng Việt, định danh trong code tiếng Anh. Chi tiết: `README.md`,
`docs/code-conventions.md`, `docs/decisions/`.

## Lệnh

`npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` (ESLint + Steiger) · `npm run format` /
`format:check` · `npm test` · `npm run test:e2e` (Playwright, API giả) · `npm run verify:example-removal`.
Sau khi sửa code: `npm run typecheck && npm run lint && npm run format:check && npm test`.

## Kiến trúc

- Feature-Sliced Design: `app → pages → features → entities → shared`, import một chiều, không import chéo slice cùng
  layer, **không có `widgets`** (khung ở `app/layouts`, menu ở `app/navigation`). Steiger ép layer; ESLint ép
  `max-lines` 300, `exhaustive-deps` và cấm import DTO.
- Pages First: code ở page cho tới khi có consumer thứ hai, rồi mới tách `entities/<noun>` (đọc) hoặc
  `features/<verb>-<noun>` (ghi).
- Slice: `api/` (`dto.ts` không xuất, `mappers.ts`, `requests.ts`, `queries.ts` với `queryOptions`, `mutations.ts`),
  `model/` (kiểu miền, schema zod, hook), `ui/`, `index.ts` là public API. `entities/` không có `useMutation`.
- Auth: cơ chế ở `src/shared/api/auth/` (không sửa theo backend); hợp đồng backend chỉ qua `AuthAdapter`
  (`auth-adapter.ts`, chọn trong `auth.config.ts`, mặc định `adapters/default.ts`). Code ngoài auth gọi
  `getAuthAdapter()`, không hard-code endpoint auth.
- Guard là loader (`src/app/router/loaders.ts`): phiên → đổi mật khẩu → quyền (`loaders.guard({ roles, anyPermission })`).
  Loader không tải dữ liệu trang. Đích của `landingPathFor` không được cần quyền người dùng chưa có.
- `shared/api` không import `app`: phát sự kiện, `app/router/wire-session-events.ts` điều hướng.
- Quyền: `Roles`/`Permissions` ở `src/shared/lib/access/access.config.ts`; kiểm bằng `can`/`canAny`/`hasRole`.

## Quy ước

- Import qua alias `@/` và qua `index.ts` của slice; trong cùng slice dùng đường dẫn tương đối.
- Mọi chuỗi UI dùng chung ở `src/shared/i18n/messages.vi.ts` (nhóm theo slice/trang), import `messages` từ
  `@/shared/i18n`. Không thư viện i18n.
- Hằng thay chuỗi trần: `ROUTES`, `STORAGE_KEYS` (`shared/config`), `ApiErrorCode`/`HttpStatus`
  (`shared/api/error-codes.ts`), `Permissions`. Enum là object `as const` + `ValueOf`.
- UI là HTML ngữ nghĩa thuần, không class/style; không có `shared/ui`. Thông báo qua `notify`
  (`@/shared/lib/notify`), xác nhận nguy hiểm bằng `window.confirm`.
- `useEffect` chỉ để đồng bộ với hệ thống ngoài React, gói trong hook có tên ở `shared/lib/hooks`.
- Test cạnh code (`*.test.ts[x]`), MSW ở `src/test/msw`, trang test bằng `renderRoute` (`src/test/render.tsx`).
- `STORAGE_PREFIX` đổi thì sửa cả `public/theme-init.js` (có test canh). CSP trong `deploy/nginx.conf` có test canh
  (`src/test/deploy-config.test.ts`).
- Không để từ khóa nghiệp vụ của dự án nguồn trong repo: `src/test/no-domain-traces.test.ts` quét mọi file.
- Không sửa `docs/superpowers/` và `.superpowers/`.

## Quy tắc `example-item`

Tính năng mẫu nằm ở `src/entities/example-item`, `src/pages/example-items`, `src/test/msw/example-items.ts`. Mọi dòng
ở file dùng chung chỉ phục vụ nó (import, route, mục menu, `Permissions.Item*`, `messages.exampleItems`, handler, test
case, ngoại lệ Steiger) phải nằm giữa hai dòng comment riêng `// <example-item>` và `// </example-item>`, không lồng
nhau. Sửa phần đó xong chạy `npm run verify:example-removal`. Gỡ hẳn: `node scripts/remove-example.mjs`
(`docs/removing-example-item.md`).
