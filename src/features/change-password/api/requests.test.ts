import { http, HttpResponse } from 'msw'
import { defaultAdapter, setAuthAdapterForTest, type AuthAdapter } from '@/shared/api'
import { accessOnlyAdapter } from '@/test/auth/access-only-adapter'
import { api } from '@/test/msw/api'
import { server } from '@/test/msw/server'
import { changePassword } from './requests'

interface AdapterCase {
  name: string
  adapter: AuthAdapter
  path: string
  expectedBody: unknown
}

const input = { currentPassword: 'cu-cu-cu-cu', newPassword: 'moi-moi-moi-1' }

const cases: AdapterCase[] = [
  {
    name: 'defaultAdapter',
    adapter: defaultAdapter,
    path: '/auth/change-password',
    expectedBody: { currentPassword: 'cu-cu-cu-cu', newPassword: 'moi-moi-moi-1' },
  },
  {
    name: 'accessOnlyAdapter',
    adapter: accessOnlyAdapter,
    path: '/session/secret',
    expectedBody: { current: 'cu-cu-cu-cu', next: 'moi-moi-moi-1' },
  },
]

describe.each(cases)('changePassword với $name', ({ adapter, path, expectedBody }) => {
  beforeEach(() => {
    setAuthAdapterForTest(adapter)
  })

  afterEach(() => {
    setAuthAdapterForTest(null)
  })

  test('đi qua adapter.changePassword: đúng endpoint và thân yêu cầu, chấp nhận 204', async () => {
    let body: unknown
    server.use(
      http.post(api(path), async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(changePassword(input)).resolves.toBeUndefined()

    expect(body).toEqual(expectedBody)
  })

  test('lỗi của server được ném lại dưới dạng ApiError', async () => {
    server.use(
      http.post(api(path), () =>
        HttpResponse.json(
          { status: 422, code: 'weak_password', detail: 'Mật khẩu quá phổ biến.' },
          { status: 422 },
        ),
      ),
    )

    await expect(changePassword(input)).rejects.toMatchObject({
      status: 422,
      code: 'weak_password',
    })
  })
})
