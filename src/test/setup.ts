import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
// <example-item>
import { resetExampleItems } from './msw/example-items'
// </example-item>
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  // <example-item>
  resetExampleItems()
  // </example-item>
})
afterAll(() => server.close())

// Mặc định 1s là quá chặt khi cả bộ test chạy song song trên máy/CI bận: vài test findBy/waitFor đỏ ngẫu nhiên.
// Nới trần chờ; test xanh vẫn xong ngay khi điều kiện đúng.
configure({ asyncUtilTimeout: 4000 })
