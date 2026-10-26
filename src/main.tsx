import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { AppProviders, createQueryClient } from '@/app/bootstrap'
import { createAppRouter, wireSessionEvents } from '@/app/router'
import '@/app/styles/index.css'

// Router tạo một lần ở phạm vi module: sự kiện hết phiên (ngoài React) cần gọi router.navigate.
const queryClient = createQueryClient()
const router = createAppRouter({ queryClient })
wireSessionEvents(router, queryClient)

// Thông báo mặc định là một phần tử role="status" tự gỡ sau vài giây. Nối thư viện toast của dự án tại đây, ví dụ:
// import { setNotifier } from '@/shared/lib/notify'
// setNotifier({ info: toast.info, success: toast.success, error: toast.error })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
