import { ThemeToggleButton } from '@/features/toggle-theme'
import { messages } from '@/shared/i18n'

export function AppearanceSection() {
  return (
    <section aria-labelledby="settings-appearance">
      <h2 id="settings-appearance">{messages.settings.appearance.title}</h2>
      <ThemeToggleButton />
    </section>
  )
}
