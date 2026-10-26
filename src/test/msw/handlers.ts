import type { RequestHandler } from 'msw'
// <example-item>
import { exampleItemHandlers } from './example-items'
// </example-item>

// Handler mặc định cho mọi test; test tự thêm bằng `server.use(...)`.
export const handlers: RequestHandler[] = [
  // <example-item>
  ...exampleItemHandlers,
  // </example-item>
]
