import { toast } from 'sonner'
import type { Notifier } from '@/shared/lib/notify'

// Nối `notify` (shared/lib/notify) với Sonner; `main.tsx` gọi setNotifier(toastNotifier) một lần.
export const toastNotifier: Notifier = {
  info: (message) => toast.info(message),
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),
}
