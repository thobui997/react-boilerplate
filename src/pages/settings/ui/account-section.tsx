import { messages } from '@/shared/i18n'

export function AccountSection({ onSignOut }: { onSignOut: () => void }) {
  return (
    <section aria-labelledby="settings-account">
      <h2 id="settings-account">{messages.settings.account.title}</h2>
      {/* Khung ứng dụng cũng có nút "Đăng xuất": nhãn riêng để phân biệt hai nút khi đọc bằng trình đọc màn hình. */}
      <button type="button" aria-label={messages.settings.account.signOutLabel} onClick={onSignOut}>
        {messages.signOut.action}
      </button>
    </section>
  )
}
