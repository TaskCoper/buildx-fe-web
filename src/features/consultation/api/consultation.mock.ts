import { cmsDb } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'
import { AVAILABILITY_DAYS, SESSION_TIMES } from '../constants/consultation.constants'
import type {
  BookConsultationPayload,
  Consultant,
  ConsultationBooking,
  ConsultationDay,
  ConsultationHistory,
  ConsultationHistoryBooking,
  ConsultationSlot
} from '../types/consultation.types'

/**
 * Mock của Tư vấn 1:1. Hồ sơ KTS đọc từ kho `shared/cms` (admin biên soạn, mục
 * X #5); lịch hẹn khách vừa đặt được ghi ngược vào kho để trang quản trị thấy
 * ngay ở mục "Lịch hẹn".
 */

/** `yyyy-mm-dd` theo giờ địa phương (không dùng toISOString vì lệch múi giờ). */
function toDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Lịch 7 ngày của một KTS (mục VIII.2), BẮT ĐẦU TỪ NGÀY MAI — hôm nay thì các
 * khung sáng có thể đã qua. Khung giờ chỉ để khách CHỌN GIỜ MONG MUỐN; việc sắp
 * xếp do bên vận hành liên hệ lại, nên KHÔNG khóa khung nào — khách chọn thoải mái.
 */
function buildAvailability(_consultantId: string): ConsultationDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: AVAILABILITY_DAYS }, (_, dayOffset) => {
    const date = new Date(today)
    date.setDate(today.getDate() + dayOffset + 1)
    const dateKey = toDateKey(date)

    const slots: ConsultationSlot[] = (['morning', 'afternoon'] as const).flatMap((session) =>
      SESSION_TIMES[session].map((time) => ({
        id: `${dateKey}-${time}`,
        time,
        session,
        full: false
      }))
    )

    return { date: dateKey, slots }
  })
}

/** Lịch đã sinh, giữ trong bộ nhớ tab. */
const availabilityByConsultant = new Map<string, ConsultationDay[]>()

function dateTimeFromNow(hours: number): { date: string; time: string } {
  const value = new Date(Date.now() + hours * 60 * 60 * 1000)
  const minutes = value.getMinutes() < 30 ? 30 : 0
  if (minutes === 0) value.setHours(value.getHours() + 1)
  value.setMinutes(minutes, 0, 0)

  return {
    date: toDateKey(value),
    time: `${`${value.getHours()}`.padStart(2, '0')}:${`${value.getMinutes()}`.padStart(2, '0')}`
  }
}

function historyBooking(
  consultantId: string,
  id: string,
  hoursFromNow: number,
  status: ConsultationHistoryBooking['status'],
  extra: Partial<ConsultationHistoryBooking> = {}
): ConsultationHistoryBooking {
  const consultant = cmsDb.find('consultants', consultantId)
  const slot = dateTimeFromNow(hoursFromNow)

  return {
    id,
    consultantId,
    consultantName: consultant?.name ?? '',
    specialtyLabel: consultant?.specialties[0]?.label ?? '',
    yearsExperience: consultant?.yearsExperience ?? 0,
    date: slot.date,
    time: slot.time,
    durationMinutes: 30,
    status,
    ...extra
  }
}

let myHistory: ConsultationHistory | null = null

/**
 * Mã các lịch hẹn CHÍNH khách này đặt (kho `bookings` chứa cả lịch của khách
 * khác). Lưu localStorage để tải lại trang vẫn còn — backend thật lọc theo phiên.
 */
const MY_BOOKING_IDS_KEY = 'savico.mock.myBookingIds'

function readMyBookingIds(): string[] {
  try {
    const raw = window.localStorage.getItem(MY_BOOKING_IDS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function rememberMyBooking(id: string) {
  try {
    window.localStorage.setItem(MY_BOOKING_IDS_KEY, JSON.stringify([id, ...readMyBookingIds()]))
  } catch {
    // Trình duyệt chặn lưu trữ: lịch vẫn nằm trong kho, chỉ không hiện ở lịch sử của khách.
  }
}

/** Lịch khách vừa đặt, đọc từ kho nên trạng thái admin đổi (xác nhận/từ chối) hiện ngay. */
function myStoredBookings(): ConsultationHistoryBooking[] {
  const ids = new Set(readMyBookingIds())

  return cmsDb
    .list('bookings')
    .filter((booking) => ids.has(booking.id))
    .map((booking) => {
      const consultant = cmsDb.find('consultants', booking.consultantId)
      return {
        id: booking.id,
        consultantId: booking.consultantId,
        consultantName: booking.consultantName,
        specialtyLabel: consultant?.specialties[0]?.label ?? '',
        yearsExperience: consultant?.yearsExperience ?? 0,
        date: booking.date,
        time: booking.time,
        durationMinutes: 30,
        ...(booking.note ? { note: booking.note } : {}),
        status: booking.status === 'rejected' ? 'cancelled' : booking.status
      }
    })
}

function myHistoryWithStored(): ConsultationHistory {
  const history = structuredClone(myConsultationHistory())
  return { ...history, bookings: [...myStoredBookings(), ...history.bookings] }
}

function myConsultationHistory(): ConsultationHistory {
  if (myHistory) return myHistory

  myHistory = {
    planTier: 'advanced',
    remainingCredits: 1,
    bookings: [
      historyBooking('ktsvc-01', 'TV-2026-0031', 18, 'confirmed', {
        note: 'Muốn xem hướng bố trí mặt bằng cho lô 5×20 m, nhà 2 tầng, ưu tiên giếng trời và phòng thờ tầng trên.',
        withinPlan: true
      }),
      historyBooking('ktsvc-02', 'TV-2026-0027', -17 * 24, 'done', {
        sessionNote:
          'Giữ nguyên vị trí bếp, mở rộng phòng khách bằng cách bỏ vách ngăn hiện tại.\nƯu tiên gạch 60×60 tông sáng cho sàn chung; sàn gỗ chỉ dùng phòng ngủ.\nNên chốt vị trí ổ điện, nước trước khi tô trát – tham khảo bài “7 lưu ý khi nghiệm thu phần thô”.',
        rating: 5,
        withinPlan: true
      }),
      historyBooking('ktsvc-03', 'TV-2026-0019', -31 * 24, 'cancelled', {
        cancelledAt: dateTimeFromNow(-32 * 24).date,
        withinPlan: true
      }),
      historyBooking('ktsvc-01', 'TV-2026-0012', -40 * 24, 'missed', {
        contactAttempts: 2,
        withinPlan: false
      })
    ]
  }

  return myHistory
}

function availabilityOf(consultantId: string): ConsultationDay[] {
  const existing = availabilityByConsultant.get(consultantId)
  if (existing) return existing

  const created = buildAvailability(consultantId)
  availabilityByConsultant.set(consultantId, created)
  return created
}

export const mockConsultationApi = {
  listConsultants: async (): Promise<Consultant[]> => {
    await mockDelay(250)
    // Chỉ kiến trúc sư Đang hiển thị xuất hiện ở màn đặt lịch.
    return cmsDb.list('consultants').filter((consultant) => consultant.visible)
  },

  getConsultant: async (id: string): Promise<Consultant | null> => {
    await mockDelay(200)
    return cmsDb.find('consultants', id)
  },

  getAvailability: async (consultantId: string): Promise<ConsultationDay[]> => {
    await mockDelay(250)
    // Dựng lại mỗi lần: admin vừa khóa ngày / khung giờ là màn đặt lịch thấy ngay.
    availabilityByConsultant.delete(consultantId)
    return availabilityOf(consultantId)
  },

  bookConsultation: async (payload: BookConsultationPayload): Promise<ConsultationBooking> => {
    await mockDelay(500)

    const consultant = cmsDb.find('consultants', payload.consultantId)

    // Mã lịch hẹn nối tiếp số đang có trong kho để không đụng seed.
    const nextNumber = cmsDb.list('bookings').length + 1
    const booking: ConsultationBooking = {
      id: `BOOK-${`${nextNumber}`.padStart(4, '0')}`,
      consultantId: payload.consultantId,
      consultantName: consultant?.name ?? '',
      date: payload.date,
      time: payload.time,
      phone: payload.phone,
      ...(payload.note ? { note: payload.note } : {}),
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    cmsDb.upsert('bookings', {
      ...booking,
      // Backend thật lấy tên từ phiên đăng nhập; mock chỉ có số điện thoại.
      customerName: `Khách ${payload.phone.slice(-4)}`
    })
    rememberMyBooking(booking.id)

    return booking
  },

  getMyBookings: async (): Promise<ConsultationHistory> => {
    await mockDelay(220)
    return myHistoryWithStored()
  },

  cancelMyBooking: async (bookingId: string): Promise<ConsultationHistory> => {
    await mockDelay(260)
    const stored = cmsDb.find('bookings', bookingId)

    if (stored && readMyBookingIds().includes(bookingId)) {
      cmsDb.upsert('bookings', { ...stored, status: 'cancelled' })
    } else {
      const booking = myConsultationHistory().bookings.find((item) => item.id === bookingId)
      if (booking) {
        booking.status = 'cancelled'
        booking.cancelledAt = toDateKey(new Date())
      }
    }

    return myHistoryWithStored()
  }
}
