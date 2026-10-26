# ADR-0003: React Router data router, guard bằng loader

Trạng thái: Đã chấp nhận

## Bối cảnh

App có đăng nhập cần chặn route theo phiên, trạng thái "phải đổi mật khẩu" và quyền, trước khi trang render. Guard
dạng component (`<RequireAuth>`) render xong mới chuyển hướng, gây nháy nội dung và khó test thứ tự kiểm tra.

## Quyết định

- Dùng `createBrowserRouter` của gói `react-router` v7 (`src/app/router/create-app-router.ts`), không dùng
  `react-router-dom`. Router tạo một lần ở phạm vi module trong `src/main.tsx` để code ngoài React (sự kiện hết phiên)
  gọi được `router.navigate`.
- Mỗi trang lazy-load qua `lazy` của route; `hydrateFallbackElement` (`HydrateFallback`) và `errorElement`
  (`RouteErrorBoundary`, có nút "Thử lại" gọi revalidate) khai báo ở route gốc và ở lớp con trong khung để lỗi của
  trang hiện bên trong `AppShell`.
- **Guard là loader** (`src/app/router/loaders.ts`), luôn kiểm theo cùng thứ tự: có phiên → không bị ép đổi mật khẩu
  → đủ quyền (`loaders.guard({ roles, anyPermission })`). Thiếu phiên về `/login?next=...`; phải đổi mật khẩu về
  `/change-password`; thiếu quyền về `landingPathFor(user)`. `/login` và `/change-password` là route riêng ngoài khung
  để không lặp chuyển hướng.
- Loader **chỉ đọc phiên** (`queryClient.ensureQueryData(sessionQueries.current())`), không tải dữ liệu trang. Dữ liệu
  trang do TanStack Query trong component nắm, để cache, làm tươi và trạng thái lỗi/đang tải có một chỗ.
- Lỗi khác 401 khi đọc phiên (mất mạng, 5xx) được ném lên `RouteErrorBoundary` thay vì đẩy người dùng về đăng nhập.
- `shared/api` không import `app`: hết phiên, đăng xuất ở tab khác, 403 bắt đổi mật khẩu phát sự kiện;
  `wireSessionEvents` (`src/app/router/wire-session-events.ts`) đổi sự kiện thành điều hướng và dọn cache.
- `?next=` chỉ nhận đường dẫn tương đối an toàn (`shared/lib/safe-redirect`).

## Bất biến chống vòng

Đích chuyển hướng của một guard không được bị chặn bởi chính điều kiện đang hỏng. Mọi đích của `landingPathFor` phải
vào được mà không cần quyền người dùng chưa có (`/settings` không có guard quyền). Thêm route hoặc quy tắc trang đích
phải giữ bất biến này; `landing-path.test.ts` và `loaders.test.ts` canh.

## Hệ quả

- Guard test được bằng `createMemoryRouter` với cùng bảng route (`src/test/render.tsx`, `renderRoute`).
- Trong Vitest, `react-router` và `react-router/dom` bị nạp thành hai bản (CJS/ESM) nên `vite.config.ts` ép cả hai về
  bản ESM. Kiểm tra lại alias này khi nâng cấp `react-router`.
