import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { HomeBrands, HomePainPoints, HomeStats, HomeTestimonials } from '@/features/landing'
import { HandbookHighlights } from '@/features/handbook'
import { HomeContentProvider } from '@/shared/cms/home-content'
import { fetchHomeContent } from '@/shared/cms/home-content.server'
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

/**
 * Màn hình 1 — Trang chủ (mục II.2).
 *
 * Chữ, ảnh và icon của các khối do admin biên tập (khối `home` của backend) được lấy ở server rồi đưa xuống qua
 * `HomeContentProvider`, để HTML đầu tiên đã đúng nội dung mới. Backend không trả được thì mọi section dùng nội dung
 * có sẵn trong ứng dụng, trang chủ vẫn mở bình thường.
 */
export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { sections, iconNodes } = await fetchHomeContent(locale)

  return (
    <HomeContentProvider sections={sections} iconNodes={iconNodes}>
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
    </HomeContentProvider>
  )
}
