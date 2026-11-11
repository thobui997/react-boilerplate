import { useNavigate } from 'react-router'
import { ROUTES } from '@/shared/config'
import { messages } from '@/shared/i18n'
import { Button } from '@/shared/ui/button'

// Không bọc <main>: trang hiện bên trong khung ứng dụng (đã có <main>) hoặc trong RouteErrorBoundary.
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">{messages.notFound.title}</h1>
      <p>{messages.notFound.description}</p>
      <Button type="button" onClick={() => navigate(ROUTES.Home)}>
        {messages.notFound.backHome}
      </Button>
    </section>
  )
}
