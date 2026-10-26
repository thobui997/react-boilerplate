import { z } from 'zod'
import { messages } from '@/shared/i18n'
import { evaluatePasswordPolicy, type PasswordRuleId } from './password-policy'

const RULE_TARGET: Record<PasswordRuleId, 'newPassword' | 'confirm'> = {
  minLength: 'newPassword',
  differentFromUsername: 'newPassword',
  differentFromCurrent: 'newPassword',
  matches: 'confirm',
}

// Dùng lại chính danh sách luật hiển thị cho người dùng để schema và giao diện không lệch nhau.
export function createChangePasswordSchema({ username }: { username: string }) {
  return z
    .object({
      currentPassword: z.string().min(1, messages.changePassword.currentRequired),
      newPassword: z.string(),
      confirm: z.string(),
    })
    .superRefine((values, context) => {
      const rules = evaluatePasswordPolicy({
        newPassword: values.newPassword,
        confirm: values.confirm,
        username,
        current: values.currentPassword,
      })
      for (const rule of rules.filter((r) => !r.ok)) {
        context.addIssue({ code: 'custom', path: [RULE_TARGET[rule.id]], message: rule.label })
      }
    })
}

export type ChangePasswordValues = z.infer<ReturnType<typeof createChangePasswordSchema>>
