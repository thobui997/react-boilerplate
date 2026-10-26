import { installAuth } from './auth/install-auth'
import { createHttpClient } from './create-http-client'

// Client chung của ứng dụng: gắn Bearer và tự refresh khi 401 (interceptor auth chạy trước bộ chuẩn hoá lỗi).
export const http = createHttpClient({ install: installAuth })
