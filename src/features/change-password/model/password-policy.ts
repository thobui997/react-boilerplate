import { messages } from '@/shared/i18n'

export type PasswordRuleId =
  'minLength' | 'differentFromUsername' | 'differentFromCurrent' | 'matches'

export interface PasswordRule {
  id: PasswordRuleId
  label: string
  ok: boolean
}

// Đổi độ dài tối thiểu hoặc thêm luật (ký tự đặc biệt, ...) tại đây; schema và danh sách hiển thị đọc cùng nguồn này.
export const PASSWORD_MIN_LENGTH = 6

const rules = messages.changePassword.rules

// Chỉ kiểm các điều kiện client tự biết; "mật khẩu phổ biến" do server quyết (422 weak_password).
export function evaluatePasswordPolicy(
  input: { newPassword: string; confirm: string; username: string; current: string },
  { mode = 'voluntary' }: { mode?: 'forced' | 'voluntary' } = {},
): PasswordRule[] {
  const { newPassword, confirm, username, current } = input
  return [
    {
      id: 'minLength',
      label: rules.minLength(PASSWORD_MIN_LENGTH),
      ok: newPassword.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'differentFromUsername',
      label: rules.differentFromUsername,
      ok: newPassword.length > 0 && newPassword.toLowerCase() !== username.toLowerCase(),
    },
    {
      id: 'differentFromCurrent',
      label: mode === 'forced' ? rules.differentFromTemporary : rules.differentFromCurrent,
      ok: newPassword.length > 0 && newPassword !== current,
    },
    {
      id: 'matches',
      label: rules.matches,
      ok: newPassword.length > 0 && newPassword === confirm,
    },
  ]
}
