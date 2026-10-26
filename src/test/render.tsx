import { render } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { QueryClient } from '@tanstack/react-query'
import type { RequestHandler } from 'msw'
import { createMemoryRouter, type DataRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { onTestFinished } from 'vitest'
import { AppProviders } from '@/app/bootstrap'
import { createRoutes, wireSessionEvents } from '@/app/router'
import type { User } from '@/entities/session'
import { tokenStore } from '@/shared/api'
import { signInAs } from './msw/api'
import { server } from './msw/server'
import { createTestQueryClient } from './query-client'

interface RenderRouteOptions {
  // undefined = đăng nhập bằng người dùng mặc định (makeUser()); null = chưa đăng nhập.
  user?: User | null
  handlers?: RequestHandler[]
  // Chạy sau khi dọn localStorage và đặt phiên, trước khi dựng app (gieo dữ liệu, giả lập lỗi storage…).
  setup?: () => void
}

export function renderRoute(
  path: string,
  { user, handlers = [], setup }: RenderRouteOptions = {},
): { router: DataRouter; queryClient: QueryClient; user: UserEvent } {
  localStorage.clear()
  tokenStore.clear()
  if (user !== null) signInAs(user ?? {})
  server.use(...handlers)
  setup?.()

  const queryClient = createTestQueryClient()
  const router = createMemoryRouter(createRoutes({ queryClient }), { initialEntries: [path] })
  onTestFinished(wireSessionEvents(router, queryClient))

  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { router, queryClient, user: userEvent.setup() }
}
