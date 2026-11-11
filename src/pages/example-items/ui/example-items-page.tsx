import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { exampleItemQueries, type ExampleItem } from '@/entities/example-item'
import { useCurrentUser } from '@/entities/session'
import { getErrorMessage } from '@/shared/api'
import { messages } from '@/shared/i18n'
import { can, Permissions } from '@/shared/lib/access'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { useDeleteExampleItemMutation } from '../api/mutations'
import { ExampleItemForm } from './example-item-form'
import { RemoveItemDialog } from './remove-item-dialog'

const text = messages.exampleItems

type Editor = { kind: 'create' } | { kind: 'edit'; item: ExampleItem }

// Giữ `item` cả khi `open` là false: hộp thoại cần tên mục trong lúc đóng dần.
interface Removal {
  item: ExampleItem
  open: boolean
}

// Không bọc <main>: trang hiện bên trong khung ứng dụng (đã có <main>).
export function ExampleItemsPage() {
  const user = useCurrentUser()
  const list = useQuery(exampleItemQueries.list())
  const remove = useDeleteExampleItemMutation()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [removal, setRemoval] = useState<Removal | null>(null)

  // Loader đã bảo đảm có phiên; nhánh này chỉ để thoả kiểu.
  if (!user) return null
  const canWrite = can(user, Permissions.ItemWrite)

  const closeRemoval = () => setRemoval((current) => current && { ...current, open: false })

  const confirmRemove = () => {
    if (!removal || remove.isPending) return
    const { item } = removal
    closeRemoval()
    remove.mutate(item.id, {
      onSuccess: () => {
        if (editor?.kind === 'edit' && editor.item.id === item.id) setEditor(null)
      },
    })
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-xl font-semibold">{text.title}</h1>
      {canWrite && !editor && (
        <Button type="button" onClick={() => setEditor({ kind: 'create' })}>
          {text.add}
        </Button>
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
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-destructive text-sm">
            {getErrorMessage(list.error, text.loadFailed)}
          </p>
          <Button type="button" variant="outline" onClick={() => void list.refetch()}>
            {text.retry}
          </Button>
        </div>
      )}
      {list.isSuccess && list.data.length === 0 && <p>{text.empty}</p>}
      {list.isSuccess && list.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{text.columns.name}</TableHead>
              <TableHead>{text.columns.description}</TableHead>
              <TableHead>{text.columns.createdAt}</TableHead>
              {canWrite && <TableHead>{text.columns.actions}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </time>
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditor({ kind: 'edit', item })}
                      >
                        {text.edit}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => setRemoval({ item, open: true })}
                      >
                        {text.remove}
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {removal && (
        <RemoveItemDialog
          itemName={removal.item.name}
          open={removal.open}
          isPending={remove.isPending}
          onConfirm={confirmRemove}
          onClose={closeRemoval}
        />
      )}
    </div>
  )
}
