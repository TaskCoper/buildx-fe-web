'use client'

import { ArrowRight, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Link } from '@/i18n/navigation'
import { revealEase } from '@/shared/components/common'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES } from '@/shared/constants/routes'
import { HOME_GUIDE_HIGHLIGHT_COUNT } from '../constants/guide.constants'
import { useGuideVideos } from '../hooks/use-guide'
import type { GuideVideo } from '../types/guide.types'
import type { VideoCardOrigin } from './video-card'
import { VideoCard } from './video-card'
import { VideoLightbox } from './video-lightbox'

interface GuideHighlightsProps {
  /** "Tạo dự án ngay" sau khi xem xong video — lớp app nối tới `features/design`. */
  onCreateProject?: () => void
}

/**
 * Khu "Hướng dẫn sử dụng" trên trang chủ (mục II.2):
 * 3 thẻ video nổi bật + liên kết "Xem tất cả" mở trang Hướng dẫn.
 *
 * ★ Bấm thẻ mở hộp video ngay tại trang (không điều hướng); trong hộp có 2
 * video còn lại của khối để chuyển qua lại, xem xong thì gợi ý video kế tiếp
 * + nút "Tạo dự án ngay" (mục II.2, vùng 09).
 */
export function GuideHighlights({ onCreateProject }: GuideHighlightsProps) {
  const t = useTranslations('guide.highlights')
  const { data: videos, isPending } = useGuideVideos()
  const [playing, setPlaying] = useState<GuideVideo | null>(null)
  const [origin, setOrigin] = useState<VideoCardOrigin | null>(null)

  const highlights = videos?.slice(0, HOME_GUIDE_HIGHLIGHT_COUNT) ?? []

  return (
    <section className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
      <header className='mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2 lg:mb-8'>
        <div className='contents'>
          <h2 className='text-2xl font-bold tracking-tight text-balance lg:text-[1.75rem]'>{t('title')}</h2>
          <p className='text-foreground col-span-2 row-start-2 max-w-2xl text-sm text-pretty'>{t('subtitle')}</p>
        </div>
        <Link
          href={ROUTES.GUIDE}
          className='max-lg:h-8 max-lg:shrink-0 text-primary hover:text-brand-orange col-start-2 row-start-1 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:underline'
        >
          {/* Mobile: chỉ còn mũi tên, chữ giữ lại cho trình đọc màn hình. */}
          <span className='max-lg:sr-only'>{t('viewAll')}</span>
          <ChevronRight className='size-6 lg:hidden' />
          <ArrowRight className='hidden size-4 lg:block' />
        </Link>
      </header>

      <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
        {isPending
          ? Array.from({ length: HOME_GUIDE_HIGHLIGHT_COUNT }, (_, i) => (
              <Skeleton key={i} className='h-56 w-full rounded-2xl' />
            ))
          : highlights.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: revealEase }}
              >
                <VideoCard
                  video={video}
                  descriptionLines={1}
                  durationInTitle={false}
                  showPlayWhenUnavailable
                  imageOnlyHover
                  onOpenVideo={(v, cardOrigin) => {
                    setPlaying(v)
                    setOrigin(cardOrigin)
                  }}
                />
              </motion.div>
            ))}
      </div>

      <VideoLightbox
        video={playing}
        onClose={() => setPlaying(null)}
        related={highlights}
        onSelect={(v) => {
          setPlaying(v)
          setOrigin(null)
        }}
        onCreateProject={onCreateProject}
        origin={origin}
      />
    </section>
  )
}
