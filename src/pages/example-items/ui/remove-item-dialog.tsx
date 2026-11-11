import { messages } from '@/shared/i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'

const text = messages.exampleItems

interface RemoveItemDialogProps {
  // Tên mục được giữ lại cả khi đóng, để chữ không biến mất giữa lúc hộp thoại mờ dần.
  itemName: string
  open: boolean
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function RemoveItemDialog({
  itemName,
  open,
  isPending,
  onConfirm,
  onClose,
}: RemoveItemDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.confirmRemove(itemName)}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{text.form.cancel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={onConfirm}>
            {text.remove}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
