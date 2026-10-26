import { z } from 'zod'
import { messages } from '@/shared/i18n'

export const NAME_MAX_LENGTH = 100
export const DESCRIPTION_MAX_LENGTH = 500

const text = messages.exampleItems.form

export const exampleItemFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, text.nameRequired)
    .max(NAME_MAX_LENGTH, text.nameTooLong(NAME_MAX_LENGTH)),
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH, text.descriptionTooLong(DESCRIPTION_MAX_LENGTH)),
})

export type ExampleItemFormValues = z.infer<typeof exampleItemFormSchema>
