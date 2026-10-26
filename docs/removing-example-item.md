# Gỡ tính năng mẫu `example-item`

`example-item` là một CRUD tối giản (`/example-items`: danh sách, tạo, sửa, xóa) minh họa đủ chuỗi
dto → mapper → request → query → page, kèm test MSW và e2e. Dự án thật nên gỡ nó khi đã có slice của mình.

## Gỡ bằng script

```bash
node scripts/remove-example.mjs          # chạy ở thư mục gốc dự án
# hoặc: node scripts/remove-example.mjs path/to/project
npm run typecheck && npm run lint && npm test && npm run build
git add -A && git commit -m "chore: remove example-item"
```

Script:

1. Kiểm tra marker trong mọi file `.ts/.tsx/.js/.jsx/.mjs` ở `src/`, `e2e/` và `steiger.config.ts`. Marker mở thiếu
   đóng, marker đóng thừa, marker lồng nhau, hay marker không đứng riêng một dòng comment `//` làm script dừng với
   lỗi (kèm file:dòng) **trước khi sửa bất cứ file nào**.
2. Xóa `src/entities/example-item/`, `src/pages/example-items/`, `src/test/msw/example-items.ts`.
3. Cắt mọi đoạn từ dòng `// <example-item>` đến dòng `// </example-item>` (gồm cả hai dòng marker).
4. Chạy Prettier của repo trên các file vừa sửa (cắt xong có thể còn `{\n}` hay `[\n]` thừa dòng).
5. In ra từng thứ đã xóa và từng file đã cắt (số khối, khoảng dòng).

Chạy lần hai không làm gì ("Không còn gì của example-item để gỡ").

## Sau khi gỡ

- `Permissions` trong `src/shared/lib/access/access.config.ts` thành `{}` nên kiểu `Permission` là `never`: khai báo
  quyền của dự án vào đây.
- `LANDING_RULES` trong `src/entities/session/model/landing-path.ts` rỗng: sau đăng nhập mọi người về `/settings` cho
  tới khi dự án thêm quy tắc trang đích.
- Menu chỉ còn mục Cài đặt (`NAV_ITEMS` trong `src/app/navigation/nav-items.ts`).
- Fixture `src/test/fixtures/user.ts` vẫn cấp quyền chuỗi `item:read`, `item:write` cho người dùng giả. Vô hại (chuỗi
  trần, không còn ai đọc); thay bằng quyền của dự án khi viết test.
- e2e `e2e/login.spec.ts` vẫn kiểm luồng đăng nhập → đăng xuất, chỉ bỏ bước kiểm bảng mẫu.
- Script **không** sửa tài liệu: tự xóa các nhắc tới `example-item` trong `README.md`, `CLAUDE.md`, `docs/` (kể cả
  file này nếu muốn), và bỏ dòng `verify:example-removal` trong `package.json` cùng `scripts/verify-example-removal.mjs`
  nếu không cần nữa.

## Quy ước marker (khi sửa template)

Mọi dòng ở file dùng chung chỉ phục vụ tính năng mẫu (import, route, mục menu, quyền `Permissions.Item*`, chuỗi
`messages.exampleItems`, handler MSW, test case, quy tắc trang đích, ngoại lệ Steiger) phải nằm giữa hai dòng:

```ts
// <example-item>
import { Permissions } from '@/shared/lib/access'
// </example-item>
```

Marker là comment `//` đứng riêng một dòng (thụt lề tùy ý), không lồng nhau, mỗi marker mở có đúng một marker đóng.
Import chỉ dùng trong khối marker cũng phải nằm trong marker.

Kiểm tra sau khi sửa template:

```bash
npm run verify:example-removal
```

Lệnh này sao chép cây làm việc (bỏ `node_modules`, `.git`, `dist`, `.superpowers`, `test-results`,
`playwright-report`, `coverage`, `tsconfig.tsbuildinfo`) vào một thư mục tạm của hệ điều hành, symlink `node_modules`
từ repo gốc, chạy `remove-example.mjs`, kiểm tra không còn tham chiếu tới example-item trong `src/`, `e2e/`,
`steiger.config.ts`, rồi chạy `npm run typecheck`, `lint`, `format:check`, `npm test`, `npm run build` ở đó. Exit 0
khi tất cả xanh; thư mục tạm luôn bị xóa. Lệnh không chạy e2e và không nằm trong `npm test` hay CI (chạy lâu). Vite/Vitest
ghi cache vào `node_modules/.vite` của repo gốc qua symlink; vô hại.
