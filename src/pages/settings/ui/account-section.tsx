import { messages } from '@/shared/i18n'
import { Button } from '@/shared/ui/button'

export function AccountSection({ onSignOut }: { onSignOut: () => void }) {
  return (
    <section aria-labelledby="settings-account" className="flex flex-col items-start gap-3">
      <h2 id="settings-account" className="text-lg font-medium">
        {messages.settings.account.title}
      </h2>
      {/* Khung ứng dụng cũng có nút "Đăng xuất": nhãn riêng để phân biệt hai nút khi đọc bằng trình đọc màn hình. */}
      <Button
        type="button"
        variant="outline"
        aria-label={messages.settings.account.signOutLabel}
        onClick={onSignOut}
      >
        {messages.signOut.action}
      </Button>
    </section>
  )
}
