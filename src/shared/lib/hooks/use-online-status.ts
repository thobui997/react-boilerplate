import { useSyncExternalStore } from 'react'

let isOnline = true

// Tin vào loại sự kiện thay vì đọc lại navigator.onLine: hai giá trị luôn khớp trên trình duyệt thật,
// và cách này không phụ thuộc môi trường giả lập mạng.
function subscribe(onChange: () => void): () => void {
  isOnline = navigator.onLine
  const handleChange = (event: Event) => {
    isOnline = event.type === 'online'
    onChange()
  }
  window.addEventListener('online', handleChange)
  window.addEventListener('offline', handleChange)
  return () => {
    window.removeEventListener('online', handleChange)
    window.removeEventListener('offline', handleChange)
  }
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isOnline,
    () => true,
  )
}
