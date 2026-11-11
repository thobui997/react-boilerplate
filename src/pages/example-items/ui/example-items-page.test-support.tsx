import { screen, within } from '@testing-library/react'
import { ROUTES } from '@/shared/config'
import type { Notifier } from '@/shared/lib/notify'
import { makeExampleItemWire } from '@/test/msw/example-items'
import { renderRoute } from '@/test/render'

export const notifier = { info: vi.fn(), success: vi.fn(), error: vi.fn() } satisfies Notifier

export const alpha = makeExampleItemWire({ id: 'a', name: 'Mục A', description: 'Mô tả A' })
export const beta = makeExampleItemWire({ id: 'b', name: 'Mục B', description: 'Mô tả B' })

export async function openPage(options: Parameters<typeof renderRoute>[1] = {}) {
  const view = renderRoute(ROUTES.ExampleItems, options)
  const main = within(await screen.findByRole('main'))
  return { ...view, main }
}

export const rowOf = (main: ReturnType<typeof within>, name: string) =>
  within(main.getByRole('row', { name: new RegExp(name) }))
