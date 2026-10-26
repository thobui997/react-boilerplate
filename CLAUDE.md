# CLAUDE.md

Template SPA React: Vite, React 19, TypeScript strict, React Router 7 (data router), TanStack Query, axios,
react-hook-form + zod. Tài liệu tiếng Việt, định danh trong code tiếng Anh.

## Lệnh

- `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` (ESLint + Steiger) · `npm run format` /
  `npm run format:check` · `npm test` · `npm run test:e2e` (Playwright, API giả) · `npm run verify:example-removal`.
- Sau khi sửa code chạy: `npm run typecheck && npm run lint && npm run format:check && npm test`.

## Kiến trúc

- Layer FSD `app → pages → features → entities → shared`, import một chiều, không import chéo slice cùng layer; không
  có `widgets` (khung ở `src/app/layouts`, menu ở `src/app/navigation`).
- Pages First: code ở page cho tới khi có consumer thứ hai, rồi mới tách `entities/<noun>` hoặc `features/<verb>-<noun>`.
- Slice gồm `api/`, `model/`, `ui/`; chỉ lộ ra qua `index.ts`, import từ ngoài bằng alias `@/`.
- `shared/api` không import `app`: nó phát sự kiện, `src/app/router/wire-session-events.ts` điều hướng.
- Guard là loader (`src/app/router/loaders.ts`), thứ tự phiên → đổi mật khẩu → quyền; loader không tải dữ liệu trang.
  Đích của `landingPathFor` không được cần quyền người dùng chưa có (nếu không sẽ chuyển hướng vòng).
- Quyền khai báo bằng `Roles`/`Permissions` ở `src/shared/lib/access/access.config.ts`, kiểm bằng `can`/`canAny`/`hasRole`.
- Mọi chuỗi UI ở `src/shared/i18n/messages.vi.ts`, import `messages` từ `@/shared/i18n`.
- UI là HTML ngữ nghĩa thuần, không có `shared/ui`; thông báo qua `notify` (`@/shared/lib/notify`).

## Quy tắc nạp tự động

Các file trong `.claude/rules/` chỉ được nạp khi làm việc với file khớp `paths:` ở đầu mỗi file.

| File                         | Nạp khi sửa                                                   | Mục đích                                     |
| ---------------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `component-decomposition.md` | `src/**/*.ts(x)`                                              | Giới hạn 300 dòng, tách theo trách nhiệm     |
| `react-clean-code.md`        | `src/**/*.ts(x)`                                              | Đặt tên, hàm nhỏ, lỗi, test                  |
| `react-component-design.md`  | `src/**/*.tsx`                                                | Số props, composition, HTML thuần            |
| `react-forms.md`             | `src/**/*.ts(x)`                                              | react-hook-form + zod, lỗi 422 theo ô        |
| `react-query-layering.md`    | `src/**/*`                                                    | dto/mapper/request/query, mutation, `notify` |
| `useeffect-discipline.md`    | `src/**/*.ts(x)`                                              | Khi nào được dùng `useEffect`, hook có sẵn   |
| `auth-adapter.md`            | `shared/api`, session, sign-out, change-password, `test/auth` | Cơ chế auth, hợp đồng `AuthAdapter`          |
| `example-item-markers.md`    | `src/`, `e2e/`, `steiger.config.ts`, `scripts/`               | Marker `// <example-item>` và cách gỡ mẫu    |

## Nơi tra cứu

- `README.md`: khởi tạo dự án, biến môi trường, đổi backend, thêm UI, triển khai.
- `docs/code-conventions.md`: quy ước mã nguồn (tiếng Việt, cùng nội dung với các rule).
- `docs/decisions/`: ADR (FSD, hợp đồng auth và lưu token, data router).
- `docs/removing-example-item.md`: gỡ tính năng mẫu và quy ước marker.

## Bảo trì template

- `src/test/no-domain-traces.test.ts` canh không còn từ khóa nghiệp vụ của dự án nguồn (quét cả `.claude/` và file
  này); dự án tạo từ template có thể xóa test đó.
- Không sửa `docs/superpowers/` và `.superpowers/`.
- Đổi `STORAGE_PREFIX` thì sửa cả `public/theme-init.js` (`src/shared/config/storage-keys.test.ts` canh).
- CSP trong `deploy/nginx.conf` được `src/test/deploy-config.test.ts` canh: sửa CSP thì sửa test cùng lúc.
