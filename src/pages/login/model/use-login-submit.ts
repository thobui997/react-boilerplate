import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { landingPathFor, sessionQueries } from '@/entities/session'
import { ROUTES } from '@/shared/config'
import { safeRedirect } from '@/shared/lib/safe-redirect'
import { useSignInMutation } from '../api/mutations'
import { describeSignInError, type SignInErrorView } from './describe-sign-in-error'
import type { LoginFormValues } from './login-form-schema'

export function useLoginSubmit() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const signInMutation = useSignInMutation()
  const [error, setError] = useState<SignInErrorView | null>(null)

  const submit = async (values: LoginFormValues) => {
    setError(null)
    try {
      await signInMutation.mutateAsync({
        username: values.username.trim(),
        password: values.password,
      })
    } catch (failure) {
      setError(describeSignInError(failure))
      return
    }
    const user = queryClient.getQueryData(sessionQueries.current().queryKey)
    // ?next= chỉ nhận đường dẫn tương đối an toàn; còn lại về trang đích theo quyền.
    await navigate(
      safeRedirect(searchParams.get('next'), user ? landingPathFor(user) : ROUTES.Home),
      { replace: true },
    )
  }

  return { submit, isPending: signInMutation.isPending, error }
}
