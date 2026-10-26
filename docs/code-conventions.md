# Quy ước mã nguồn

Tài liệu ngắn về cách viết code trong template. Kiến trúc tổng thể: [ADR-0001](decisions/0001-feature-sliced-design.md).
Lint (`npm run lint`) và Prettier (`npm run format:check`) ép phần cơ học; phần còn lại là quy ước khi review.

## 1. Sở hữu slice

| Slice                       | Sở hữu                                                                                                  | Consumer                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `entities/session`          | `getCurrentUser`, `sessionQueries`, `signIn`/`signInAndLoadUser` (hàm, không phải hook), `useCurrentUser`, `landingPathFor`, kiểu `User` | `app/router`, `pages/login`, `pages/settings`, `features/*` |
| `features/sign-out`         | `useSignOut`: gọi `logout` của adapter, xóa phiên và cache, báo tab khác                                  | `app/layouts/app-shell`, `pages/settings`, `pages/change-password` |
| `features/change-password`  | request, mutation, chính sách mật khẩu, schema, `ChangePasswordForm`                                     | `pages/change-password`, `pages/settings`   |
| `features/toggle-theme`     | `ThemeToggleButton`                                                                                     | `pages/settings`                             |
| `entities/example-item` (mẫu) | chỉ đọc: dto, mappers, requests (gồm request ghi), `exampleItemQueries`, kiểu miền                     | `pages/example-items`                        |
| `pages/example-items` (mẫu) | mutation tạo/sửa/xóa, schema form, form và bảng                                                         | —                                            |
| `shared/api`                | `http`, `createHttpClient`, `ApiError`, `getErrorMessage`, RFC 7807, cơ chế auth + `AuthAdapter`         | mọi slice                                    |
| `shared/lib`                | `access`, `notify`, `cn`, `hooks`, `form-errors`, `safe-redirect`, `theme`, `const-enum`                 | mọi slice                                    |

**Thăng hạng:** thao tác ghi dùng ở một trang thì ở lại trang (`pages/<page>/api/mutations.ts`). Khi trang thứ hai
cần, chuyển thành `features/<verb>-<noun>`. Dữ liệu đọc dùng chung chuyển thành `entities/<noun>`. Feature chỉ còn một
consumer thì gộp về consumer đó.

## 2. Data layer (TanStack Query)

- Mỗi slice sở hữu dữ liệu có **một query factory** dùng `queryOptions` (`exampleItemQueries.all()`, `.list()`); gọi
  `useQuery(exampleItemQueries.list())` trực tiếp ở nơi dùng. Không viết query key lẻ.
- `api/dto.ts`: hình dạng dây đúng như backend gửi; **không xuất qua `index.ts`** (ESLint chặn import DTO từ ngoài
  `api/`). `api/mappers.ts` đổi DTO ↔ kiểu miền; `api/requests.ts` gọi `http` và trả kiểu miền. Cache chỉ chứa kiểu
  miền. Kiểu miền đặt ở `model/`.
- `entities/` chỉ đọc: không `useMutation`, không invalidate. Request ghi có thể nằm ở entity, còn `useMutation` ở
  consumer. Ngoại lệ có chủ đích: `entities/session` có `signInAndLoadUser` (hàm thường) dùng chung cho đăng nhập và
  đăng nhập lại sau đổi mật khẩu.
- Mutation: `onSuccess` **trả về** promise invalidation; làm mới bằng invalidation, không `setQueryData` từ body phản
  hồi. Mutation mang mật khẩu đặt `gcTime: 0`.
- Thông báo (`notify`) đặt trong callback của hook mutation (`api/mutations.ts`) hoặc trong `model/use-<verb>-<noun>-submit.ts`;
  không bao giờ trong `requests.ts`/`queries.ts`. Điều hướng ở hook submit hoặc component.
- Đặt tên request/hook theo động từ + danh từ miền (`listExampleItems`, `useCreateExampleItemMutation`), không theo
  đường dẫn backend.
- Không dùng `useEffect` + `fetch` + `useState` cho dữ liệu máy chủ.

## 3. Lỗi

- Mọi lỗi HTTP được chuẩn hóa thành `ApiError` (`status`, `code`, `detail`, `errors`, `isNetwork`). Hiển thị `detail`
  của server nguyên văn; thiếu thì dùng chuỗi dự phòng trong `messages.errors`. `getErrorMessage(error, fallback)` và
  `notifyApiError(error, fallback)` làm việc này.
- 422 có lỗi theo ô: `fieldErrorsFromApi(error.errors)` (`shared/lib/form-errors`) trả `{ path, message }` theo đường
  dẫn react-hook-form; gọi `setError` cho ô tương ứng. Lỗi chung đi qua `notify`.
- So mã lỗi bằng hằng (`ApiErrorCode`, `HttpStatus` trong `shared/api/error-codes.ts`). Mã riêng của một entity do
  entity đó khai báo.
- Lỗi/đang tải/rỗng xử lý tường minh trong UI.

## 4. Form

- `useForm` + `zodResolver(schema)`; schema zod ở `model/` của slice, kiểu form là `z.infer<typeof schema>`.
- Ô nhập dùng `register` với `<label htmlFor>`, `aria-invalid`, `aria-describedby` trỏ tới `<p role="alert">` của lỗi
  (mẫu: `pages/example-items/ui/example-item-form.tsx`).
- Form chia thành nhiều component thì bọc bằng `<FormProvider>` và con dùng `useFormContext()`; không truyền
  `control`/`register` qua props.
- Rời trang khi form còn thay đổi: `useLeaveConfirm`/`useBeforeUnload` (`shared/lib/hooks`).

## 5. Effect

- Chỉ dùng `useEffect` để đồng bộ với hệ thống ngoài React; phải nêu được hệ thống đó bằng một câu. Không dùng Effect
  cho giá trị dẫn xuất, xử lý sự kiện, hay reset form theo prop (dùng `key` hoặc `values` của react-hook-form).
- Effect hợp lệ gói trong hook có tên, có cleanup, an toàn dưới Strict Mode (`useBeforeUnload`,
  `useDebouncedCallback`, `useOnlineStatus`, `useMediaQuery`). Trạng thái ngoài React đọc bằng `useSyncExternalStore`.
- `react-hooks/exhaustive-deps` là `error`; không tắt.
- Lắng nghe sự kiện phiên ở `app` (`wireSessionEvents`), không trong component.

## 6. Component và file

- File kebab-case: `use-<verb>-<noun>.ts`, `<noun>-section.tsx`, `<noun>-form.tsx`, `<noun>-page.tsx`. Component
  PascalCase, một component mỗi file (trừ helper nhỏ riêng tư).
- `max-lines` 300 cho mọi `.ts/.tsx`: vượt thì tách theo trách nhiệm (container nối hook với section).
- ≤ 6 props, props gõ kiểu, giá trị mặc định bằng tham số; không truyền prop quá hai tầng; không cờ boolean đổi hành
  vi (tách component).
- Trong component: hook → giá trị dẫn xuất → handler → JSX. Handler tên `handle<Event>`, prop callback `on<Event>`;
  boolean đọc như câu hỏi (`isPending`, `canEdit`).
- UI của template là HTML ngữ nghĩa thuần, không class Tailwind hay style; dự án thêm thư viện UI theo README.

## 7. Hằng, chuỗi và quyền

- Tập giá trị cố định là object `as const` + kiểu sinh bằng `ValueOf` (`shared/lib/const-enum`):
  `export const Theme = {...} as const; export type Theme = ValueOf<typeof Theme>`. Tham chiếu bằng hằng
  (`ROUTES.Login`, `Permissions.X`, `HttpStatus.Forbidden`), không so chuỗi trần. Test và fixture được ghi literal để
  ghim giá trị.
- Nơi đặt: đường dẫn trang (`ROUTES`), khóa lưu trữ (`STORAGE_KEYS`), `AUTH_CHANNEL`, `REFRESH_LOCK_NAME` ở
  `shared/config`; `Roles`/`Permissions` ở `shared/lib/access/access.config.ts`; mã lỗi ở `shared/api/error-codes.ts`.
- Đường dẫn, khóa lưu trữ, tên kênh là hợp đồng với dữ liệu ở trình duyệt và liên kết đã chia sẻ: đổi sau khi triển
  khai làm mất phiên/link cũ.
- Mọi chuỗi UI dùng chung ở `src/shared/i18n/messages.vi.ts`, mỗi slice/trang một nhóm khóa. Không dùng thư viện i18n.
- Quyền chức năng quyết bằng `can`/`canAny` (`shared/lib/access`), không so tên role. `can` chỉ là gợi ý giao diện;
  guard route mới chặn, backend là thẩm quyền cuối. `AuthUser.permissions` giữ mã lạ nguyên văn.

## 8. Clean code và test

- Comment giải thích _vì sao_ (ràng buộc, quirk của backend/trình duyệt), không giải thích _cái gì_. Không code bị
  comment, không code chết; `TODO` kèm người phụ trách hoặc ticket.
- Không số/chuỗi "ma thuật"; `switch` trên hằng phải cạn kiệt.
- Bọc thư viện bên thứ ba sau lớp mỏng (axios → `shared/api`, toast → `notify`).
- Test đặt cạnh code (`*.test.ts[x]`), kiểm hành vi người dùng thấy; API giả bằng MSW (`src/test/msw`), trang test bằng
  `renderRoute` (`src/test/render.tsx`). Hạ tầng test chung ở `src/test/`.
- Refactor commit riêng với tính năng. Trước khi commit: `npm run typecheck && npm run lint && npm run format:check &&
npm test`.

## 9. Checklist trước khi commit

- [ ] Một query factory mỗi slice; không `useMutation`/invalidate trong `entities/`; `onSuccess` trả promise
- [ ] DTO không xuất qua `index.ts`; cache chứa kiểu miền
- [ ] Không `notify`/điều hướng trong `requests.ts`/`queries.ts`
- [ ] Mỗi Effect đồng bộ với hệ thống ngoài React, có tên và cleanup
- [ ] Schema zod ở `model/`, kiểu form từ `z.infer`
- [ ] File ≤ 300 dòng, ≤ 6 props, không cờ boolean đổi hành vi
- [ ] Chuỗi UI trong `messages.vi.ts`; hằng thay cho chuỗi trần
- [ ] Code của `example-item` (nếu còn) nằm trong marker `// <example-item>` (xem
      [removing-example-item.md](removing-example-item.md))
