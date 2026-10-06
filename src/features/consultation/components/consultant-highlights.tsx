'use client'

import { ArrowRight, ChevronRight, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { revealEase } from '@/shared/components/common'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { consultantRoute, ROUTES } from '@/shared/constants/routes'
import { HOME_CONSULTANT_COUNT } from '../constants/consultation.constants'
import { useConsultants, useMyConsultations } from '../hooks/use-consultation'
import { sortConsultants } from '../services/consultation.service'
import type { Consultant } from '../types/consultation.types'

interface ConsultantHighlightsProps {
  /**
   * Chuyên môn ưu tiên theo loại công trình của dự án dở gần nhất (mục II.2)
   * — trùng id với `BuildingType` của `features/design` nên lớp app chỉ cần
   * truyền thẳng `project.buildingType`, không cần bảng ánh xạ nào.
   */
  preferredSpecialtyId?: string
}

/** Lịch còn hiệu lực (chưa diễn ra / chưa hủy) — chỉ những lịch này mới tính là "Đã đặt lịch". */
const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'confirmed'])

/**
 * ★ Section "Tư vấn 1:1" trên trang chủ (mục III.2).
 *
 * Thẻ ở đây RÚT GỌN hơn `ConsultantCard` của trang Tư vấn: ảnh tròn, tên, một
 * dòng chuyên môn và nút đặt lịch — đúng ảnh mockup. Đánh giá, số năm kinh
 * nghiệm, ảnh công trình để dành cho trang danh sách, trang chủ không cần.
 *
 * ★ Thẻ hiện lần lượt, vòng viền ảnh "vẽ" 1 vòng lúc hiện; rê thẻ: nhấc + phóng
 * ảnh nhẹ, nút "Đặt lịch" đầy màu. Có dự án dở → KTS đúng chuyên môn của loại
 * công trình đó trượt lên đầu danh sách (`layout` của motion tự animate vị trí
 * khi thứ tự mảng đổi, không cần tự tính transform).
 *
 * "Đặt lịch" dẫn tới hồ sơ KTS để chọn khung giờ (mục VIII.2). Nút chỉ thành
 * "Đã đặt lịch" khi hệ thống CÓ lịch hẹn còn hiệu lực với KTS đó (góp ý BuildX:
 * trước đây bấm là đổi ngay, tải lại thì mất, không tạo lịch nào).
 */
export function ConsultantHighlights({ preferredSpecialtyId }: ConsultantHighlightsProps) {
  const t = useTranslations('consult.home')
  const { data: consultants, isPending } = useConsultants()
  const { isAuthenticated } = useAuth()
  const { data: history } = useMyConsultations(isAuthenticated)
  const bookedConsultantIds = new Set(
    (history?.bookings ?? [])
      .filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status))
      .map((booking) => booking.consultantId)
  )

  const ordered = sortConsultants(consultants ?? [], preferredSpecialtyId).slice(0, HOME_CONSULTANT_COUNT)

  return (
    <section className='brand-band'>
      <div className='mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
        <header className='mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-2 lg:mb-8 lg:gap-x-10'>
          <div className='contents'>
            {/* Cùng khuôn với "Hướng dẫn sử dụng": tiêu đề + một dòng mô tả, không có dòng nhãn. */}
            <h2 className='text-2xl font-bold tracking-tight text-balance lg:text-[1.75rem]'>{t('titleMobile')}</h2>
            <p className='text-primary-foreground col-span-2 row-start-2 max-w-2xl text-sm text-pretty'>
              {t('title')}. {t('subtitle')}
            </p>
          </div>

          <Link
            href={ROUTES.CONSULT}
            className='max-lg:h-8 max-lg:shrink-0 hover:text-primary-foreground focus-visible:text-primary-foreground col-start-2 row-start-1 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:underline'
          >
            {/* Mobile: chỉ còn mũi tên, chữ giữ lại cho trình đọc màn hình. */}
            <span className='max-lg:sr-only'>{t('viewAll')}</span>
            <ChevronRight className='size-6 lg:hidden' />
            <ArrowRight className='hidden size-4 lg:block' />
          </Link>
        </header>

        <ul className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {isPending
            ? Array.from({ length: HOME_CONSULTANT_COUNT }, (_, index) => (
                <li key={index}>
                  <Skeleton className='h-28 w-full rounded-2xl' />
                </li>
              ))
            : ordered.map((consultant, index) => (
                <ConsultantHighlightCard
                  key={consultant.id}
                  consultant={consultant}
                  index={index}
                  isBooked={isAuthenticated && bookedConsultantIds.has(consultant.id)}
                />
              ))}
        </ul>
      </div>
    </section>
  )
}

function ConsultantHighlightCard({
  consultant,
  index,
  isBooked
}: {
  consultant: Consultant
  index: number
  isBooked: boolean
}) {
  const t = useTranslations('consult.home')

  return (
    <motion.li
      layout
      layoutId={consultant.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ layout: { duration: 0.4, ease: revealEase }, opacity: { duration: 0.5, delay: index * 0.1 } }}
      whileHover={{ y: -4 }}
      className='group/card bg-card text-card-foreground flex items-center gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-lg'
    >
      {/* Ảnh, tên và nút đều dẫn sang hồ sơ KTS (nơi chọn khung giờ) — ba liên
          kết riêng vì cột phải xếp dọc, không bọc chung được một thẻ <a>. */}
      <Link href={consultantRoute(consultant.id)} className='contents'>
        {/* Rê cả thẻ (không riêng ảnh) mới phóng ảnh nhẹ — `group-hover/card`. */}
        <Avatar className='group-hover/card:scale-105 size-18 shrink-0 transition-transform duration-300'>
          <AvatarImage src={consultant.avatarUrl} alt={consultant.name} />
          <AvatarFallback>{consultant.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </Link>

      {/* Ảnh nằm ngoài cùng bên trái, CỘT PHẢI xếp dọc: tên · chuyên môn
          · nút. Nút rộng bằng cột phải chứ không bằng cả thẻ (ảnh
          mockup). Tên giữ màu đen cố định, không đổi màu khi rê thẻ. */}
      <div className='min-w-0 flex-1 space-y-2'>
        <Link href={consultantRoute(consultant.id)} className='block space-y-0.5'>
          <p className='truncate text-sm font-bold'>{consultant.name}</p>
          <p className='text-muted-foreground truncate text-xs'>{consultant.specialties[0]?.label}</p>
        </Link>

        {isBooked ? (
          <Button
            asChild
            variant='outline'
            className='border-primary/40 text-primary-strong bg-primary/5 h-8 w-full rounded-full text-xs'
          >
            <Link href={consultantRoute(consultant.id)}>
              <Check className='size-3.5' />
              {t('booked')}
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant='outline'
            className='text-primary group-hover/card:text-primary-foreground hover:text-primary-foreground group-hover/card:border-transparent hover:border-transparent group-hover/card:bg-[linear-gradient(to_top,var(--brand-gradient-from),var(--brand-gradient-to))] hover:bg-[linear-gradient(to_top,var(--brand-gradient-from),var(--brand-gradient-to))] h-8 w-full rounded-full text-xs transition-colors'
          >
            <Link href={consultantRoute(consultant.id)}>{t('book')}</Link>
          </Button>
        )}
      </div>
    </motion.li>
  )
}
