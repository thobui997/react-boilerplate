import { useSyncExternalStore } from 'react'
import { STORAGE_KEYS } from '@/shared/config'
import type { ValueOf } from '@/shared/lib/const-enum'

export const Theme = { Light: 'light', Dark: 'dark' } as const
export type Theme = ValueOf<typeof Theme>

const THEME_KEY = STORAGE_KEYS.Theme
const DARK_QUERY = '(prefers-color-scheme: dark)'

// Lựa chọn trong bộ nhớ: vẫn đổi được theme khi localStorage không dùng được (chế độ riêng tư, hết dung lượng).
let chosen: Theme | null = null
const listeners = new Set<() => void>()

function isTheme(value: unknown): value is Theme {
  return value === Theme.Light || value === Theme.Dark
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
    ? Theme.Dark
    : Theme.Light
}

export function getTheme(): Theme {
  return chosen ?? readStored() ?? systemTheme()
}

export function setTheme(theme: Theme): void {
  chosen = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Không lưu được: theme chỉ có hiệu lực tới khi tải lại trang.
  }
  document.documentElement.dataset.theme = theme
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}
