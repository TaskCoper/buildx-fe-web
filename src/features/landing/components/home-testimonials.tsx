'use client'

import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { cmsText, useCmsCollection, type CmsTestimonial } from '@/shared/cms'
import { revealEase } from '@/shared/components/common'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { useMediaQuery, useScrollSnapIndex } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'

/** Năm sao vàng đặc trên đầu mỗi thẻ đánh giá. */
const STARS = [0, 1, 2, 3, 4]

/** Desktop hiện 3 thẻ một trang; 6 đánh giá → 2 trang lật bằng mũi tên. */
const PAGE_SIZE = 3

/** Trang chủ hiện tối đa 6 đánh giá (góp ý BuildX). */
const MAX_TESTIMONIALS = 6

/**
 * Dải "Khách hàng nói về BuildX" — tối đa 6 đánh giá dạng slide có mũi tên
 * (góp ý BuildX). Ảnh đại diện, tên, thông tin công trình và nội dung nằm trong bảng CMS
 * `testimonials` (admin sửa ở "Nhận xét khách hàng"); trường chữ để trống thì dùng bản dịch trong
 * i18n, ảnh để trống thì hiện chữ cái đầu của tên.
 *
 * ★ Thẻ hiện lần lượt; trong thẻ 5 sao sáng lần lượt → trích dẫn → tên. Rê
 * thẻ: nhấc + vạch xanh mép trái. Desktop: 3 thẻ/trang, mũi tên lật trang.
 * Mobile: vuốt ngang cả 6 thẻ, mũi tên nhảy từng thẻ, có chấm chỉ vị trí.
 */
export function HomeTestimonials() {
  const t = useTranslations('landing.testimonials')
  const [page, setPage] = useState(0)
  const collection = useCmsCollection('testimonials')
  const all = useMemo(
    () =>
      collection
        .filter((item) => item.status === 'active')
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_TESTIMONIALS),
    [collection]
  )
  const { ref: trackRef, active, scrollTo } = useScrollSnapIndex<HTMLUListElement>()

  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const pageCount = Math.ceil(all.length / PAGE_SIZE)
  // Mobile vuốt qua CẢ danh sách; desktop chỉ hiện cửa sổ 3 thẻ của trang hiện tại.
  const items = isDesktop ? all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) : all
  const canPrev = isDesktop ? page > 0 : active > 0
  const canNext = isDesktop ? page < pageCount - 1 : active < all.length - 1

  const goPrev = () => (isDesktop ? setPage((p) => Math.max(0, p - 1)) : scrollTo(active - 1))
  const goNext = () => (isDesktop ? setPage((p) => Math.min(pageCount - 1, p + 1)) : scrollTo(active + 1))

  return (
    <section className='brand-band'>
      <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
        <div className='flex items-center justify-between gap-4'>
          {/* Góp ý BuildX: nhãn nhỏ viết hoa đổi thành headline chính, cùng cỡ với các tiêu đề khối phía trên. */}
          <h2 className='text-2xl font-bold tracking-tight text-balance lg:text-[1.75rem]'>{t('titleMobile')}</h2>

          {all.length > 1 ? (
            <div className='flex items-center gap-2'>
              <button
                type='button'
                aria-label='Previous'
                disabled={!canPrev}
                onClick={goPrev}
                className='hover:bg-accent flex size-8 items-center justify-center rounded-full border disabled:opacity-40'
              >
                <ChevronLeft className='size-4' />
              </button>
              <button
                type='button'
                aria-label='Next'
                disabled={!canNext}
                onClick={goNext}
                className='hover:bg-accent flex size-8 items-center justify-center rounded-full border disabled:opacity-40'
              >
                <ChevronRight className='size-4' />
              </button>
            </div>
          ) : null}
        </div>

        <ul
          ref={trackRef}
          key={isDesktop ? page : 'all'}
          className='mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-hidden pb-1 lg:mt-4 lg:grid lg:grid-cols-3 lg:overflow-visible'
        >
          {items.map((person, index) => (
            <TestimonialCard key={person.id} person={person} index={index} />
          ))}
        </ul>

        {items.length > 1 ? (
          <div className='mt-4 flex items-center justify-center gap-2 lg:hidden'>
            {items.map((person, index) => (
              <button
                key={person.id}
                type='button'
                aria-label={person.name || person.id}
                onClick={() => scrollTo(index)}
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  index === active ? 'bg-primary-foreground' : 'bg-primary-foreground/40'
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function TestimonialCard({ person, index }: { person: CmsTestimonial; index: number }) {
  const t = useTranslations('landing.testimonials')
  // Chữ admin chưa soạn thì rơi về bản dịch mặc định (có cho sáu mã gốc).
  const text = (field: 'name' | 'meta' | 'quote') => {
    const key = `items.${person.id}.${field}` as Parameters<typeof t>[0]
    return cmsText(person[field], t.has(key) ? t(key) : '')
  }
  const name = text('name')
  // Mobile cuộn ngang: thẻ thứ 2 chỉ LÓ một mép nên các phần tử bên trong (thẻ, sao, lời trích)
  // không bao giờ đạt 30–60% diện tích → kẹt ở opacity 0 ngay lần tải đầu, tới khi vuốt mới hiện.
  // `some` = chỉ cần thấy 1 pixel là hiện.
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const amount = (desktop: number) => (isMobile ? 'some' : desktop)

  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: amount(0.3) }}
      transition={{ duration: 0.65, delay: index * 0.12, ease: revealEase }}
      whileHover={{ y: -2, transition: { duration: 0.5, ease: revealEase } }}
      className='bg-card text-card-foreground group relative w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl border p-5 shadow-none transition-shadow hover:shadow-lg lg:w-auto lg:shrink'
    >
      {/* Vạch cam mép DƯỚI — vẽ từ trái sang phải khi rê. */}
      <span className='bg-brand-orange absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-700 ease-out group-hover:scale-x-100' />

      <div className='flex h-full flex-col gap-3'>
        <span className='flex gap-0.5'>
          {STARS.map((star) => (
            <motion.span
              key={star}
              initial={{ opacity: 0, scale: 0.4 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: amount(0.6) }}
              transition={{ duration: 0.25, delay: index * 0.1 + star * 0.08 }}
            >
              <Star className='fill-warning text-warning size-3.5' />
            </motion.span>
          ))}
        </span>

        <motion.blockquote
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: amount(0.4) }}
          transition={{ duration: 0.4, delay: index * 0.1 + 0.5 }}
          className='text-sm leading-relaxed text-pretty'
        >
          {text('quote')}
        </motion.blockquote>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: amount(0.4) }}
          transition={{ duration: 0.4, delay: index * 0.1 + 0.65 }}
          className='mt-auto flex items-center gap-3 pt-1'
        >
          <Avatar className='size-12 shrink-0'>
            {person.avatarUrl ? <AvatarImage src={person.avatarUrl} alt={name} className='object-cover' /> : null}
            <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className='flex min-w-0 flex-col leading-tight'>
            <span className='group-hover:text-brand-orange truncate text-sm font-semibold transition-colors duration-300'>
              {name}
            </span>
            <span className='text-muted-foreground truncate text-xs'>{text('meta')}</span>
          </span>
        </motion.div>
      </div>
    </motion.li>
  )
}
