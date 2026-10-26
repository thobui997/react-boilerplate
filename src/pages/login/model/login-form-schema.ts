import { z } from 'zod'
import { messages } from '@/shared/i18n'

export const loginFormSchema = z.object({
  username: z.string().trim().min(1, messages.login.usernameRequired),
  password: z.string().min(1, messages.login.passwordRequired),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
