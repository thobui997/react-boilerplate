import { useEffect } from 'react'

// Đồng bộ với sự kiện beforeunload của cửa sổ: hỏi lại trước khi đóng tab khi còn thay đổi chưa lưu.
export function useBeforeUnload(when: boolean): void {
  useEffect(() => {
    if (!when) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [when])
}
