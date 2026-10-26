import type { RequestHandler } from 'msw'

// Handler mặc định cho mọi test; để trống, test tự thêm bằng `server.use(...)`.
export const handlers: RequestHandler[] = []
