import { AUTH_CHANNEL } from '@/shared/config'

export type AuthMessage =
  { type: 'refreshed'; accessToken: string } | { type: 'signed-out' } | { type: 'expired' }

let channel: BroadcastChannel | null | undefined
let latestRefreshed: { accessToken: string; receivedAt: number } | null = null
const listeners = new Set<(message: AuthMessage) => void>()

// Tạo muộn: tab chỉ cần kênh khi thật sự refresh/đăng xuất; môi trường không có BroadcastChannel thì bỏ qua.
function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel
  channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(AUTH_CHANNEL)
  channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
    if (event.data.type === 'refreshed') {
      latestRefreshed = { accessToken: event.data.accessToken, receivedAt: Date.now() }
    }
    listeners.forEach((listener) => listener(event.data))
  })
  return channel
}

// Phải gọi trước khi chờ khoá: tin nhắn của tab khác phát lúc ta còn xếp hàng sẽ không được gửi lại.
export function openAuthChannel(): void {
  getChannel()
}

export function postAuthMessage(message: AuthMessage): void {
  getChannel()?.postMessage(message)
}

export function subscribeAuthMessages(listener: (message: AuthMessage) => void): () => void {
  getChannel()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Access token mà tab khác vừa lấy được (kể từ `sinceMs`), chờ tối đa `timeoutMs` vì BroadcastChannel là bất đồng bộ.
export function awaitRefreshedAccess(sinceMs: number, timeoutMs: number): Promise<string | null> {
  getChannel()
  if (latestRefreshed && latestRefreshed.receivedAt >= sinceMs) {
    return Promise.resolve(latestRefreshed.accessToken)
  }
  return new Promise((resolve) => {
    const finish = (value: string | null) => {
      clearTimeout(timer)
      listeners.delete(listener)
      resolve(value)
    }
    const listener = (message: AuthMessage) => {
      if (message.type === 'refreshed') finish(message.accessToken)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    listeners.add(listener)
  })
}
