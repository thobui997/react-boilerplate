import { useNavigate } from 'react-router'
import { ROUTES } from '@/shared/config'
import { messages } from '@/shared/i18n'

// Không bọc <main>: trang hiện bên trong khung ứng dụng (đã có <main>) hoặc trong RouteErrorBoundary.
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section>
      <h1>{messages.notFound.title}</h1>
      <p>{messages.notFound.description}</p>
      <button type="button" onClick={() => navigate(ROUTES.Home)}>
        {messages.notFound.backHome}
      </button>
    </section>
  )
}
