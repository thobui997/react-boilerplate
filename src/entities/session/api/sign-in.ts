import type { QueryClient } from '@tanstack/react-query'
import { getAuthAdapter, http, tokenStore, type Credentials } from '@/shared/api'
import { sessionQueries } from './queries'

export async function signIn(credentials: Credentials): Promise<void> {
  const tokens = await getAuthAdapter().login(http, credentials)
  tokenStore.setSession(tokens)
}

// Đăng nhập rồi nạp người dùng hiện tại vào cache phiên; chỉ resolve khi người dùng đã về. Dùng chung cho trang đăng
// nhập và đăng nhập lại ngầm sau khi đổi mật khẩu.
export async function signInAndLoadUser(
  queryClient: QueryClient,
  credentials: Credentials,
): Promise<void> {
  await signIn(credentials)
  // Trang đăng nhập không có truy vấn phiên nào đang hoạt động nên invalidate sẽ không tải lại gì:
  // fetchQuery bỏ qua độ tươi và luôn lấy người dùng mới.
  try {
    await queryClient.fetchQuery({ ...sessionQueries.current(), staleTime: 0 })
  } catch (error) {
    // Đăng nhập đúng nhưng chưa lấy được người dùng: không để lại phiên mồ côi mà giao diện báo là lỗi.
    tokenStore.clear()
    throw error
  }
}
