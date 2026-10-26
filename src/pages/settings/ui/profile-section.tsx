import type { User } from '@/entities/session'
import { messages } from '@/shared/i18n'

export function ProfileSection({ user }: { user: User }) {
  return (
    <section aria-labelledby="settings-profile">
      <h2 id="settings-profile">{messages.settings.profile.title}</h2>
      <p>{user.displayName}</p>
      <p>{user.username}</p>
      <p>{messages.settings.profile.role(user.role)}</p>
    </section>
  )
}
