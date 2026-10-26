import { messages } from '@/shared/i18n'

// Hiện khi tải phiên lần đầu (có thể vài giây khi mạng chậm hoặc đang refresh token) thay vì trang trắng.
export function HydrateFallback() {
  return (
    <p role="status" aria-label={messages.shell.loadingLabel}>
      {messages.shell.loading}
    </p>
  )
}
