import { ThemeToggleButton } from '@/features/toggle-theme'
import { messages } from '@/shared/i18n'

export function AppearanceSection() {
  return (
    <section aria-labelledby="settings-appearance" className="flex flex-col items-start gap-3">
      <h2 id="settings-appearance" className="text-lg font-medium">
        {messages.settings.appearance.title}
      </h2>
      <ThemeToggleButton />
    </section>
  )
}
