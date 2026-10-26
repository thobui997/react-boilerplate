import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { sessionQueries } from '@/entities/session'
import { createSessionRefresher } from './refresh-session-on-forbidden'

export function createQueryClient(): QueryClient {
  const refreshOnForbidden = createSessionRefresher({
    invalidate: () => queryClient.invalidateQueries({ queryKey: sessionQueries.all() }),
    now: Date.now,
  })
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: refreshOnForbidden }),
    mutationCache: new MutationCache({ onError: refreshOnForbidden }),
    defaultOptions: {
      // Làm tươi khi quay lại tab/có mạng bằng focusManager/onlineManager mặc định.
      // 'always': ngoại tuyến mà chưa có dữ liệu phải thấy lỗi + "Thử lại" ngay; mặc định 'online' tạm dừng truy vấn
      // nên trang treo ở trạng thái đang tải mãi.
      queries: {
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        networkMode: 'always',
      },
      // 'always': gửi khi ngoại tuyến phải báo lỗi ngay; mặc định 'online' sẽ treo rồi tự gửi khi có mạng lại
      // (có thể gửi muộn ngoài ý muốn).
      mutations: { retry: false, networkMode: 'always' },
    },
  })
  return queryClient
}
