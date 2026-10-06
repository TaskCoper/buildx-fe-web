'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X } from 'lucide-react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

import type { Locale } from '@/i18n/routing'
import { useAuthStore } from '@/shared/auth'
import { FieldLabel, revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { useRequiredMessage } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate, formatPhoneDisplay, normalizePhone } from '@/shared/utils'
import { useBookConsultation } from '../hooks/use-consultation'
import { BOOKING_NOTE_MAX_LENGTH, createBookingSchema, type BookingFormValues } from '../schemas/booking.schema'
import { slotEndTime } from '../services/consultation.service'
import type { Consultant, ConsultationBooking } from '../types/consultation.types'

/**
 * Độ lệch tâm giữa nút "Đặt lịch tư vấn" và tâm màn hình lúc bấm — hộp thoại
 * "nở ra" đúng từ vị trí đó rồi thu về y hệt lúc đóng (mục 2, CC-04, CC-05).
 * Tính ở nơi bấm (`ConsultantProfile`, trong sự kiện click) chứ không tính lại
 * trong component này để tránh đọc `window` lúc render.
 */
export interface BookingDialogOrigin {
  dx: number
  dy: number
}

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultant: Consultant
  /** Ngày `yyyy-mm-dd` và giờ bắt đầu đã chọn ở khối chọn khung giờ. */
  date: string
  time: string
  /** Chạy sau khi đặt lịch xong — màn hồ sơ dùng để bỏ chọn slot vừa đặt. */
  onBooked?: (booking: ConsultationBooking) => void
  origin: BookingDialogOrigin | null
}

const contentContainerVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.45, staggerChildren: 0.08 } }
}
const contentItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: revealEase } }
}

/**
 * Modal "Xác nhận đặt lịch tư vấn" (mục VIII.3, Hình 16).
 *
 * KTS / ngày / khung giờ chỉ hiện lại ở dòng tóm tắt — sửa thì đóng modal chọn
 * lại, nên modal chỉ còn hai trường: SĐT liên lạc và ghi chú. SĐT tự điền theo
 * tài khoản nhưng sửa được vì khách có thể muốn KTS gọi vào số khác.
 *
 * ★ Dựng thẳng trên `@radix-ui/react-dialog` (không dùng `shared/components/ui/dialog`
 * — primitive đó dùng chung cho rất nhiều modal khác trong app) vì cần một bộ
 * hiệu ứng đặc thù: hộp "nở ra" đúng từ vị trí nút vừa bấm (`origin`) rồi nảy
 * nhẹ một nhịp, nội dung hiện lần lượt SAU KHI hộp đứng yên, nút × tự vẽ,
 * lớp phủ đóng nhanh hơn mở. Overlay + Content đều `forceMount` để
 * `AnimatePresence` tự lo việc mount/unmount thay vì để CSS animation của
 * Radix làm — bản `@radix-ui/react-dialog` đang dùng CÓ `forceMount` (khác
 * `react-select` ở bộ lọc chuyên môn).
 */
export function BookingDialog({ open, onOpenChange, consultant, date, time, onBooked, origin }: BookingDialogProps) {
  const t = useTranslations('consult.booking')
  const tCommon = useTranslations('common')
  const tv = useTranslations('validation')
  const required = useRequiredMessage()
  const locale = useLocale() as Locale

  const accountPhone = useAuthStore((s) => s.user?.phone)
  const bookConsultation = useBookConsultation()

  const schema = useMemo(
    () =>
      createBookingSchema({
        phoneRequired: required('phone'),
        phoneInvalid: tv('phone'),
        noteMaxLength: tv('maxLength', { max: BOOKING_NOTE_MAX_LENGTH })
      }),
    [required, tv]
  )

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', note: '' }
  })

  // SĐT tài khoản tự điền ĐÚNG MỘT LẦN (có thể về sau lần render đầu vì store
  // hydrate từ localStorage) — sau đó luôn giữ những gì khách đã gõ, kể cả
  // đóng rồi mở lại modal cho cùng một lượt đặt (mục 4).
  const phoneAutoFilledRef = useRef(false)
  useEffect(() => {
    if (!phoneAutoFilledRef.current && accountPhone) {
      form.setValue('phone', accountPhone)
      phoneAutoFilledRef.current = true
    }
  }, [accountPhone, form])

  // Ghi chú thì luôn sạch mỗi lần mở lại — không để ghi chú của lượt đặt trước
  // dính sang lượt sau.
  const { setValue } = form
  useEffect(() => {
    if (open) setValue('note', '')
  }, [open, setValue])

  // "Thứ Năm, 13/08/2026" — kiểu ghi ngày chung của toàn site (góp ý mục 38).
  const dayLabel = formatDisplayDate(date, locale, { weekday: true })
  const summary = [consultant.name, dayLabel, `${time} - ${slotEndTime(time)}`].join(' · ')

  const dx = origin?.dx ?? 0
  const dy = origin?.dy ?? 0

  function onSubmit(values: BookingFormValues) {
    bookConsultation.mutate(
      {
        consultantId: consultant.id,
        date,
        time,
        phone: normalizePhone(values.phone),
        ...(values.note ? { note: values.note } : {})
      },
      {
        onSuccess: (booking) => {
          onOpenChange(false)
          onBooked?.(booking)
        }
      }
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {open ? (
            <>
              {/* Lớp phủ: khoá cuộn trang sau lưng có sẵn từ Radix; đóng lại
                  (bấm ra ngoài) trong NHANH HƠN lúc mở (mục 1). */}
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  className='fixed inset-0 z-50 bg-black/45 backdrop-blur-sm'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.25 } }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                />
              </DialogPrimitive.Overlay>

              {/* Wrapper phủ kín màn hình để CĂN GIỮA bằng flex — không dùng
                  top/left/translate 50% vì Motion sẽ tự set `transform` cho
                  hộp bên trong, đụng ngay tay với cách căn giữa kiểu cũ.
                  Radix tự set inline `pointer-events: auto` lên chính gốc
                  Content (cơ chế dismissable-layer của nó) nên KHÔNG thể nhờ
                  `pointer-events-none` cho lớp bấm "xuyên" xuống Overlay như
                  bình thường — tự bắt sự kiện: bấm đúng vùng NGOÀI hộp (target
                  chính là wrapper, không phải phần tử con nào) mới đóng. */}
              <DialogPrimitive.Content asChild forceMount>
                <div
                  className='fixed inset-0 z-50 flex items-center justify-center p-4'
                  onClick={(event) => {
                    if (event.target === event.currentTarget) onOpenChange(false)
                  }}
                >
                  <motion.div
                    className='relative max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-background p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_0_4px_rgba(0,0,0,0.45)]'
                    initial={{ x: dx, y: dy, scale: 0.15, opacity: 0 }}
                    animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    exit={{ x: dx, y: dy, scale: 0.2, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 0.7 }}
                  >
                    <DialogPrimitive.Close asChild>
                      <button
                        type='button'
                        aria-label={tCommon('close')}
                        className='text-muted-foreground hover:bg-muted absolute top-4 right-4 flex size-8 items-center justify-center rounded-full transition-colors'
                      >
                        <motion.span whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }} className='flex'>
                          <X className='size-4' />
                        </motion.span>
                      </button>
                    </DialogPrimitive.Close>

                    {/* Nội dung hiện lần lượt CHỈ SAU KHI hộp đứng yên
                        (`delayChildren` chờ hết nhịp nảy ở trên). */}
                    <motion.div
                      variants={contentContainerVariants}
                      initial='hidden'
                      animate='show'
                      className='space-y-4'
                    >
                      <motion.div variants={contentItemVariants}>
                        <DialogPrimitive.Title className='text-lg leading-none font-semibold'>
                          {t('title')}
                        </DialogPrimitive.Title>
                      </motion.div>

                      {/* Thẻ tóm tắt: loé sáng một nhịp rồi dịu về nền xanh
                          nhạt bình thường (mục 3). */}
                      <motion.div variants={contentItemVariants} className='relative overflow-hidden rounded-lg'>
                        <p className='bg-accent text-primary-strong px-3 py-2 text-center text-sm font-medium'>
                          {summary}
                        </p>
                        <motion.span
                          aria-hidden
                          className='bg-primary/40 pointer-events-none absolute inset-0'
                          initial={{ opacity: 0.9 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 0.6 }}
                        />
                      </motion.div>

                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                          <motion.div variants={contentItemVariants}>
                            <FormField
                              control={form.control}
                              name='phone'
                              render={({ field }) => (
                                <FormItem>
                                  <FieldLabel htmlFor='booking-phone' hint={t('phoneHint')} required>
                                    {t('phoneLabel')}
                                  </FieldLabel>
                                  <FormControl>
                                    <Input
                                      id='booking-phone'
                                      type='tel'
                                      inputMode='tel'
                                      placeholder={t('phonePlaceholder')}
                                      // Nếu không chỉ định, Radix focus phần tử focusable đầu
                                      // tiên là nút (i) và tooltip bật sẵn đè lên dòng tóm tắt.
                                      autoFocus
                                      {...field}
                                      onChange={(event) => {
                                        // Tách nhóm "0938 123 456" ngay khi gõ mà không giật
                                        // con trỏ: đếm số chữ số đứng TRƯỚC con trỏ trên giá trị
                                        // gốc, định dạng lại, rồi tự đặt `.value` + con trỏ lên
                                        // DOM ngay — TRƯỚC khi React commit lại cùng giá trị đó,
                                        // nên React thấy `.value` đã đúng và không đụng vào con
                                        // trỏ vừa đặt (kỹ thuật chuẩn cho input tự định dạng khi
                                        // gõ, không cần chờ `requestAnimationFrame`).
                                        const el = event.target
                                        const cursor = el.selectionStart ?? el.value.length
                                        const digitsBeforeCursor = el.value.slice(0, cursor).replace(/\D/g, '').length
                                        const formatted = formatPhoneDisplay(el.value)

                                        let seen = 0
                                        let pos = formatted.length
                                        for (let i = 0; i < formatted.length; i++) {
                                          if (/\d/.test(formatted[i] ?? '')) seen++
                                          if (seen === digitsBeforeCursor) {
                                            pos = i + 1
                                            break
                                          }
                                        }
                                        if (digitsBeforeCursor === 0) pos = 0

                                        el.value = formatted
                                        el.setSelectionRange(pos, pos)
                                        field.onChange(formatted)
                                      }}
                                    />
                                  </FormControl>
                                  <p className='text-muted-foreground text-xs'>{t('phoneNote')}</p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>

                          <motion.div variants={contentItemVariants}>
                            <FormField
                              control={form.control}
                              name='note'
                              render={({ field }) => (
                                <FormItem>
                                  <FieldLabel htmlFor='booking-note' hint={t('noteHint')}>
                                    {t('noteLabel')}
                                  </FieldLabel>
                                  <FormControl>
                                    <div className='relative'>
                                      <Textarea
                                        id='booking-note'
                                        rows={3}
                                        maxLength={BOOKING_NOTE_MAX_LENGTH}
                                        placeholder={t('notePlaceholder')}
                                        className='max-h-40 overflow-y-auto transition-[height] duration-150 ease-out placeholder:text-transparent'
                                        {...field}
                                      />
                                      {/* Chữ gợi ý TỰ VẼ mờ dần khi gõ ký tự đầu (mục 6) —
                                          placeholder gốc vẫn còn cho khả năng tiếp cận,
                                          chỉ ẩn màu đi bằng `placeholder:text-transparent`. */}
                                      <span
                                        aria-hidden
                                        className={cn(
                                          'text-muted-foreground pointer-events-none absolute top-2 left-3 text-base transition-opacity duration-200 md:text-sm',
                                          field.value ? 'opacity-0' : 'opacity-100'
                                        )}
                                      >
                                        {t('notePlaceholder')}
                                      </span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>

                          <motion.div variants={contentItemVariants}>
                            <Button
                              type='submit'
                              size='lg'
                              className='w-full transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] active:brightness-100'
                              disabled={bookConsultation.isPending}
                            >
                              {bookConsultation.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
                              {t('submit')}
                            </Button>
                          </motion.div>
                        </form>
                      </Form>
                    </motion.div>
                  </motion.div>
                </div>
              </DialogPrimitive.Content>
            </>
          ) : null}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
