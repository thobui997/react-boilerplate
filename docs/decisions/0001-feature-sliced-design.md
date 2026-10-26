# ADR-0001: Feature-Sliced Design, không có layer `widgets`

Trạng thái: Đã chấp nhận

## Bối cảnh

Template dùng lại cho nhiều dự án SPA. Không có quy ước cấu trúc thì mỗi dự án tự chia thư mục, import chéo tùy ý, và
thay đổi một màn hình kéo theo nhiều nơi khác. Cần một cấu trúc có sẵn tài liệu bên ngoài, ép được bằng công cụ.

## Quyết định

Dùng Feature-Sliced Design với năm layer: `app`, `pages`, `features`, `entities`, `shared`.

- Import một chiều từ trên xuống (`app → pages → features → entities → shared`); không import chéo giữa hai slice cùng
  layer.
- Mỗi slice có `index.ts` là public API; bên ngoài chỉ import qua đó.
- `entities` và `features` tách `api/` (dto, mappers, requests, queries, mutations) và `model/` (kiểu miền, schema,
  hook); UI (nếu có) ở `ui/`.
- **Pages First**: code bắt đầu ở page dùng nó; chỉ tách lên `entities/` (đọc dữ liệu dùng chung) hoặc
  `features/<verb>-<noun>` (thao tác ghi dùng chung) khi có consumer thứ hai.
- **Không có `widgets`.** Khung trang (`AppShell`) nằm ở `app/layouts`, bảng mục menu ở `app/navigation`. Một khối UI
  ghép nhiều slice mà chỉ một trang dùng thì nằm trong trang đó. Thêm `widgets` làm tăng một tầng phải cân nhắc mỗi lần
  đặt file mà các SPA cỡ này hiếm khi cần.

## Cách ép

- **Steiger** (`steiger ./src`, chạy trong `npm run lint`) với `fsd.configs.recommended`
  (`@feature-sliced/steiger-plugin`): thứ tự layer, import chéo slice, import xuyên public API, slice không đáng tách
  (`fsd/insignificant-slice`). Ngoại lệ khai báo trong `steiger.config.ts`, kèm lý do (ví dụ `entities/example-item`
  cố ý tách để làm mẫu).
- **ESLint** (`eslint.config.js`): `no-restricted-imports` cấm import file DTO (`**/api/dto`, `**/api/**/dto`,
  `**/api/*-dto`) ngoài `api/` của slice sở hữu; `max-lines` 300 để buộc chia nhỏ file.

ESLint không kiểm thứ tự layer; phần đó là của Steiger.

## Hệ quả

- Vị trí của một file suy ra được từ vai trò của nó; review tập trung vào nội dung.
- Một số code lặp nhẹ giữa các trang trước khi có consumer thứ hai: chấp nhận, đổi lại không có trừu tượng sớm.
- Steiger là công cụ còn ở phiên bản 0.x; khi nâng cấp cần đọc lại danh sách luật của `fsd.configs.recommended`.
