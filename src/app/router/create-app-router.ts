import type { QueryClient } from '@tanstack/react-query'
import { createBrowserRouter } from 'react-router'
import { createRoutes } from './routes'

export function createAppRouter(deps: { queryClient: QueryClient }) {
  return createBrowserRouter(createRoutes(deps), { basename: import.meta.env.BASE_URL })
}
