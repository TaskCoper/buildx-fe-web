import { getTranslations, setRequestLocale } from 'next-intl/server'

import { FavoriteGrid } from '@/features/account'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('accountFavorites')

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AccountFavoritesPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)
  const t = await getTranslations('account.favorites')

  return (
    <section className='space-y-4'>
      <p className='text-muted-foreground text-sm text-pretty'>{t('description')}</p>
      <FavoriteGrid />
    </section>
  )
}
