import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http as mswHttp, HttpResponse } from 'msw'
import { onSessionExpired, tokenStore } from '@/shared/api'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/query-client'
import { ChangePasswordForm } from './change-password-form'

const NEW_PASSWORD = 'matkhau-moi-123'

afterEach(() => {
  tokenStore.clear()
  localStorage.clear()
})

// Với phiên đang sống, request đổi mật khẩu đi qua interceptor auth: 401 sai mật khẩu không được coi là hết hạn token.
test('phiên đang sống: sai mật khẩu hiện tại hiện lỗi dưới ô, không refresh, không gửi lại, phiên còn nguyên', async () => {
  tokenStore.setSession({ accessToken: 'access-song', refreshToken: 'refresh-song' })
  const expired = vi.fn()
  const off = onSessionExpired(expired)
  let changeCalls = 0
  let refreshCalls = 0
  server.use(
    mswHttp.post(api('/auth/change-password'), () => {
      changeCalls++
      return HttpResponse.json(
        { status: 401, code: 'invalid_credentials', detail: 'Mật khẩu hiện tại không đúng.' },
        { status: 401 },
      )
    }),
    mswHttp.post(api('/auth/refresh'), () => {
      refreshCalls++
      return HttpResponse.json({ accessToken: 'access-moi', refreshToken: 'refresh-moi' })
    }),
  )
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ChangePasswordForm
        username="an.nv"
        mode="voluntary"
        onChanged={vi.fn()}
        onReloginFailed={vi.fn()}
      />
    </QueryClientProvider>,
  )

  await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'sai-mat-khau-1')
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), NEW_PASSWORD)
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))

  expect(await screen.findByText('Mật khẩu hiện tại không đúng.')).toBeInTheDocument()
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toBeInvalid()
  expect(changeCalls).toBe(1)
  expect(refreshCalls).toBe(0)
  expect(expired).not.toHaveBeenCalled()
  expect(tokenStore.hasSession()).toBe(true)
  expect(tokenStore.getAccess()).toBe('access-song')
  off()
})
