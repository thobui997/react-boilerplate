import { isRouteErrorResponse, useRevalidator, useRouteError } from 'react-router'
import { NotFoundPage } from '@/pages/not-found'
import { ApiError, HttpStatus } from '@/shared/api'
import { messages } from '@/shared/i18n'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const revalidator = useRevalidator()

  if (isRouteErrorResponse(error) && error.status === HttpStatus.NotFound) return <NotFoundPage />

  return (
    <section>
      <h1>{messages.routeError.title}</h1>
      <p role="alert">{error instanceof ApiError ? error.detail : messages.routeError.fallback}</p>
      <button type="button" onClick={() => revalidator.revalidate()}>
        {messages.routeError.retry}
      </button>
    </section>
  )
}
