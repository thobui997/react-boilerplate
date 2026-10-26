import { postAuthMessage, subscribeAuthMessages } from './auth-channel'
import { tokenStore } from './token-store'

function createEmitter() {
  const handlers = new Set<() => void>()
  return {
    on(handler: () => void): () => void {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    emit(): void {
      handlers.forEach((handler) => handler())
    },
  }
}

const sessionExpired = createEmitter()
const passwordChangeRequired = createEmitter()
const remoteSignOut = createEmitter()

let isChannelWired = false

// Một lần duy nhất: tin từ tab khác (đăng xuất, hết phiên) → xoá access token trong bộ nhớ của tab này rồi báo handler.
function wireChannel(): void {
  if (isChannelWired) return
  isChannelWired = true
  subscribeAuthMessages((message) => {
    if (message.type === 'signed-out') {
      tokenStore.clear()
      remoteSignOut.emit()
    } else if (message.type === 'expired') {
      tokenStore.clear()
      sessionExpired.emit()
    }
  })
}

// shared/api không import app: app đăng ký handler ở các hàm on* và tự điều hướng.
export function onSessionExpired(handler: () => void): () => void {
  wireChannel()
  return sessionExpired.on(handler)
}

export function onRemoteSignOut(handler: () => void): () => void {
  wireChannel()
  return remoteSignOut.on(handler)
}

export const onPasswordChangeRequired = passwordChangeRequired.on
export const emitPasswordChangeRequired = passwordChangeRequired.emit

// Phát cho tab này và báo các tab khác: refresh token đã mất hiệu lực với mọi tab.
export function expireSession(): void {
  tokenStore.clear()
  postAuthMessage({ type: 'expired' })
  sessionExpired.emit()
}

export function broadcastSignOut(): void {
  postAuthMessage({ type: 'signed-out' })
}
