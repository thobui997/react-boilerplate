import { zodResolver } from '@hookform/resolvers/zod'
import { useId, type ComponentProps } from 'react'
import { useForm, type FieldError } from 'react-hook-form'
import { messages } from '@/shared/i18n'
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
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert">
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
      <button type="submit" disabled={isPending}>
        {isPending ? text.submitting : text.submit}
      </button>
    </form>
  )
}
