import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setNotifier } from '@/shared/lib/notify'
import { api } from '@/test/msw/api'
import { seedExampleItems } from '@/test/msw/example-items'
import { alpha, beta, notifier, openPage, rowOf } from './example-items-page.test-support'

beforeEach(() => {
  vi.clearAllMocks()
  setNotifier(notifier)
})

afterEach(() => {
  setNotifier(null)
  vi.restoreAllMocks()
})

describe('xóa', () => {
  const countDeletes = (id: string, delayMs = 0) => {
    const calls = { count: 0 }
    const handler = http.delete(api(`/example-items/${id}`), async () => {
      calls.count++
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
      return new HttpResponse(null, { status: 204 })
    })
    return { calls, handler }
  }

  test('bấm Xóa mở hộp thoại xác nhận; đồng ý thì xóa mục', async () => {
    seedExampleItems([alpha, beta])
    const { main, user } = await openPage()
    await main.findByRole('table')

    await user.click(rowOf(main, 'Mục A').getByRole('button', { name: 'Xóa' }))

    const dialog = await screen.findByRole('alertdialog', { name: /Mục A/ })
    await user.click(within(dialog).getByRole('button', { name: 'Xóa' }))

    await waitFor(() => expect(main.queryByRole('cell', { name: 'Mục A' })).not.toBeInTheDocument())
    expect(main.getByRole('cell', { name: 'Mục B' })).toBeInTheDocument()
    expect(notifier.success).toHaveBeenCalledWith('Đã xóa mục')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  test('"Huỷ" thì không xóa và không gọi API', async () => {
    seedExampleItems([alpha])
    const { calls, handler } = countDeletes('a')
    const { main, user } = await openPage({ handlers: [handler] })
    await main.findByRole('table')

    await user.click(main.getByRole('button', { name: 'Xóa' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(main.getByRole('cell', { name: 'Mục A' })).toBeInTheDocument()
    expect(calls.count).toBe(0)
    expect(notifier.success).not.toHaveBeenCalled()
  })

  test('Escape đóng hộp thoại, không xóa và không gọi API', async () => {
    seedExampleItems([alpha])
    const { calls, handler } = countDeletes('a')
    const { main, user } = await openPage({ handlers: [handler] })
    await main.findByRole('table')

    await user.click(main.getByRole('button', { name: 'Xóa' }))
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(main.getByRole('cell', { name: 'Mục A' })).toBeInTheDocument()
    expect(calls.count).toBe(0)
  })

  test('bấm xác nhận hai lần liên tiếp chỉ gọi API xóa một lần', async () => {
    seedExampleItems([alpha])
    const { calls, handler } = countDeletes('a', 60)
    const { main, user } = await openPage({ handlers: [handler] })
    await main.findByRole('table')

    await user.click(main.getByRole('button', { name: 'Xóa' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Xóa' }))

    await waitFor(() => expect(notifier.success).toHaveBeenCalledWith('Đã xóa mục'))
    expect(calls.count).toBe(1)
  })

  test('xóa mục đang mở trong form sửa thì form đóng', async () => {
    seedExampleItems([alpha, beta])
    const { main, user } = await openPage()
    await main.findByRole('table')

    await user.click(rowOf(main, 'Mục A').getByRole('button', { name: 'Sửa' }))
    expect(main.getByLabelText('Tên')).toHaveValue('Mục A')
    await user.click(rowOf(main, 'Mục A').getByRole('button', { name: 'Xóa' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Xóa' }))

    await waitFor(() => expect(main.queryByLabelText('Tên')).not.toBeInTheDocument())
    expect(main.queryByRole('cell', { name: 'Mục A' })).not.toBeInTheDocument()
  })
})
