'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { Photo, revealEase } from '@/shared/components/common'
import { buttonVariants } from '@/shared/components/ui/button'
import { consultantRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { findMatchRange } from '../services/consultation.service'
import type { Consultant } from '../types/consultation.types'

interface ConsultantCardProps {
  consultant: Consultant
  className?: string
  /** Từ khoá đang tìm — tô nền xanh nhạt đúng đoạn khớp (mục 5). */
  query?: string
  /** Bấm chip chuyên môn (gợi ý) → áp luôn bộ lọc đó (mục 9). */
  onSelectSpecialty?: (specialtyId: string) => void
  /** Thứ tự trong lưới — cho hiệu ứng "làn sóng" lúc vào trang (mục 8). */
  index?: number
}

/** Tô nền xanh nhạt đúng đoạn khớp `query` trong `text`, giữ nguyên phần còn lại. */
export function HighlightedText({ text, query }: { text: string; query?: string }) {
  const range = query ? findMatchRange(text, query) : null
  if (!range) return <>{text}</>
  return (
    <>
      {text.slice(0, range.start)}
      <mark className='bg-accent text-inherit rounded-sm'>{text.slice(range.start, range.end)}</mark>
      {text.slice(range.end)}
    </>
  )
}

/**
 * Thẻ kiến trúc sư trong lưới 3 cột (mục VIII.1, Hình 14) và ở section Tư vấn
 * 1:1 trang chủ (mục III.2).
 *
 * Ảnh chân dung dọc bên trái, thông tin bên phải; dòng "12 năm kinh nghiệm ·
 * 85+ công trình" là thứ khách so sánh giữa các KTS nên để màu thương hiệu.
 *
 * ★ Trang Tư vấn 1:1, mục 8–10: bấm BẤT KỲ đâu trên thẻ đều mở hồ sơ — một
 * link TRONG SUỐT phủ kín thẻ lo việc đó, còn nội dung phía trên tắt
 * `pointer-events` để không chặn nó, TRỪ chip chuyên môn (mục 9) tự bật lại
 * `pointer-events` vì nó có việc riêng (áp bộ lọc, không điều hướng). Rê thẻ:
 * nhấc + bóng mềm, ảnh phóng nhẹ; nút "Xem hồ sơ" (chỉ trang trí, không phải
 * link riêng) đổ đầy màu xanh từ trái khi rê, và lún xuống lúc bấm — bản thân
 * cái THẺ không lún, chỉ nút mới lún, nên state `pressed` được nhấc lên đây
 * và bơm xuống qua prop (nút không tự nhận pointer event vì nằm trong vùng
 * `pointer-events-none`, click thật rơi vào link phủ thẻ).
 */
export function ConsultantCard({ consultant, className, query, onSelectSpecialty, index = 0 }: ConsultantCardProps) {
  const t = useTranslations('consult.card')
  const [pressed, setPressed] = useState(false)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{
        layout: { duration: 0.35, ease: revealEase },
        default: { duration: 0.4, delay: index * 0.06, ease: revealEase }
      }}
      whileHover={{ y: -4 }}
      className={cn(
        'group group/card bg-card hover:border-primary/50 relative h-full min-w-0 rounded-xl border p-3 transition-[border-color,box-shadow] hover:shadow-lg',
        className
      )}
    >
      {/* Link trong suốt phủ kín thẻ — "bấm bất kỳ chỗ nào = Xem hồ sơ". */}
      <Link
        href={consultantRoute(consultant.id)}
        aria-label={`${t('viewProfile')} ${consultant.name}`}
        className='absolute inset-0 rounded-xl'
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
      />

      <div className='pointer-events-none relative flex h-full items-stretch gap-3'>
        <div className='min-h-36 w-24 shrink-0 self-stretch overflow-hidden rounded-lg sm:w-28'>
          <Photo
            className='size-full transition-transform duration-500 group-hover:scale-110'
            src={consultant.avatarUrl}
            alt={consultant.name}
            sizes='112px'
          />
        </div>

        <div className='min-w-0 flex-1 space-y-2'>
          <div className='space-y-0.5'>
            <h3 className='truncate font-semibold'>
              <HighlightedText text={consultant.name} query={query} />
            </h3>
            <p className='text-muted-foreground truncate text-xs' title={consultant.title}>
              {consultant.title}
            </p>
            {consultant.company && (
              <p className='text-muted-foreground/80 truncate max-md:text-xs text-[11px]' title={consultant.company}>
                {t('company', { company: consultant.company })}
              </p>
            )}
          </div>

          {/* Khung chuyên môn cao CỐ ĐỊNH (tối đa 2 hàng): dữ liệu API có nhiều/ít chip, tên dài ngắn khác nhau nhưng
              mọi thẻ vẫn cao bằng nhau. Mỗi chip một dòng, cắt "…", rê chuột xem đủ tên. */}
          <div className='pointer-events-auto flex h-[3.25rem] flex-wrap content-start gap-1.5 overflow-hidden'>
            {consultant.specialties.map((specialty) => (
              <button
                key={specialty.id}
                type='button'
                onClick={() => onSelectSpecialty?.(specialty.id)}
                title={specialty.label}
                className='bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground relative z-10 max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors'
              >
                <HighlightedText text={specialty.label} query={query} />
              </button>
            ))}
          </div>

          <p className='text-primary text-xs'>
            {t('experience', { years: consultant.yearsExperience })}
            <span aria-hidden> · </span>
            {t('projects', { count: consultant.projectCount })}
          </p>

          <p className='text-muted-foreground line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed'>
            {consultant.headline}
          </p>

          <ViewProfileAffordance pressed={pressed}>{t('viewProfile')}</ViewProfileAffordance>
        </div>
      </div>
    </motion.article>
  )
}

/**
 * "Xem hồ sơ" chỉ là TRANG TRÍ — điều hướng thật do link trong suốt phủ thẻ
 * đảm nhận, nên đây là `<span>` chứ không phải link/nút riêng (lồng thêm một
 * link vào trong link phủ thẻ là HTML không hợp lệ). Bấm thẻ thì riêng nút này
 * lún xuống (`pressed` do `ConsultantCard` bơm xuống) — cái thẻ bao quanh đứng yên.
 *
 * Hai bản theo màn hình, chỉ MOBILE đổi: dưới `md` là nút pill `outline` giống nút
 * "Đặt lịch" ở trang chủ (rê thẻ → nền xanh đặc); từ `md` trở lên giữ nguyên bản
 * cũ — viền xanh nhạt bo vuông, nền xanh đổ đầy từ trái sang, chữ chuyển trắng
 * (mục 10).
 */
function ViewProfileAffordance({ children, pressed }: { children: ReactNode; pressed: boolean }) {
  return (
    <>
      <motion.span
        animate={{ scale: pressed ? 0.94 : 1 }}
        transition={{ duration: 0.15, ease: revealEase }}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'text-primary group-hover/card:bg-primary group-hover/card:text-primary-foreground group-hover/card:bg-none h-8 w-full text-xs md:hidden'
        )}
      >
        {children}
      </motion.span>
      <motion.span
        animate={{ scale: pressed ? 0.94 : 1 }}
        transition={{ duration: 0.15, ease: revealEase }}
        className='border-primary/60 text-primary relative isolate hidden h-8 w-full items-center justify-center overflow-hidden rounded-md border text-xs font-medium md:flex'
      >
        <span
          aria-hidden
          className='bg-primary absolute inset-0 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100'
        />
        <span className='relative z-10 transition-colors duration-300 group-hover:text-white'>{children}</span>
      </motion.span>
    </>
  )
}
