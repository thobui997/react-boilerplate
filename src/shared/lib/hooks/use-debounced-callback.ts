import { useEffect, useState } from 'react'

type Debounced<A extends unknown[]> = ((...args: A) => void) & { flush(): void; cancel(): void }

// Giữ timer và đối số chờ trong một đối tượng ổn định (không phải ref) để hàm trả về có danh tính cố định
// qua các lần render mà vẫn luôn gọi `fn` và độ trễ mới nhất.
class DebounceRunner<A extends unknown[]> {
  private timer: ReturnType<typeof setTimeout> | undefined
  private pendingArgs: A | null = null

  constructor(
    private run: (...args: A) => void,
    private delayMs: number,
  ) {}

  readonly debounced: Debounced<A> = Object.assign(
    (...args: A) => {
      clearTimeout(this.timer)
      this.pendingArgs = args
      this.timer = setTimeout(this.flush, this.delayMs)
    },
    { flush: () => this.flush(), cancel: () => this.cancel() },
  )

  update(run: (...args: A) => void, delayMs: number): void {
    this.run = run
    this.delayMs = delayMs
  }

  readonly cancel = (): void => {
    clearTimeout(this.timer)
    this.timer = undefined
    this.pendingArgs = null
  }

  private readonly flush = (): void => {
    const args = this.pendingArgs
    this.cancel()
    if (args) this.run(...args)
  }
}

// Timer là hệ thống ngoài React: dọn khi unmount để không gọi fn sau khi component đã gỡ.
// `flushOnUnmount` dành cho việc không được phép mất (ghi nháp): unmount chạy nốt tác vụ đang chờ thay vì bỏ.
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
  { flushOnUnmount = false }: { flushOnUnmount?: boolean } = {},
): Debounced<A> {
  const [runner] = useState(() => new DebounceRunner(fn, delayMs))

  useEffect(() => {
    runner.update(fn, delayMs)
  })
  useEffect(
    () => (flushOnUnmount ? runner.debounced.flush : runner.cancel),
    [runner, flushOnUnmount],
  )

  return runner.debounced
}
