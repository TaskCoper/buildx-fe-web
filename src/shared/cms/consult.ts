import type { CmsBooking, CmsConsultClosure, ConsultSession } from './cms.types'

/**
 * Lịch tư vấn 1:1 dùng chung giữa trang đặt lịch và khu quản trị (epic
 * ArchitectManagement §5) — một nguồn cho khung giờ, trạng thái Kín và các
 * phạm vi Không tư vấn, để hai phía không bao giờ lệch nhau.
 */

/** Khung giờ 30 phút trong giờ làm việc SAVICO, chia theo buổi. */
export const CONSULT_SESSION_TIMES: Record<ConsultSession, readonly string[]> = {
  morning: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'],
  afternoon: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
}

/** Mỗi buổi tư vấn kéo dài 30 phút. */
export const CONSULT_SLOT_MINUTES = 30

export function sessionOfTime(time: string): ConsultSession {
  return CONSULT_SESSION_TIMES.morning.includes(time) ? 'morning' : 'afternoon'
}

/** Khung giờ bị đánh dấu Không tư vấn — theo cả ngày, cả buổi hoặc riêng khung đó. */
export function isSlotClosed(closures: readonly CmsConsultClosure[], date: string, time: string): boolean {
  const session = sessionOfTime(time)
  return closures.some(
    (closure) =>
      closure.date === date &&
      (closure.session === undefined || closure.session === session) &&
      (closure.time === undefined || closure.time === time)
  )
}

/** Lịch đang giữ khung giờ này (Chờ xác nhận / Đã xác nhận) — khung đó là "Kín". */
export function bookingAt(
  bookings: readonly CmsBooking[],
  consultantId: string,
  date: string,
  time: string
): CmsBooking | undefined {
  return bookings.find(
    (booking) =>
      booking.consultantId === consultantId &&
      booking.date === date &&
      booking.time === time &&
      (booking.status === 'pending' || booking.status === 'confirmed')
  )
}

export type ConsultSlotState = 'open' | 'closed' | 'full'

export function consultSlotState(
  closures: readonly CmsConsultClosure[],
  bookings: readonly CmsBooking[],
  consultantId: string,
  date: string,
  time: string
): ConsultSlotState {
  if (bookingAt(bookings, consultantId, date, time)) return 'full'
  return isSlotClosed(closures, date, time) ? 'closed' : 'open'
}
