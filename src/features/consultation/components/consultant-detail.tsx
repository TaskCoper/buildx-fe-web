'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { useTranslations } from 'next-intl'

import { ErrorState, revealEase } from '@/shared/components/common'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useAvailability, useConsultant, useConsultants } from '../hooks/use-consultation'
import { ConsultantProfile } from './consultant-profile'
import { ConsultantRail } from './consultant-rail'
import { useConsultTransitionState } from './consult-transition-state'

interface ConsultantDetailProps {
  consultantId: string
}

/**
 * Trang hồ sơ kiến trúc sư + chọn giờ (mục VIII.2, Hình 15).
 *
 * Giữ nguyên tiêu đề của trang danh sách ở trên đầu như trong ảnh — khách vẫn
 * đang ở luồng "chọn kiến trúc sư", chỉ là đã mở một người ra xem.
 *
 * ★ CC-03 (đổi KTS trong màn này): khung thẻ bên phải (`bg-card` + viền) ĐỨNG
 * YÊN — không remount — chỉ nội dung BÊN TRONG mờ và trượt lên từ dưới khi đổi
 * người. Thanh chọn bên trái giữ nguyên state tìm kiếm và vị trí cuộn.
 */
export function ConsultantDetail({ consultantId }: ConsultantDetailProps) {
  const t = useTranslations('consult.directory')
  const tProfile = useTranslations('consult.profile')
  const reduceMotion = useReducedMotion()
  const { selectedDate, setSelectedDate, profileDirection } = useConsultTransitionState()
  const [timeChoice, setTimeChoice] = useState({ consultantId, time: '' })
  const selectedTime = timeChoice.consultantId === consultantId ? timeChoice.time : ''
  const setSelectedTime = (time: string) => setTimeChoice({ consultantId, time })

  const { data: consultants, isPending: listPending } = useConsultants()
  const { data: consultant, isPending, isError } = useConsultant(consultantId)
  const { data: days, isPending: daysPending } = useAvailability(consultantId)
  const visibleConsultant = consultant ?? consultants?.find((item) => item.id === consultantId)

  return (
    <div className='mx-auto w-full max-w-[90rem] space-y-5 lg:space-y-6 px-4 py-5 lg:px-8'>
      <header className='space-y-2 text-center'>
        <h2 className='text-2xl font-semibold tracking-tight text-balance sm:text-3xl'>{t('title')}</h2>
        <p className='text-muted-foreground'>{t('subtitle')}</p>
      </header>

      <div className='grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]'>
        <ConsultantRail consultants={consultants ?? []} activeId={consultantId} isPending={listPending} />

        <div className='bg-card relative min-w-0 overflow-hidden rounded-xl border p-4 sm:p-6'>
          <AnimatePresence mode='wait' initial={false} custom={profileDirection}>
            <motion.div
              key={consultantId}
              custom={profileDirection}
              className='min-w-0'
              variants={profileVariants}
              initial={reduceMotion ? { opacity: 0 } : 'enter'}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : 'exit'}
              transition={{ duration: reduceMotion ? 0.01 : 0.3, ease: revealEase }}
            >
              {isPending && !visibleConsultant ? (
                <Skeleton className='h-[32rem] w-full rounded-xl' />
              ) : (isError && !visibleConsultant) || !visibleConsultant ? (
                <ErrorState title={tProfile('notFound')} />
              ) : (
                <ConsultantProfile
                  consultant={visibleConsultant}
                  days={days ?? []}
                  isPending={daysPending}
                  dateChoice={selectedDate}
                  onDateChoiceChange={setSelectedDate}
                  timeChoice={selectedTime}
                  onTimeChoiceChange={setSelectedTime}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

const profileVariants: Variants = {
  enter: (direction: 1 | -1) => ({ opacity: 0, y: direction * 24 }),
  exit: (direction: 1 | -1) => ({
    opacity: 0,
    y: direction * -14,
    transition: { duration: 0.16, ease: revealEase }
  })
}
