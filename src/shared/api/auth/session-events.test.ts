import { AUTH_CHANNEL } from '@/shared/config'
import {
  broadcastSignOut,
  emitPasswordChangeRequired,
  onPasswordChangeRequired,
  onRemoteSignOut,
} from './session-events'
import { tokenStore } from './token-store'

function waitFor<T>(register: (resolve: (value: T) => void) => void): Promise<T> {
  return new Promise((resolve) => register(resolve))
}

test('broadcastSignOut gửi tin signed-out tới các tab khác', async () => {
  const otherTab = new BroadcastChannel(AUTH_CHANNEL)
  const received = waitFor<unknown>((resolve) => {
    otherTab.onmessage = (event) => resolve(event.data)
  })

  broadcastSignOut()

  expect(await received).toMatchObject({ type: 'signed-out' })
  otherTab.close()
})

test('tin signed-out từ tab khác gọi handler và xoá phiên trong bộ nhớ', async () => {
  tokenStore.setSession({ accessToken: 'a', refreshToken: 'r' })
  const otherTab = new BroadcastChannel(AUTH_CHANNEL)
  const handled = waitFor<void>((resolve) => {
    onRemoteSignOut(resolve)
  })

  otherTab.postMessage({ type: 'signed-out' })
  await handled

  expect(tokenStore.getAccess()).toBeNull()
  otherTab.close()
})

test('onPasswordChangeRequired huỷ đăng ký được', () => {
  const handler = vi.fn()
  const unsubscribe = onPasswordChangeRequired(handler)

  emitPasswordChangeRequired()
  unsubscribe()
  emitPasswordChangeRequired()

  expect(handler).toHaveBeenCalledTimes(1)
})
