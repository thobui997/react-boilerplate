import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { exampleItemQueries, type ExampleItem } from '@/entities/example-item'
import { useCurrentUser } from '@/entities/session'
import { getErrorMessage } from '@/shared/api'
import { messages } from '@/shared/i18n'
import { can, Permissions } from '@/shared/lib/access'
import { useDeleteExampleItemMutation } from '../api/mutations'
import { ExampleItemForm } from './example-item-form'

const text = messages.exampleItems

type Editor = { kind: 'create' } | { kind: 'edit'; item: ExampleItem }

// Không bọc <main>: trang hiện bên trong khung ứng dụng (đã có <main>).
export function ExampleItemsPage() {
  const user = useCurrentUser()
  const list = useQuery(exampleItemQueries.list())
  const remove = useDeleteExampleItemMutation()
  const [editor, setEditor] = useState<Editor | null>(null)

  // Loader đã bảo đảm có phiên; nhánh này chỉ để thoả kiểu.
  if (!user) return null
  const canWrite = can(user, Permissions.ItemWrite)

  const confirmRemove = (item: ExampleItem) => {
    if (!window.confirm(text.confirmRemove(item.name))) return
    remove.mutate(item.id, {
      onSuccess: () => {
        if (editor?.kind === 'edit' && editor.item.id === item.id) setEditor(null)
      },
    })
  }

  return (
    <div>
      <h1>{text.title}</h1>
      {canWrite && !editor && (
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          {text.add}
        </button>
      )}
      {canWrite && editor && (
        <ExampleItemForm
          key={editor.kind === 'edit' ? editor.item.id : 'create'}
          item={editor.kind === 'edit' ? editor.item : undefined}
          onClose={() => setEditor(null)}
        />
      )}
      {list.isPending && <p role="status">{text.loading}</p>}
      {list.isError && (
        <div>
          <p role="alert">{getErrorMessage(list.error, text.loadFailed)}</p>
          <button type="button" onClick={() => void list.refetch()}>
            {text.retry}
          </button>
        </div>
      )}
      {list.isSuccess && list.data.length === 0 && <p>{text.empty}</p>}
      {list.isSuccess && list.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>{text.columns.name}</th>
              <th>{text.columns.description}</th>
              <th>{text.columns.createdAt}</th>
              {canWrite && <th>{text.columns.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {list.data.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.description}</td>
                <td>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </time>
                </td>
                {canWrite && (
                  <td>
                    <button type="button" onClick={() => setEditor({ kind: 'edit', item })}>
                      {text.edit}
                    </button>
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => confirmRemove(item)}
                    >
                      {text.remove}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
