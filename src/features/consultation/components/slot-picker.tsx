'use client'

import { AnimatePresence, LayoutGroup, motion, type Variants } from 'motion/react'
import { useTranslations } from 'next-intl'

import { revealEase } from '@/shared/components/common'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { parseDateKey, sessionSlots } from '../services/consultation.service'
import type { ConsultationDay, ConsultationSlot } from '../types/consultation.types'

interface SlotPickerProps {
  days: readonly ConsultationDay[]
  selectedDate: string
  onSelectDate: (date: string) => void
  /** Giờ đang chọn trong ngày đang xem; rỗng nghĩa là chưa chọn. */
  selectedTime: string
  onSelectTime: (time: string) => void
  /** Đổi giá trị (bằng cách tăng dần) là tín hiệu "nhấp sáng một nhịp" ô ngày +
   * giờ đang chọn — CC-04, ngay trước khi hộp thoại xác nhận mở ra. */
  pulseKey?: number
  /** Khung giờ CHÍNH khách đã đặt (`yyyy-mm-dd|HH:mm`) — hiện "Lịch của bạn" thay vì như khung trống. */
  myBookings?: ReadonlySet<string>
}

/** Khóa dịch của nhãn thứ, đánh theo `Date.getDay()` (0 = Chủ nhật). */
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/** "04/08" — viết tay thay vì Intl để mọi locale hiện cùng một dạng như Hình 15. */
function dayMonth(date: Date): string {
  return `${`${date.getDate()}`.padStart(2, '0')}/${`${date.getMonth() + 1}`.padStart(2, '0')}`
}

/** `getDay()` luôn trả 0-6 nên nhánh mặc định không bao giờ chạy — chỉ để hết cảnh báo index. */
const weekdayKey = (date: Date) => WEEKDAY_KEYS[date.getDay()] ?? 'sun'

const dayContainerVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const dayItemVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: revealEase } }
}

const sessionContainerVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const sessionRowVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: revealEase } }
}

/**
 * Khối "CHỌN KHUNG GIỜ TƯ VẤN" (mục VIII.2, Hình 15).
 *
 * Hàng chip 7 ngày hiện lần lượt lúc vào trang; ô đang chọn có một khối nền
 * xanh đậm mang `layoutId` — đổi ngày thì khối đó tự trượt ngang sang ô mới
 * (mục 7). Đổi ngày cũng làm cả lưới giờ bên dưới MỜ ĐI CÙNG LÚC rồi lưới mới
 * hiện lần lượt hàng Sáng rồi Chiều (`key={selectedDate}` trên khối lưới).
 * Slot kín hiện chữ "Kín", mờ và không bấm được — vẫn giữ chỗ trong lưới để
 * hàng giờ không xô lệch khi lịch đổi (mục 8, 9). `pulseKey` tăng lên là tín
 * hiệu từ `ConsultantProfile` lúc vừa bấm "Đặt lịch tư vấn" — ô ngày và ô giờ
 * đang chọn tự nhấp sáng một nhịp trắng rồi tắt (CC-04).
 */
export function SlotPicker({
  days,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  pulseKey,
  myBookings
}: SlotPickerProps) {
  const t = useTranslations('consult.slots')

  const activeDay = days.find((day) => day.date === selectedDate)

  return (
    <section className='space-y-4'>
      <div className='space-y-1'>
        <h3 className='text-sm max-md:text-base font-semibold tracking-wide uppercase'>{t('title')}</h3>
        <p className='text-muted-foreground text-xs max-md:text-sm text-pretty'>{t('sessionInfo')}</p>
      </div>

      <LayoutGroup id='consultation-day-selection'>
        <motion.div
          variants={dayContainerVariants}
          initial='hidden'
          animate='show'
          className='grid grid-cols-4 gap-2 sm:grid-cols-7'
        >
          {days.map((day) => {
            const date = parseDateKey(day.date)
            const active = day.date === selectedDate
            const soldOut = day.slots.every((slot) => slot.full)

            return (
              <motion.button
                key={day.date}
                variants={dayItemVariants}
                type='button'
                onClick={() => onSelectDate(day.date)}
                aria-pressed={active}
                className={cn(
                  'group relative isolate rounded-lg border px-2 py-2 text-center transition-colors',
                  active ? 'border-primary text-primary-foreground' : 'bg-card text-foreground hover:border-ring',
                  soldOut && !active && 'text-muted-foreground'
                )}
              >
                {active ? (
                  <motion.span
                    layoutId='slot-day-active'
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                    className='bg-primary absolute -inset-px -z-10 rounded-lg'
                  />
                ) : null}
                {active && pulseKey ? (
                  <motion.span
                    key={pulseKey}
                    aria-hidden
                    className='absolute inset-0 rounded-lg bg-white/60'
                    initial={{ opacity: 0.9 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                ) : null}
                <span className='relative z-10 block text-sm font-semibold group-hover:font-bold'>
                  {t(`weekday.${weekdayKey(date)}`)}
                </span>
                <span
                  className={cn(
                    'relative z-10 block text-xs max-md:text-sm group-hover:font-semibold',
                    active ? 'opacity-80' : 'text-muted-foreground'
                  )}
                >
                  {dayMonth(date)}
                </span>
              </motion.button>
            )
          })}
        </motion.div>
      </LayoutGroup>

      <div className='grid'>
        <AnimatePresence mode='sync'>
          <motion.div
            key={selectedDate}
            variants={sessionContainerVariants}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className='col-start-1 row-start-1 space-y-2'
          >
            {(['morning', 'afternoon'] as const).map((session) => (
              <motion.div key={session} variants={sessionRowVariants}>
                <SessionRow
                  label={t(`session.${session}`)}
                  slots={sessionSlots(activeDay, session)}
                  selectedTime={selectedTime}
                  onSelectTime={onSelectTime}
                  fullLabel={t('full')}
                  fullHint={t('fullHint')}
                  pulseKey={pulseKey}
                  mineLabel={t('mine')}
                  isMine={(time) => Boolean(myBookings?.has(`${selectedDate}|${time}`))}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

interface SessionRowProps {
  label: string
  slots: ConsultationSlot[]
  selectedTime: string
  onSelectTime: (time: string) => void
  fullLabel: string
  fullHint: string
  pulseKey?: number
  mineLabel: string
  isMine: (time: string) => boolean
}

function SessionRow({
  label,
  slots,
  selectedTime,
  onSelectTime,
  fullLabel,
  fullHint,
  pulseKey,
  mineLabel,
  isMine
}: SessionRowProps) {
  return (
    <div className='flex flex-wrap items-center gap-2 sm:flex-nowrap'>
      <span className='text-muted-foreground w-14 shrink-0 text-sm'>{label}</span>

      <div className='grid flex-1 grid-cols-3 gap-2 sm:grid-cols-6'>
        {slots.map((slot) =>
          isMine(slot.time) ? (
            <span
              key={slot.id}
              className='border-primary bg-primary/10 text-primary-strong rounded-lg border py-1.5 text-center text-sm font-medium'
            >
              <span className='block leading-tight'>{slot.time}</span>
              <span className='block max-md:text-xs text-[10px] leading-tight'>{mineLabel}</span>
            </span>
          ) : slot.full ? (
            <FullSlotButton key={slot.id} time={slot.time} fullLabel={fullLabel} fullHint={fullHint} />
          ) : (
            <SlotButton
              key={slot.id}
              slot={slot}
              active={slot.time === selectedTime}
              onSelect={onSelectTime}
              pulseKey={pulseKey}
            />
          )
        )}
      </div>
    </div>
  )
}

/** Khung giờ còn trống: rê nhấc nhẹ + viền xanh; bấm đổ đầy màu rồi phồng một nhịp (mục 8). */
function SlotButton({
  slot,
  active,
  onSelect,
  pulseKey
}: {
  slot: ConsultationSlot
  active: boolean
  onSelect: (time: string) => void
  pulseKey?: number
}) {
  return (
    <motion.button
      type='button'
      onClick={() => onSelect(slot.time)}
      aria-pressed={active}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'relative isolate rounded-lg border py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:border-primary/50'
      )}
    >
      {active && pulseKey ? (
        <motion.span
          key={pulseKey}
          aria-hidden
          className='absolute inset-0 rounded-lg bg-white/60'
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      ) : null}
      <motion.span
        key={active ? 'on' : 'off'}
        initial={active ? { scale: 0.6 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className='relative z-10 block leading-tight'
      >
        {slot.time}
      </motion.span>
    </motion.button>
  )
}

/**
 * Khung giờ đã kín: không đổi diện mạo khi rê, chỉ đổi con trỏ — tooltip phía
 * trên giải thích vì sao; bấm thử thì rung ngang nhẹ đúng một lần (mục 9).
 */
function FullSlotButton({ time, fullLabel, fullHint }: { time: string; fullLabel: string; fullHint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          aria-disabled='true'
          className='bg-muted/60 text-muted-foreground cursor-not-allowed rounded-lg border py-1.5 text-sm font-medium'
        >
          <span className='block'>
            <span className='block leading-tight opacity-60'>{time}</span>
            <span className='block max-md:text-xs text-[10px] leading-tight'>{fullLabel}</span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side='top' sideOffset={6}>
        {fullHint}
      </TooltipContent>
    </Tooltip>
  )
}
