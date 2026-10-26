import { queryOptions } from '@tanstack/react-query'
import type { User } from '../model/user'
import { getCurrentUser } from './requests'

const CURRENT_USER_STALE_MS = 5 * 60_000

export const sessionQueries = {
  all: () => ['session'] as const,
  current: () =>
    queryOptions<User>({
      queryKey: [...sessionQueries.all(), 'current'] as const,
      queryFn: ({ signal }) => getCurrentUser(signal),
      staleTime: CURRENT_USER_STALE_MS,
    }),
}
