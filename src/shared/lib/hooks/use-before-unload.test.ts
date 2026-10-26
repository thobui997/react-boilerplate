import { renderHook } from '@testing-library/react'
import { useBeforeUnload } from './use-before-unload'

function fireBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

test('when=true chặn đóng tab bằng preventDefault', () => {
  renderHook(() => useBeforeUnload(true))

  expect(fireBeforeUnload().defaultPrevented).toBe(true)
})

test('when=false không chặn', () => {
  renderHook(() => useBeforeUnload(false))

  expect(fireBeforeUnload().defaultPrevented).toBe(false)
})

test('đổi sang false hoặc unmount thì gỡ listener', () => {
  const { rerender, unmount } = renderHook(({ when }) => useBeforeUnload(when), {
    initialProps: { when: true },
  })

  rerender({ when: false })
  expect(fireBeforeUnload().defaultPrevented).toBe(false)

  rerender({ when: true })
  unmount()
  expect(fireBeforeUnload().defaultPrevented).toBe(false)
})
