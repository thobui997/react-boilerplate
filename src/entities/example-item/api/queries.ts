import { queryOptions } from '@tanstack/react-query'
import type { ExampleItem } from '../model/example-item'
import { listExampleItems } from './requests'

export const exampleItemQueries = {
  all: () => ['example-items'] as const,
  list: () =>
    queryOptions<ExampleItem[]>({
      queryKey: [...exampleItemQueries.all(), 'list'] as const,
      queryFn: ({ signal }) => listExampleItems(signal),
    }),
}
