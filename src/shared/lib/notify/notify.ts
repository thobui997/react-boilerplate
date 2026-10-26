import { getErrorMessage } from '@/shared/api'

export interface Notifier {
  info(message: string): void
  success(message: string): void
  error(message: string): void
}

export const NOTIFY_DEFAULT_TTL_MS = 5000

function show(message: string): void {
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.textContent = message
  document.body.append(el)
  setTimeout(() => el.remove(), NOTIFY_DEFAULT_TTL_MS)
}

const defaultNotifier: Notifier = { info: show, success: show, error: show }

let current: Notifier = defaultNotifier

export function setNotifier(notifier: Notifier | null): void {
  current = notifier ?? defaultNotifier
}

export const notify: Notifier = {
  info: (message) => current.info(message),
  success: (message) => current.success(message),
  error: (message) => current.error(message),
}

export function notifyApiError(error: unknown, fallback: string): void {
  notify.error(getErrorMessage(error, fallback))
}
