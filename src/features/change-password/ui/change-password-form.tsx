import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState, type ComponentProps } from 'react'
import { useForm, useWatch, type FieldError } from 'react-hook-form'
import { messages } from '@/shared/i18n'
import {
  createChangePasswordSchema,
  type ChangePasswordValues,
} from '../model/change-password-schema'
import { evaluatePasswordPolicy } from '../model/password-policy'
import { useChangePasswordSubmit } from '../model/use-change-password-submit'

interface ChangePasswordFormProps {
  username: string
  // forced: mật khẩu tạm do quản trị cấp (bắt buộc đổi); voluntary: tự đổi trong phần cài đặt.
  mode: 'forced' | 'voluntary'
  onChanged: () => void
  onReloginFailed: () => void
  // Có thì hiện thêm nút Huỷ cạnh nút lưu (dùng khi form nằm trong trang cài đặt).
  onCancel?: () => void
}

const EMPTY_VALUES: ChangePasswordValues = { currentPassword: '', newPassword: '', confirm: '' }
const text = messages.changePassword

interface PasswordFieldProps extends Omit<ComponentProps<'input'>, 'type' | 'id'> {
  label: string
  error?: FieldError
}

function PasswordField({ label, error, ...inputProps }: PasswordFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        id={id}
        type="password"
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

export function ChangePasswordForm({
  username,
  mode,
  onChanged,
  onReloginFailed,
  onCancel,
}: ChangePasswordFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(createChangePasswordSchema({ username })),
    defaultValues: EMPTY_VALUES,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const { submit, isPending } = useChangePasswordSubmit({ username, onChanged, onReloginFailed })
  const [currentPassword = '', newPassword = '', confirm = ''] = useWatch({
    control,
    name: ['currentPassword', 'newPassword', 'confirm'],
  })

  const rules = evaluatePasswordPolicy(
    { newPassword, confirm, username, current: currentPassword },
    { mode },
  )
  const canSubmit = currentPassword.length > 0 && rules.every((rule) => rule.ok)

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const outcome = await submit(values)
    if (outcome.kind === 'field-error') setError(outcome.field, { message: outcome.message })
    if (outcome.kind === 'failed') setFormError(outcome.message)
  })

  const submitLabel = isPending
    ? text.actions.saving
    : onCancel
      ? text.actions.save
      : text.actions.saveForced

  return (
    <form onSubmit={onSubmit} noValidate>
      <PasswordField
        {...register('currentPassword')}
        label={mode === 'forced' ? text.labels.temporary : text.labels.current}
        autoComplete="current-password"
        error={errors.currentPassword}
      />
      <PasswordField
        {...register('newPassword')}
        label={text.labels.next}
        autoComplete="new-password"
        error={errors.newPassword}
      />
      <PasswordField
        {...register('confirm')}
        label={text.labels.confirm}
        autoComplete="new-password"
        error={errors.confirm}
      />
      <ul aria-label={text.rules.title}>
        {rules.map((rule) => (
          <li key={rule.id}>
            <span aria-hidden="true">{rule.ok ? '✓' : '○'}</span> <span>{rule.label}</span>
            {rule.ok && <span> ({text.rules.met})</span>}
          </li>
        ))}
      </ul>
      {formError && <p role="alert">{formError}</p>}
      {onCancel && (
        <button type="button" onClick={onCancel}>
          {text.actions.cancel}
        </button>
      )}
      <button type="submit" disabled={!canSubmit || isPending}>
        {submitLabel}
      </button>
    </form>
  )
}
