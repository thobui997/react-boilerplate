import { sessionQueries } from './queries'

test('sessionQueries.current có khoá dưới all() và staleTime 5 phút', () => {
  const options = sessionQueries.current()

  expect(options.queryKey.slice(0, sessionQueries.all().length)).toEqual(sessionQueries.all())
  expect(options.queryKey).toEqual(['session', 'current'])
  expect(options.staleTime).toBe(5 * 60_000)
})
