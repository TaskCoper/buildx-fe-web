import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { FALLBACK_LOCALE, routing, type Locale } from './routing'

/**
 * Per-request i18n configuration for Server Components.
 *
 * Resolves the active locale from the URL segment, loads its message bundle,
 * and merges the fallback (English) bundle underneath so any missing key in a
 * non-default locale gracefully degrades instead of rendering a raw key.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale: Locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  const [localeMessages, fallbackMessages] = await Promise.all([
    import(`../../messages/${locale}.json`).then((m) => m.default),
    locale === FALLBACK_LOCALE
      ? Promise.resolve({})
      : import(`../../messages/${FALLBACK_LOCALE}.json`).then((m) => m.default)
  ])

  return {
    locale,
    messages: { ...fallbackMessages, ...localeMessages }
  }
})
