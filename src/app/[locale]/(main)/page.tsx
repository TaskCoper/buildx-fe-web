import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { HomeBrands, HomePainPoints, HomeStats, HomeTestimonials } from '@/features/landing'
import { HandbookHighlights } from '@/features/handbook'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { ConsultantHighlightsSection } from './consultant-highlights-section'
import { GuideHighlightsSection } from './guide-highlights-section'
import { HomeCtaSection } from './home-cta-section'
import { HomeDossiersSection } from './home-dossiers-section'
import { HomeHeroSection } from './home-hero-section'
import { HomeJourneySection } from './home-journey-section'
import { HomeReminderHost } from './home-reminder-host'
import { HomeServicesSection } from './home-services-section'

export const generateMetadata = pageMetadata('home')

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Màn hình 1 — Trang chủ (mục II.2). */
export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className='relative'>
      <HomeHeroSection />
      <HomeStats />
      <HomePainPoints />
      <HomeJourneySection />
      <HomeServicesSection />
      <HomeDossiersSection />
      <HandbookHighlights />
      <GuideHighlightsSection />
      {/* ★ Section Tư vấn 1:1 (mục III.2) — khối chuyển đổi cuối trang chủ. */}
      <ConsultantHighlightsSection />
      <HomeBrands />
      <HomeTestimonials />
      <HomeCtaSection />
      <HomeReminderHost />
    </div>
  )
}
