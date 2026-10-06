import type { routing } from '@/i18n/routing'
import type messages from '../messages/en.json'

/**
 * Augment next-intl with our locales and message shape so `useTranslations`
 * / `getTranslations` keys are fully type-checked and autocompleted.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages
  }
}
