import { env } from '@/shared/config'

export function api(path: string): string {
  return `${env.apiBase}${path}`
}
