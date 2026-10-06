import { defineRouting } from 'next-intl/routing'

/** Supported locales. Vietnamese is the default; English is the fallback. */
export const LOCALES = ['vi', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'vi'
export const FALLBACK_LOCALE: Locale = 'en'

/**
 * Shared routing definition consumed by the middleware, navigation helpers
 * and request config. `localePrefix: 'always'` yields `/vi/...` and `/en/...`.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always'
})
