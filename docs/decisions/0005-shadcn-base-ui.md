# ADR-0005: shadcn/ui trên Base UI là bộ giao diện mặc định

Trạng thái: Đã chấp nhận

## Bối cảnh

Template hiện dùng HTML ngữ nghĩa thuần, không có `src/shared/ui`, không có thư viện component hay toast. Nhưng
`components.json` đã cấu hình shadcn (`style: base-nova`, icon lucide, alias `@/shared/ui`) và README hướng dẫn thêm UI
sau. Quyết định này đổi mặc định: template kèm sẵn shadcn/ui dựng trên Base UI (`@base-ui/react`), và các trang mẫu
dùng nó.

Không so sánh được dự án mã nguồn mở trên GitHub vì môi trường làm việc không có `gh`. Nguồn tham chiếu là tài liệu và
registry của `shadcn-ui/ui` (định nghĩa `base-nova`: phụ thuộc `@base-ui/react`, `class-variance-authority`,
`lucide-react`, dev `tw-animate-css` và `shadcn`; CSS nhập `tw-animate-css` và `shadcn/tailwind.css`). File sinh ra sau
mỗi lần `add` là nguồn đúng cuối cùng.

## Quyết định

**Cài tay, không chạy `shadcn init`.** `init` ghi đè `src/app/styles/index.css` (thay `@custom-variant dark` bằng
selector `.dark`) và có thể sinh `cn` trùng với `src/shared/lib/cn/`. Thay vào đó:

- Cài gói với bản pin chính xác, như mọi dependency hiện có: `@base-ui/react`, `class-variance-authority`,
  `lucide-react`; dev: `tw-animate-css`, `shadcn`.
- Giữ `components.json` nguyên (`base-nova`). Thêm component bằng `npx shadcn@latest add <tên>` từng cái một, sau mỗi
  lần xem `git diff` của `index.css`, `components.json`, `src/shared/lib`, rồi chạy `npm run format` (code sinh ra
  theo kiểu của shadcn).
- `src/app/styles/index.css`: thêm hai `@import`, token màu ở `:root` và `[data-theme=dark]`. **Dark mode giữ
  `data-theme`**: không đụng `public/theme-init.js`, theme store, `STORAGE_PREFIX` hay test canh chúng. Font dùng font
  hệ thống (CSP chặn font từ CDN).

**Component** ở `src/shared/ui`, chỉ thêm cái trang đang dùng: button, input, label, table, alert-dialog, sonner
(thêm field nếu cần ô có nhãn và lỗi). Import dạng `@/shared/ui/button`, không barrel (đúng như CLI sinh ra; `shared/ui`
là segment, không phải slice có public API). Các điều chỉnh bắt buộc sau khi sinh:

- `sonner.tsx` dùng `useTheme` từ `@/shared/lib/theme`, **không** cài `next-themes`.
- Chữ tiếng Anh sinh sẵn (`Close`, `Cancel`, `Continue`...) chuyển vào nhóm `messages.ui` trong
  `src/shared/i18n/messages.vi.ts` bằng tiếng Việt; component import `messages` từ `@/shared/i18n`. Giữ lớp i18n hiện
  có (danh mục chuỗi một chỗ), không gỡ.
- File giữ dưới 300 dòng (`max-lines`).

**Chuyển trang mẫu** sang component: login, change-password, settings, example-items, not-found, app-shell,
account-bar, nút đổi giao diện, route-error-boundary. **Hợp đồng a11y giữ nguyên** vì test đang kiểm: `role="alert"` +
`aria-invalid` + `aria-describedby` ở lỗi từng ô, `role="status"` ở trạng thái, `aria-pressed` ở nút đổi giao diện
(dùng `Button`, không dùng `Toggle`). Nếu shadcn `FieldError` không tự gắn `role="alert"` thì gắn tường minh.
Sửa test là ngoại lệ và phải nêu lý do.

**Thông báo và xác nhận:**

- `src/main.tsx` gọi `setNotifier` nối với Sonner (thay đoạn comment gợi ý), `<Toaster />` render trong `src/main.tsx`
  (không đặt trong `AppProviders`, để test dựng app bằng `renderRoute` vẫn dùng notifier mặc định). Hợp đồng `notify`
  không đổi.
- `window.confirm` ở `example-items-page` thành `AlertDialog`. `useLeaveConfirm` hiện không có nơi dùng nên không đổi;
  nếu sau này dùng, nhánh `useBlocker` hiện dialog qua `proceed`/`reset`, còn `beforeunload` vẫn là hộp thoại gốc của
  trình duyệt. Test đổi từ `spyOn(window, 'confirm')` sang bấm nút trong dialog; có thể cần polyfill jsdom
  (`ResizeObserver`, `getAnimations`...) trong `src/test/setup.ts`.

**CSP** (`deploy/nginx.conf`): chỉ đổi `style-src 'self'` thành `style-src 'self' 'unsafe-inline'`, ở **cả 4 dòng**
`add_header Content-Security-Policy` và comment đầu file; sửa `CANONICAL_CSP` và test "không có unsafe-inline" trong
`src/test/deploy-config.test.ts`. Không nới `script-src`. Lý do: Base UI và Sonner chèn style inline (vị trí popup,
animation).

## Kế hoạch tài liệu

Sửa theo quyết định này: `CLAUDE.md` (dòng "UI là HTML ngữ nghĩa thuần, không có `shared/ui`" và bảng rule),
`.claude/rules/react-component-design.md` (§3 các ví dụ `PasswordField`/`Field`, §4.5 "Plain semantic HTML"),
`.claude/rules/react-forms.md` nếu còn mẫu `<input>` thô, `docs/code-conventions.md` (dòng 81 và phần ô nhập),
`README.md` (dòng 5, 9 và mục "Thêm UI cho dự án" thành "Dùng và thêm component"), comment đầu `app-shell.tsx`.

## Kiểm chứng

`npm run typecheck && npm run lint && npm run format:check && npm test`, thêm `npm run build` và `npm run verify:example-removal` (bảo đảm code và chuỗi của sample vẫn nằm trong marker).

## Hệ quả

- Thêm component mới: `npx shadcn@latest add <tên>`, rồi `npm run format`, rồi chuyển chữ tiếng Anh sinh sẵn sang
  `messages.ui`.
- `style-src 'unsafe-inline'` là mức bảo vệ thấp hơn trước cho CSS (không ảnh hưởng thực thi script).
- Chuỗi UI của các trang mẫu vẫn lấy từ `messages` như cũ, nên phần lớn test không phải đổi chữ.
- Khi triển khai, `npx shadcn@latest add` còn cài một gói npm tên `cn` (import `from "cn"`), ghi `^` cho gói mới và kéo
  `next-themes` cùng `sonner`. Cách xử lý (đổi import về `@/shared/lib/cn`, gỡ `cn` và `next-themes`, pin lại) nằm ở
  README, mục "Dùng và thêm component".
- Hộp thoại xác nhận dùng lại chữ `Huỷ` của `messages.exampleItems.form.cancel`; nhóm `messages.ui` hiện chỉ có
  `notifications`, nhãn vùng thông báo của Sonner (mặc định tiếng Anh, trình đọc màn hình sẽ đọc "Notifications"); các
  component còn lại không sinh chữ tiếng Anh nào.
