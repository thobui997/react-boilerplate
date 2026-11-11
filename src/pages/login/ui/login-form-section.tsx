import { zodResolver } from '@hookform/resolvers/zod'
import { useId, type ComponentProps } from 'react'
import { useForm, type FieldError } from 'react-hook-form'
import { messages } from '@/shared/i18n'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { loginFormSchema, type LoginFormValues } from '../model/login-form-schema'

interface LoginFormSectionProps {
  onSubmit: (values: LoginFormValues) => Promise<void>
  isPending: boolean
}

interface FieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string
  error?: FieldError
}

function Field({ label, error, ...inputProps }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...inputProps}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}
    </div>
  )
}

const text = messages.login

export function LoginFormSection({ onSubmit, isPending }: LoginFormSectionProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: '', password: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Field
        {...register('username')}
        label={text.username}
        type="text"
        placeholder={text.usernamePlaceholder}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        error={errors.username}
      />
      <Field
        {...register('password')}
        label={text.password}
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? text.submitting : text.submit}
      </Button>
    </form>
  )
}
