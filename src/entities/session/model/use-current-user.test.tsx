import { renderHook, waitFor } from '@testing-library/react'
import { tokenStore } from '@/shared/api'
import { signInAs } from '@/test/msw/api'
import { createTestQueryClient } from '@/test/query-client'
import { createQueryWrapper } from '@/test/wrapper'
import { useCurrentUser } from './use-current-user'

afterEach(() => {
  tokenStore.clear()
})

test('useCurrentUser trả người dùng của phiên hiện tại', async () => {
  const user = signInAs({ displayName: 'Lê Văn Cường' })

  const { result } = renderHook(() => useCurrentUser(), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  })

  expect(result.current).toBeUndefined()
  await waitFor(() => expect(result.current).toEqual(user))
})
