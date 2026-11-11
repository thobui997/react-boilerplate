import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { AppProviders, createQueryClient, toastNotifier } from '@/app/bootstrap'
import { createAppRouter, wireSessionEvents } from '@/app/router'
import { setNotifier } from '@/shared/lib/notify'
import { Toaster } from '@/shared/ui/sonner'
import '@/app/styles/index.css'

// Router tạo một lần ở phạm vi module: sự kiện hết phiên (ngoài React) cần gọi router.navigate.
const queryClient = createQueryClient()
const router = createAppRouter({ queryClient })
wireSessionEvents(router, queryClient)

// Mặc định `notify` chỉ dựng một phần tử role="status" tự gỡ; ở bản chạy thật nối nó với Sonner.
// Chỉ nối ở đây (không trong AppProviders) để test dựng app bằng renderRoute vẫn dùng notifier mặc định.
setNotifier(toastNotifier)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </AppProviders>
  </StrictMode>,
)
