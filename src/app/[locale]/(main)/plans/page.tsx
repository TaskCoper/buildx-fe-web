import { setRequestLocale } from 'next-intl/server'

import { PlanPricing } from '@/features/plans'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { PlanTabs } from './plan-tabs'
import { HomeContentProvider } from '@/shared/cms/home-content'
import { fetchPageContent } from '@/shared/cms/home-content.server'

export const generateMetadata = pageMetadata('plans')

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** S01 — Bảng giá gói thiết kế, tab đầu của trang Bảng giá. */
export default async function PlansPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { sections, iconNodes } = await fetchPageContent('plans', locale)

  return (
    <>
      <PlanTabs active='design' />
      <HomeContentProvider sections={sections} iconNodes={iconNodes}>
        <PlanPricing />
      </HomeContentProvider>
    </>
  )
}
