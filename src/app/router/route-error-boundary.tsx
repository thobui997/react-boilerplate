import { isRouteErrorResponse, useRevalidator, useRouteError } from 'react-router'
import { NotFoundPage } from '@/pages/not-found'
import { ApiError, HttpStatus } from '@/shared/api'
import { messages } from '@/shared/i18n'
import { Button } from '@/shared/ui/button'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const revalidator = useRevalidator()

  if (isRouteErrorResponse(error) && error.status === HttpStatus.NotFound) return <NotFoundPage />

  return (
    <section className="flex flex-col items-start gap-3 p-4">
      <h1 className="text-xl font-semibold">{messages.routeError.title}</h1>
      <p role="alert">{error instanceof ApiError ? error.detail : messages.routeError.fallback}</p>
      <Button type="button" onClick={() => revalidator.revalidate()}>
        {messages.routeError.retry}
      </Button>
    </section>
  )
}
