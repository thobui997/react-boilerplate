import type { QueryClient } from '@tanstack/react-query'
import type { RouteObject } from 'react-router'
import { AppShell } from '@/app/layouts/app-shell'
import { ROUTES } from '@/shared/config'
import { HydrateFallback } from './hydrate-fallback'
import { createLoaders } from './loaders'
import { RouteErrorBoundary } from './route-error-boundary'

export function createRoutes({ queryClient }: { queryClient: QueryClient }): RouteObject[] {
  const loaders = createLoaders(queryClient)

  return [
    {
      path: ROUTES.Login,
      loader: loaders.loginLoader,
      lazy: async () => ({ Component: (await import('@/pages/login')).LoginPage }),
      hydrateFallbackElement: <HydrateFallback />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      // Phải là route riêng ngoài khung: nếu rơi vào `*` dưới `/`, sessionLoader lại chuyển về đây và lặp vô hạn.
      // Tạm hiện trang không tìm thấy; Task 12 thay bằng ChangePasswordPage.
      path: ROUTES.ChangePassword,
      loader: loaders.changePasswordLoader,
      lazy: async () => ({ Component: (await import('@/pages/not-found')).NotFoundPage }),
      hydrateFallbackElement: <HydrateFallback />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: ROUTES.Home,
      loader: loaders.sessionLoader,
      element: <AppShell />,
      // Lỗi của loader phiên (mất mạng, 5xx lúc khởi động) xảy ra trước khi có khung điều hướng nên phải bắt ở đây.
      hydrateFallbackElement: <HydrateFallback />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          // Lỗi của trang con hiện bên trong khung điều hướng thay vì thay cả khung.
          errorElement: <RouteErrorBoundary />,
          children: [
            // Trang gốc chỉ chuyển hướng tới trang đích theo quyền.
            { index: true, loader: loaders.homeLoader },
            // Route con của trang (có `loader: loaders.guard({ ... })` khi cần quyền) thêm vào đây.
            {
              path: '*',
              lazy: async () => ({ Component: (await import('@/pages/not-found')).NotFoundPage }),
            },
          ],
        },
      ],
    },
  ]
}
