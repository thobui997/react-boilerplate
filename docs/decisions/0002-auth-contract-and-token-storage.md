# ADR-0002: Hợp đồng auth (AuthAdapter) và nơi lưu token

Trạng thái: Đã chấp nhận

## Bối cảnh

Mỗi dự án tạo từ template có thể nói chuyện với một backend khác: endpoint, tên trường, có hay không có refresh token,
chính sách xoay token khác nhau. Phần khó và dễ sai của auth phía client (refresh đúng một lần khi nhiều request cùng
gặp 401, phối hợp giữa các tab, không ghi đè phiên đã đăng xuất) thì giống nhau. Cần tách hai phần này để dự án mới
không phải viết lại cơ chế.

## Quyết định

### Tách cơ chế và hợp đồng

- **Cơ chế** (`src/shared/api/auth/`, cố định, có test): interceptor gắn Bearer và retry một lần sau 401
  (`install-auth.ts`), refresh single-flight trong một tab và khóa liên tab (`refresh-session.ts`, `refresh-lock.ts`:
  Web Locks, dự phòng bằng khóa trong localStorage), `BroadcastChannel` báo token mới/đăng xuất cho tab khác
  (`auth-channel.ts`), token store (`token-store.ts`), sự kiện phiên (`session-events.ts`) để `app` điều hướng.
- **Hợp đồng** (đổi theo backend): interface `AuthAdapter` (`auth-adapter.ts`). Adapter đang dùng được chọn trong
  `auth.config.ts`; mặc định là `adapters/default.ts` (Bearer + refresh token xoay vòng, `/auth/login`,
  `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `/me`, lỗi RFC 7807). Adapter cung cấp:
  - `login`, `refresh`, `logout`, `changePassword`, `fetchCurrentUser` (map về `AuthUser` chung);
  - `unauthenticatedPaths`: đường dẫn không gắn Bearer và 401 không kích hoạt refresh;
  - `refreshSupported`: `false` khi backend chỉ có access token;
  - `isRefreshTokenSpent(error)`: chính sách khi refresh thất bại;
  - `forbiddenRequiresPasswordChange(error)`: 403 nào nghĩa là phải đổi mật khẩu.

Test `src/test/auth/adapter-contract.test.ts` chạy cùng bộ kiểm tra cơ chế với adapter mặc định và một adapter thử
nghiệm khác hợp đồng (`src/test/auth/access-only-adapter.ts`: endpoint và trường khác, không refresh token).

### Nơi lưu token

- Access token chỉ ở **bộ nhớ** (biến module). Mất khi tải lại trang; lấy lại bằng refresh.
- Credential dài hạn ở **localStorage** (`STORAGE_KEYS.Session`): refresh token nếu adapter có refresh, ngược lại chính
  access token. Nhờ vậy phiên sống qua lần tải lại và mọi tab cùng thấy một phiên.
- Khi localStorage không ghi được (chế độ riêng tư, đầy), token store giữ bản trong bộ nhớ và xóa bản cũ để không dùng
  lại token đã bị thu hồi.

### Xoay token và `isRefreshTokenSpent`

Backend mặc định xoay refresh token sau mỗi lần dùng và coi việc dùng lại token cũ là dấu hiệu bị đánh cắp (thu hồi mọi
phiên). Vì thế:

- Chỉ một refresh chạy tại một thời điểm trên mọi tab. Trong khóa, client đọc lại refresh token: nếu tab khác vừa xoay
  thì dùng access token tab đó phát qua `BroadcastChannel` thay vì gửi token cũ.
- Sau khi đã gửi refresh token đi, server có thể đã xoay nó dù client không nhận được phản hồi. Adapter quyết định lỗi
  nào nghĩa là token đã tiêu; mặc định 401, lỗi mạng và 5xx kết thúc phiên, còn 429 và 4xx khác giữ phiên. Ngoại tuyến
  trước khi gửi thì giữ phiên.
- Phiên bị đăng xuất hoặc đổi trong lúc refresh đang bay thì không ghi token mới đè lên.

## Đánh đổi

- **XSS đọc được localStorage**, nên một lỗ XSS lấy được refresh token. Cookie `httpOnly` tránh được điều này nhưng
  cơ chế trên cần đọc refresh token từ JS (so sánh trong khóa, phát hiện đăng xuất giữa chừng, `hasSession()`).
  Template chọn cơ chế dùng được với backend Bearer phổ biến và bù bằng:
  - **CSP bắt buộc** trong `deploy/nginx.conf`: `script-src 'self'` không `unsafe-inline`/`unsafe-eval`, script theme
    là file tĩnh `public/theme-init.js`; test `src/test/deploy-config.test.ts` canh CSP. Không gỡ hay nới `script-src`.
  - Access token ngắn hạn chỉ trong bộ nhớ.
- Backend dùng session cookie, refresh token `httpOnly`, hoặc OAuth/OIDC kiểu redirect nằm **ngoài khả năng của
  adapter**: thay cả module `shared/api/auth`. Ranh giới `AuthAdapter`/cơ chế được giữ sạch để việc thay module không
  chạm phần còn lại (trang, guard, `entities/session` chỉ gọi qua `getAuthAdapter()` và `tokenStore`).

## Hệ quả

- Đổi backend Bearer khác thường chỉ cần một file adapter, `auth.config.ts`, và cập nhật test/mock dựng theo hợp đồng
  mặc định (xem README, mục "Đổi backend").
- Thêm method vào `AuthAdapter` chỉ khi một backend thật cần; không đoán trước.
