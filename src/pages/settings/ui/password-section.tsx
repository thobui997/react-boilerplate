import { useState } from 'react'
import { ChangePasswordForm } from '@/features/change-password'
import { messages } from '@/shared/i18n'

interface PasswordSectionProps {
  username: string
  onChanged: () => void
  onReloginFailed: () => void
}

// Đổi mật khẩu tại chỗ (mode "voluntary"): /change-password chỉ dành cho người bị buộc đổi, loader của nó chuyển
// người dùng bình thường đi nơi khác.
export function PasswordSection({ username, onChanged, onReloginFailed }: PasswordSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section aria-labelledby="settings-password">
      <h2 id="settings-password">{messages.settings.password.title}</h2>
      {isOpen ? (
        <ChangePasswordForm
          username={username}
          mode="voluntary"
          onChanged={() => {
            setIsOpen(false)
            onChanged()
          }}
          onReloginFailed={onReloginFailed}
          onCancel={() => setIsOpen(false)}
        />
      ) : (
        <button type="button" onClick={() => setIsOpen(true)}>
          {messages.settings.password.open}
        </button>
      )}
    </section>
  )
}
