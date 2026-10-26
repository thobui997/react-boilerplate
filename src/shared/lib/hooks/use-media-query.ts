import { useCallback, useSyncExternalStore } from 'react'

// Môi trường không có `matchMedia` (jsdom) coi là khớp: trình bày dành cho màn rộng là nhánh mặc định.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => undefined
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  const getSnapshot = () =>
    typeof window.matchMedia !== 'function' || window.matchMedia(query).matches
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
