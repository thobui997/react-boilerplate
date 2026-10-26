import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createExampleItem,
  deleteExampleItem,
  exampleItemQueries,
  updateExampleItem,
  type ExampleItem,
  type ExampleItemInput,
} from '@/entities/example-item'
import type { ApiError } from '@/shared/api'
import { messages } from '@/shared/i18n'
import { notify, notifyApiError } from '@/shared/lib/notify'

const text = messages.exampleItems

// Cả ba mutation cùng làm mới danh sách khi xong và báo lỗi qua cổng notify; lỗi theo ô (422) form tự đọc từ ApiError.
function useRefreshOnSuccess(successMessage: string) {
  const queryClient = useQueryClient()

  return {
    onSuccess: () => {
      notify.success(successMessage)
      return queryClient.invalidateQueries({ queryKey: exampleItemQueries.all() })
    },
  }
}

export function useCreateExampleItemMutation() {
  return useMutation<ExampleItem, ApiError, ExampleItemInput>({
    mutationFn: createExampleItem,
    ...useRefreshOnSuccess(text.created),
    onError: (error) => notifyApiError(error, text.saveFailed),
  })
}

export function useUpdateExampleItemMutation() {
  return useMutation<ExampleItem, ApiError, { id: string; input: ExampleItemInput }>({
    mutationFn: ({ id, input }) => updateExampleItem(id, input),
    ...useRefreshOnSuccess(text.updated),
    onError: (error) => notifyApiError(error, text.saveFailed),
  })
}

export function useDeleteExampleItemMutation() {
  return useMutation<void, ApiError, string>({
    mutationFn: deleteExampleItem,
    ...useRefreshOnSuccess(text.removed),
    onError: (error) => notifyApiError(error, text.removeFailed),
  })
}
