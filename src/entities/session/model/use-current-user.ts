import { useQuery } from '@tanstack/react-query'
import { sessionQueries } from '../api/queries'
import type { User } from './user'

export function useCurrentUser(): User | undefined {
  return useQuery(sessionQueries.current()).data
}
