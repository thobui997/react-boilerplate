import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http as mswHttp, HttpResponse } from 'msw'
import { tokenStore } from '@/shared/api'
import { setNotifier } from '@/shared/lib/notify'
import { makeMeDto } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/query-client'
import { ChangePasswordForm } from './change-password-form'

const NEW_PASSWORD = 'matkhau-moi-123'

function mockSuccessfulChange(calls: string[]) {
  server.use(
    mswHttp.post(api('/auth/change-password'), () => {
      calls.push('change')
      return new HttpResponse(null, { status: 204 })
    }),
    mswHttp.post(api('/auth/login'), async ({ request }) => {
      calls.push(`login:${JSON.stringify(await request.json())}`)
      return HttpResponse.json({
        accessToken: 'a2',
        refreshToken: 'r2',
      })
    }),
    mswHttp.get(api('/me'), () => {
      calls.push('me')
      return HttpResponse.json(makeMeDto())
    }),
  )
}

function setup(mode: 'forced' | 'voluntary' = 'forced', onCancel?: () => void) {
  const onChanged = vi.fn()
  const onReloginFailed = vi.fn()
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ChangePasswordForm
        username="an.nv"
        mode={mode}
        onChanged={onChanged}
        onReloginFailed={onReloginFailed}
        onCancel={onCancel}
      />
    </QueryClientProvider>,
  )
  return { onChanged, onReloginFailed }
}

async function fill(current: string, next: string, confirm: string, currentLabel = 'Mật khẩu tạm') {
  await userEvent.type(screen.getByLabelText(currentLabel), current)
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), next)
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), confirm)
}

beforeEach(() => {
  tokenStore.clear()
})

afterEach(() => {
  setNotifier(null)
})

test('chế độ bắt buộc dùng nhãn "mật khẩu tạm"; chế độ tự nguyện dùng "hiện tại"', () => {
  setup('forced')

  expect(screen.getByLabelText('Mật khẩu tạm')).toBeInTheDocument()
  expect(screen.getByText('Khác mật khẩu tạm')).toBeInTheDocument()
})

test('chế độ tự nguyện hiện "Khác mật khẩu hiện tại"', () => {
  setup('voluntary')

  expect(screen.getByLabelText('Mật khẩu hiện tại')).toBeInTheDocument()
  expect(screen.getByText('Khác mật khẩu hiện tại')).toBeInTheDocument()
})

test('nút "Lưu mật khẩu mới" khoá tới khi cả bốn luật đúng', async () => {
  setup()
  const button = screen.getByRole('button', { name: 'Lưu mật khẩu mới' })
  expect(button).toBeDisabled()

  await fill('mat-khau-tam-1', 'ngan', 'ngan')
  expect(button).toBeDisabled()

  await userEvent.clear(screen.getByLabelText('Mật khẩu mới'))
  await userEvent.clear(screen.getByLabelText('Nhập lại mật khẩu mới'))
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), NEW_PASSWORD)
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'khac-nhau-hoan-toan')
  expect(button).toBeDisabled()

  await userEvent.clear(screen.getByLabelText('Nhập lại mật khẩu mới'))
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), NEW_PASSWORD)
  expect(button).toBeEnabled()
})

test('thành công: POST change-password → POST login (username + mật khẩu mới) → GET /me rồi onChanged', async () => {
  const calls: string[] = []
  mockSuccessfulChange(calls)
  const { onChanged, onReloginFailed } = setup()

  await fill('mat-khau-tam-1', NEW_PASSWORD, NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))

  await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
  expect(calls).toEqual([
    'change',
    `login:${JSON.stringify({ username: 'an.nv', password: NEW_PASSWORD })}`,
    'me',
  ])
  expect(onReloginFailed).not.toHaveBeenCalled()
  expect(tokenStore.getAccess()).toBe('a2')
})

test('422 validation_failed theo hình dạng thật của API: lỗi weak_password nằm ở errors.newPassword, hiện dưới ô "Mật khẩu mới"', async () => {
  server.use(
    mswHttp.post(api('/auth/change-password'), () =>
      HttpResponse.json(
        {
          status: 422,
          code: 'validation_failed',
          detail: 'Một hoặc nhiều trường không hợp lệ.',
          errors: { newPassword: [{ code: 'weak_password', message: 'Mật khẩu quá phổ biến.' }] },
        },
        { status: 422 },
      ),
    ),
  )
  setup()

  await fill('mat-khau-tam-1', NEW_PASSWORD, NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))

  expect(await screen.findByText('Mật khẩu quá phổ biến.')).toBeInTheDocument()
  expect(screen.getByLabelText('Mật khẩu mới')).toBeInvalid()
})

test('422 weak_password: hiện detail dưới ô "Mật khẩu mới", không đăng nhập lại', async () => {
  const calls: string[] = []
  server.use(
    mswHttp.post(api('/auth/change-password'), () =>
      HttpResponse.json(
        { status: 422, code: 'weak_password', detail: 'Mật khẩu quá phổ biến.' },
        { status: 422 },
      ),
    ),
    mswHttp.post(api('/auth/login'), () => {
      calls.push('login')
      return HttpResponse.json({})
    }),
  )
  const { onChanged } = setup()

  await fill('mat-khau-tam-1', NEW_PASSWORD, NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))

  const message = await screen.findByText('Mật khẩu quá phổ biến.')
  const describedBy = screen.getByLabelText('Mật khẩu mới').getAttribute('aria-describedby') ?? ''
  expect(describedBy).toContain(message.closest('p')!.id)
  expect(calls).toEqual([])
  expect(onChanged).not.toHaveBeenCalled()
})

test('sai mật khẩu tạm/hiện tại (401 invalid_credentials): lỗi dưới ô mật khẩu hiện tại', async () => {
  server.use(
    mswHttp.post(api('/auth/change-password'), () =>
      HttpResponse.json(
        { status: 401, code: 'invalid_credentials', detail: 'Mật khẩu hiện tại không đúng.' },
        { status: 401 },
      ),
    ),
  )
  setup()

  await fill('sai-mat-khau-1', NEW_PASSWORD, NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))

  expect(await screen.findByText('Mật khẩu hiện tại không đúng.')).toBeInTheDocument()
})

test('đăng nhập lại ngầm lỗi: xoá phiên cũ và gọi onReloginFailed', async () => {
  server.use(
    mswHttp.post(api('/auth/change-password'), () => new HttpResponse(null, { status: 204 })),
    mswHttp.post(api('/auth/login'), () =>
      HttpResponse.json({ status: 500, code: 'internal_error', detail: 'x' }, { status: 500 }),
    ),
  )
  tokenStore.setSession({ accessToken: 'cu', refreshToken: 'r-cu' })
  const { onChanged, onReloginFailed } = setup()

  await fill('mat-khau-tam-1', NEW_PASSWORD, NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))

  await waitFor(() => expect(onReloginFailed).toHaveBeenCalledTimes(1))
  expect(onChanged).not.toHaveBeenCalled()
  expect(tokenStore.hasSession()).toBe(false)
})

test('đang lưu thì đổi nhãn nút và khoá nút (chống bấm đúp)', async () => {
  let changeCalls = 0
  // Giữ phản hồi tới khi test thả ra: chờ theo thời gian cố định sẽ đỏ ngẫu nhiên khi máy chạy chậm.
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => (release = resolve))
  server.use(
    mswHttp.post(api('/auth/change-password'), async () => {
      changeCalls++
      await gate
      return new HttpResponse(null, { status: 500 })
    }),
  )
  setup()
  await fill('mat-khau-tam-1', NEW_PASSWORD, NEW_PASSWORD)

  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))
  const busy = screen.getByRole('button', { name: 'Đang lưu…' })
  await userEvent.click(busy)

  expect(busy).toBeDisabled()
  release()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Lưu mật khẩu mới' })).toBeEnabled(),
  )
  expect(changeCalls).toBe(1)
})

test('sau 204 refresh token đã bị thu hồi không còn nằm lại trong storage khi đăng nhập lại ngầm', async () => {
  let hadSessionDuringLogin: boolean | null = null
  server.use(
    mswHttp.post(api('/auth/change-password'), () => new HttpResponse(null, { status: 204 })),
    mswHttp.post(api('/auth/login'), () => {
      hadSessionDuringLogin = tokenStore.hasSession()
      return HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' })
    }),
    mswHttp.get(api('/me'), () => HttpResponse.json(makeMeDto())),
  )
  tokenStore.setSession({ accessToken: 'cu', refreshToken: 'r-da-thu-hoi' })
  const { onChanged } = setup()

  await fill('mat-khau-tam-1', NEW_PASSWORD, NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))

  await waitFor(() => expect(onChanged).toHaveBeenCalled())
  expect(hadSessionDuringLogin).toBe(false)
})

test('đăng nhập lại ngầm lỗi: báo các tab khác đăng xuất', async () => {
  server.use(
    mswHttp.post(api('/auth/change-password'), () => new HttpResponse(null, { status: 204 })),
    mswHttp.post(api('/auth/login'), () =>
      HttpResponse.json({ status: 500, code: 'internal_error', detail: 'x' }, { status: 500 }),
    ),
  )
  const otherTab = new BroadcastChannel('app-auth')
  const messages: unknown[] = []
  otherTab.onmessage = (event) => messages.push(event.data)
  const { onReloginFailed } = setup()

  await fill('mat-khau-tam-1', NEW_PASSWORD, NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))
  await waitFor(() => expect(onReloginFailed).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 30))

  expect(messages).toContainEqual({ type: 'signed-out' })
  otherTab.close()
})

test('lỗi chung của server: hiện trong vùng báo lỗi của form và qua cổng notify, không đăng nhập lại', async () => {
  const notifier = { info: vi.fn(), success: vi.fn(), error: vi.fn() }
  setNotifier(notifier)
  server.use(
    mswHttp.post(api('/auth/change-password'), () =>
      HttpResponse.json(
        { status: 500, code: 'internal_error', detail: 'Máy chủ gặp sự cố.' },
        { status: 500 },
      ),
    ),
  )
  const { onChanged, onReloginFailed } = setup()

  await fill('mat-khau-tam-1', NEW_PASSWORD, NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ gặp sự cố.')
  expect(notifier.error).toHaveBeenCalledWith('Máy chủ gặp sự cố.')
  expect(onChanged).not.toHaveBeenCalled()
  expect(onReloginFailed).not.toHaveBeenCalled()
})

test('có onCancel thì hiện nút "Huỷ" và nút nộp đổi nhãn "Lưu mật khẩu"', async () => {
  const onCancel = vi.fn()
  setup('voluntary', onCancel)

  expect(screen.getByRole('button', { name: 'Lưu mật khẩu' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))

  expect(onCancel).toHaveBeenCalledTimes(1)
})
