'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, ChevronRight, CalendarDays, Clock, Tag } from 'lucide-react'
import { motion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { revealEase, RevealPhoto } from '@/shared/components/common'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES, handbookArticleRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/utils'
import { ARTICLE_META_ICON, ARTICLE_META_TEXT } from '../constants/article-meta'
import { useArticleLabels } from '../hooks/use-article-labels'
import { HOME_HANDBOOK_COUNT } from '../constants/handbook.constants'
import { useHandbookArticles } from '../hooks/use-handbook'
import { sortByNewest } from '../services/handbook.service'

/** Bài đăng trong 14 ngày gần nhất được gắn nhãn "Mới" (mục II.2, vùng 08). */
const NEW_BADGE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Khối "Cẩm nang xây nhà" trên TRANG CHỦ — ba bài mới nhất.
 *
 * Khác `LatestNews` (nằm trong trang Cẩm nang, thẻ nằm ngang, đo bằng thời gian
 * đọc): ở trang chủ thẻ là ảnh trên – chữ dưới và ghi chuyên mục + ngày đăng,
 * đúng như ảnh mockup khách gửi.
 *
 * ★ Thẻ hiện lần lượt, ảnh hiện dần; rê thẻ: ảnh phóng nhẹ + phủ xanh mờ, tiêu
 * đề đổi xanh, lộ dòng "Đọc ~x phút →" trong khoảng đã chừa sẵn.
 */
export function HandbookHighlights() {
  const t = useTranslations('handbook.home')
  const { nameOf: labelName } = useArticleLabels()
  const locale = useLocale() as Locale

  const { data: articles, isPending } = useHandbookArticles(undefined, undefined, { source: 'mock' })
  const latest = useMemo(() => sortByNewest(articles ?? []).slice(0, HOME_HANDBOOK_COUNT), [articles])
  // Chốt mốc "bây giờ" một lần khi mount thay vì gọi `Date.now()` ngay trong
  // JSX của mỗi lần render — nhãn "Mới" không cần cập nhật tức thời tới từng
  // mili-giây trong lúc khách đang xem trang.
  const [now] = useState(() => Date.now())

  return (
    <section className='brand-band'>
      <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
        <header>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 lg:gap-x-10'>
            <h2 className='text-2xl font-bold tracking-tight text-balance lg:text-[1.75rem]'>{t('title')}</h2>

            <Link
              href={ROUTES.HANDBOOK}
              className='max-lg:h-8 max-lg:shrink-0 hover:text-primary-foreground focus-visible:text-primary-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:underline'
            >
              {/* Mobile: chỉ còn mũi tên, chữ giữ lại cho trình đọc màn hình. */}
              <span className='max-lg:sr-only'>{t('viewAll')}</span>
              <ChevronRight className='size-6 lg:hidden' />
              <ArrowRight className='hidden size-4 lg:block' />
            </Link>
          </div>
        </header>

        <ul className='mt-4 grid gap-5 lg:mt-8 sm:grid-cols-2 lg:grid-cols-3'>
          {isPending
            ? Array.from({ length: HOME_HANDBOOK_COUNT }, (_, index) => (
                <li key={index}>
                  <Skeleton className='h-64 w-full rounded-2xl' />
                </li>
              ))
            : latest.map((article, index) => {
                const isNew = now - new Date(article.publishedAt).getTime() < NEW_BADGE_WINDOW_MS

                return (
                  <motion.li
                    key={article.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: index * 0.1, ease: revealEase }}
                  >
                    <Link
                      href={handbookArticleRoute(article.slug)}
                      className='bg-card text-card-foreground group hover:border-primary/50 flex h-full flex-col overflow-hidden rounded-2xl border transition-colors'
                    >
                      <div className='relative'>
                        <RevealPhoto
                          className='aspect-[16/9] w-full'
                          src={article.imageUrl}
                          alt={article.title}
                          sizes='(max-width: 1024px) 50vw, 420px'
                        />
                        {/* Phủ xanh mờ khi rê — nằm ĐÈ LÊN ảnh, không thay ảnh. */}
                        <div className='bg-primary/0 group-hover:bg-primary/20 pointer-events-none absolute inset-0 transition-colors duration-300' />
                        {isNew ? (
                          <span className='bg-primary text-primary-foreground absolute top-3 left-3 rounded-md px-2 py-0.5 max-md:text-xs text-[11px] font-semibold'>
                            {t('newBadge')}
                          </span>
                        ) : null}
                      </div>
                      <span className='flex flex-1 flex-col gap-2 p-4'>
                        <span className='group-hover:text-brand-orange line-clamp-2 font-bold transition-colors'>
                          {article.title}
                        </span>
                        <span className={cn(ARTICLE_META_TEXT, 'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs')}>
                          <span className='flex items-center gap-1.5'>
                            <Tag className={cn(ARTICLE_META_ICON, 'size-3.5')} />
                            {labelName(article.category)}
                          </span>
                          <span className='flex items-center gap-1.5 border-l pl-4 whitespace-nowrap'>
                            <CalendarDays className={cn(ARTICLE_META_ICON, 'size-3.5')} />
                            {formatDisplayDate(article.publishedAt, locale)}
                          </span>
                          {/* Thời gian đọc nằm cùng hàng ngày đăng (góp ý BuildX) — bớt một dòng dưới thẻ. */}
                          <span className='flex items-center gap-1.5 border-l pl-4 whitespace-nowrap'>
                            <Clock className={cn(ARTICLE_META_ICON, 'size-3.5')} />
                            {t('readTime', { minutes: article.readingMinutes })}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </motion.li>
                )
              })}
        </ul>
      </div>
    </section>
  )
}
