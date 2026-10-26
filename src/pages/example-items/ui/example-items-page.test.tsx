import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { ROUTES } from '@/shared/config'
import { Permissions } from '@/shared/lib/access'
import { setNotifier, type Notifier } from '@/shared/lib/notify'
import { makeUser } from '@/test/fixtures/user'
import { api } from '@/test/msw/api'
import { makeExampleItemWire, seedExampleItems } from '@/test/msw/example-items'
import { renderRoute } from '@/test/render'

const notifier = { info: vi.fn(), success: vi.fn(), error: vi.fn() } satisfies Notifier

const alpha = makeExampleItemWire({ id: 'a', name: 'Mục A', description: 'Mô tả A' })
const beta = makeExampleItemWire({ id: 'b', name: 'Mục B', description: 'Mô tả B' })

beforeEach(() => {
  vi.clearAllMocks()
  setNotifier(notifier)
})

afterEach(() => {
  setNotifier(null)
  vi.restoreAllMocks()
})

async function openPage(options: Parameters<typeof renderRoute>[1] = {}) {
  const view = renderRoute(ROUTES.ExampleItems, options)
  const main = within(await screen.findByRole('main'))
  return { ...view, main }
}

const rowOf = (main: ReturnType<typeof within>, name: string) =>
  within(main.getByRole('row', { name: new RegExp(name) }))

describe('danh sách', () => {
  test('hiện trạng thái đang tải rồi bảng các mục', async () => {
    seedExampleItems([alpha, beta])
    const slow = http.get(api('/example-items'), async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return HttpResponse.json([alpha, beta])
    })

    const { main } = await openPage({ handlers: [slow] })

    expect(main.getByRole('status')).toHaveTextContent('Đang tải…')
    expect(await main.findByRole('table')).toBeInTheDocument()
    expect(main.queryByRole('status')).not.toBeInTheDocument()
    expect(main.getAllByRole('row')).toHaveLength(3)
    expect(main.getByRole('cell', { name: 'Mô tả B' })).toBeInTheDocument()
  })

  test('danh sách rỗng thì hiện thông báo thay vì bảng', async () => {
    const { main } = await openPage()

    expect(await main.findByText('Chưa có mục nào.')).toBeInTheDocument()
    expect(main.queryByRole('table')).not.toBeInTheDocument()
  })

  test('lỗi tải hiện thông báo lỗi và nút "Thử lại" tải lại được', async () => {
    let calls = 0
    const flaky = http.get(api('/example-items'), () => {
      calls++
      return calls === 1
        ? HttpResponse.json(
            { status: 503, code: 'unavailable', detail: 'Máy chủ bận.' },
            { status: 503 },
          )
        : HttpResponse.json([alpha])
    })
    const { main, user } = await openPage({ handlers: [flaky] })

    expect(await main.findByRole('alert')).toHaveTextContent('Máy chủ bận.')
    await user.click(main.getByRole('button', { name: 'Thử lại' }))

    expect(await main.findByRole('table')).toBeInTheDocument()
    expect(main.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('tạo mới', () => {
  test('điền form nội tuyến, lưu thì báo thành công và dòng mới hiện trong bảng', async () => {
    const { main, user } = await openPage()
    await user.click(await main.findByRole('button', { name: 'Thêm mục' }))

    await user.type(main.getByLabelText('Tên'), 'Mục mới')
    await user.type(main.getByLabelText('Mô tả'), 'Mô tả mới')
    await user.click(main.getByRole('button', { name: 'Lưu' }))

    expect(await main.findByRole('cell', { name: 'Mục mới' })).toBeInTheDocument()
    expect(notifier.success).toHaveBeenCalledWith('Đã thêm mục')
    expect(main.queryByLabelText('Tên')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('bỏ trống tên thì báo lỗi dưới ô tên và không gọi API', async () => {
    let posts = 0
    const count = http.post(api('/example-items'), () => {
      posts++
      return HttpResponse.json(alpha, { status: 201 })
    })
    const { main, user } = await openPage({ handlers: [count] })
    await user.click(await main.findByRole('button', { name: 'Thêm mục' }))

    await user.click(main.getByRole('button', { name: 'Lưu' }))

    expect(await main.findByRole('alert')).toHaveTextContent('Cần nhập tên')
    expect(main.getByLabelText('Tên')).toBeInvalid()
    expect(posts).toBe(0)
    expect(notifier.success).not.toHaveBeenCalled()
  })

  test('tên quá 100 ký tự hoặc mô tả quá 500 ký tự bị chặn ở form', async () => {
    const { main, user } = await openPage()
    await user.click(await main.findByRole('button', { name: 'Thêm mục' }))

    await user.type(main.getByLabelText('Tên'), 'a'.repeat(101))
    await user.click(main.getByLabelText('Mô tả'))
    await user.paste('b'.repeat(501))
    await user.click(main.getByRole('button', { name: 'Lưu' }))

    const alerts = await main.findAllByRole('alert')
    expect(alerts.map((alert) => alert.textContent)).toEqual([
      'Tên tối đa 100 ký tự',
      'Mô tả tối đa 500 ký tự',
    ])
  })

  test('422 có errors từ server hiện dưới đúng ô', async () => {
    const reject = http.post(api('/example-items'), () =>
      HttpResponse.json(
        {
          status: 422,
          code: 'validation_failed',
          detail: 'Dữ liệu không hợp lệ.',
          errors: { description: [{ code: 'invalid', message: 'Mô tả chứa từ bị cấm' }] },
        },
        { status: 422 },
      ),
    )
    const { main, user } = await openPage({ handlers: [reject] })
    await user.click(await main.findByRole('button', { name: 'Thêm mục' }))

    await user.type(main.getByLabelText('Tên'), 'Mục mới')
    await user.click(main.getByRole('button', { name: 'Lưu' }))

    const alert = await main.findByRole('alert')
    expect(alert).toHaveTextContent('Mô tả chứa từ bị cấm')
    expect(main.getByLabelText('Mô tả')).toHaveAccessibleDescription('Mô tả chứa từ bị cấm')
    expect(main.getByLabelText('Mô tả')).toBeInvalid()
    expect(main.getByLabelText('Tên')).toBeValid()
    expect(notifier.error).toHaveBeenCalledWith('Dữ liệu không hợp lệ.')
  })

  test('"Huỷ" đóng form mà không tạo gì', async () => {
    const { main, user } = await openPage()
    await user.click(await main.findByRole('button', { name: 'Thêm mục' }))

    await user.click(main.getByRole('button', { name: 'Huỷ' }))

    expect(main.queryByLabelText('Tên')).not.toBeInTheDocument()
    expect(notifier.success).not.toHaveBeenCalled()
  })
})

describe('sửa', () => {
  test('"Sửa" mở form nội tuyến có sẵn giá trị; lưu thì bảng cập nhật', async () => {
    seedExampleItems([alpha, beta])
    const { main, user } = await openPage()
    await main.findByRole('table')

    await user.click(rowOf(main, 'Mục B').getByRole('button', { name: 'Sửa' }))

    expect(main.getByLabelText('Tên')).toHaveValue('Mục B')
    expect(main.getByLabelText('Mô tả')).toHaveValue('Mô tả B')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.clear(main.getByLabelText('Tên'))
    await user.type(main.getByLabelText('Tên'), 'Mục B đã sửa')
    await user.click(main.getByRole('button', { name: 'Lưu' }))

    expect(await main.findByRole('cell', { name: 'Mục B đã sửa' })).toBeInTheDocument()
    expect(main.getByRole('cell', { name: 'Mục A' })).toBeInTheDocument()
    expect(notifier.success).toHaveBeenCalledWith('Đã lưu thay đổi')
    expect(main.queryByLabelText('Tên')).not.toBeInTheDocument()
  })
})

describe('xóa', () => {
  test('hỏi bằng window.confirm: đồng ý thì xóa mục', async () => {
    seedExampleItems([alpha, beta])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { main, user } = await openPage()
    await main.findByRole('table')

    await user.click(rowOf(main, 'Mục A').getByRole('button', { name: 'Xóa' }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Mục A'))
    await waitFor(() => expect(main.queryByRole('cell', { name: 'Mục A' })).not.toBeInTheDocument())
    expect(main.getByRole('cell', { name: 'Mục B' })).toBeInTheDocument()
    expect(notifier.success).toHaveBeenCalledWith('Đã xóa mục')
  })

  test('hỏi bằng window.confirm: từ chối thì không xóa và không gọi API', async () => {
    seedExampleItems([alpha])
    let deletes = 0
    const count = http.delete(api('/example-items/a'), () => {
      deletes++
      return new HttpResponse(null, { status: 204 })
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { main, user } = await openPage({ handlers: [count] })
    await main.findByRole('table')

    await user.click(main.getByRole('button', { name: 'Xóa' }))

    expect(confirm).toHaveBeenCalledOnce()
    expect(main.getByRole('cell', { name: 'Mục A' })).toBeInTheDocument()
    expect(deletes).toBe(0)
    expect(notifier.success).not.toHaveBeenCalled()
  })
})

describe('phân quyền', () => {
  test('chỉ có item:read thì thấy bảng nhưng không có nút tạo, sửa, xóa', async () => {
    seedExampleItems([alpha])
    const { main } = await openPage({ user: makeUser({ permissions: [Permissions.ItemRead] }) })

    expect(await main.findByRole('table')).toBeInTheDocument()
    expect(main.queryByRole('button', { name: 'Thêm mục' })).not.toBeInTheDocument()
    expect(main.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument()
    expect(main.queryByRole('button', { name: 'Xóa' })).not.toBeInTheDocument()
  })

  test('không có item:read vào /example-items thì bị chuyển về trang cài đặt', async () => {
    const { router } = renderRoute(ROUTES.ExampleItems, { user: makeUser({ permissions: [] }) })

    expect(await screen.findByRole('heading', { level: 1, name: 'Cài đặt' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(ROUTES.Settings)
  })
})
