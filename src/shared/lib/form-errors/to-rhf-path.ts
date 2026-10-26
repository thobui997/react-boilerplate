import type { ApiFieldErrors } from '@/shared/api'

// API báo 'items[0].tags[2].x'; React Hook Form dùng 'items.0.tags.2.x'.
export function toRhfPath(path: string): string {
  return path.replace(/\[(\d+)\]/g, '.$1')
}

export function fieldErrorsFromApi(
  errors: ApiFieldErrors | undefined,
): { path: string; message: string }[] {
  if (!errors) return []
  return Object.entries(errors).flatMap(([path, items]) =>
    items.length > 0 ? [{ path: toRhfPath(path), message: items[0].message }] : [],
  )
}
