import { SLOT_MINUTES } from '../constants/consultation.constants'
import type {
  Consultant,
  ConsultationDay,
  ConsultationSession,
  ConsultationSlot,
  ConsultantSpecialty
} from '../types/consultation.types'

/** Bộ lọc của hàng công cụ trang danh sách (mục VIII.1). */
export interface ConsultantFilter {
  /** Ô "Tìm kiến trúc sư theo tên hoặc chuyên môn...". */
  query?: string
  /** Dropdown "Chuyên môn"; bỏ trống = tất cả. */
  specialtyId?: string
}

/** Bỏ dấu tiếng Việt để gõ "tri" vẫn ra "KTS. Nguyễn Minh Trí". */
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

/** Danh mục cho dropdown "Chuyên môn", gom từ chính danh sách KTS. */
export function specialtyOptions(consultants: readonly Consultant[]): ConsultantSpecialty[] {
  const seen = new Map<string, ConsultantSpecialty>()
  for (const consultant of consultants) {
    for (const specialty of consultant.specialties) {
      if (!seen.has(specialty.id)) seen.set(specialty.id, specialty)
    }
  }
  return [...seen.values()]
}

/**
 * Vị trí đoạn khớp `query` trong `text` (chữ khớp tô nền xanh nhạt — trang Tư
 * vấn 1:1, mục 5). So khớp trên bản đã CHUẨN HOÁ (bỏ dấu, hạ chữ thường) nhưng
 * trả vị trí để cắt trên bản GỐC có dấu — mọi phép biến đổi trong `normalize`
 * (bỏ dấu, đổi đ→d) giữ nguyên số ký tự nên vị trí tìm được áp thẳng lên chuỗi
 * gốc mà không lệch.
 */
export function findMatchRange(text: string, query: string): { start: number; end: number } | null {
  const q = normalize(query.trim())
  if (!q) return null
  const index = normalize(text).indexOf(q)
  if (index === -1) return null
  return { start: index, end: index + q.length }
}

/** Tìm theo tên hoặc chuyên môn + lọc theo chuyên môn (mục VIII.1). */
export function filterConsultants(consultants: readonly Consultant[], filter: ConsultantFilter = {}): Consultant[] {
  const query = filter.query ? normalize(filter.query.trim()) : ''

  return consultants.filter((consultant) => {
    if (filter.specialtyId && !consultant.specialties.some((item) => item.id === filter.specialtyId)) return false
    if (!query) return true

    const haystack = normalize([consultant.name, ...consultant.specialties.map((item) => item.label)].join(' '))
    return haystack.includes(query)
  })
}

/**
 * Thứ tự mặc định: nhóm theo chuyên môn chính (mục VIII.1).
 *
 * `preferredSpecialtyId` là gợi ý của lớp app — nếu khách có dự án gần nhất thì
 * KTS khớp loại công trình của dự án đó lên đầu. Feature không tự đọc dữ liệu
 * dự án vì `features/consultation` không được import `features/design`.
 */
export function sortConsultants(consultants: readonly Consultant[], preferredSpecialtyId?: string): Consultant[] {
  const groupOrder: string[] = []
  for (const consultant of consultants) {
    const primary = consultant.specialties[0]?.id ?? ''
    if (!groupOrder.includes(primary)) groupOrder.push(primary)
  }

  const rank = (consultant: Consultant) => {
    if (preferredSpecialtyId && consultant.specialties.some((item) => item.id === preferredSpecialtyId)) return -1
    return groupOrder.indexOf(consultant.specialties[0]?.id ?? '')
  }

  return [...consultants].sort((a, b) => rank(a) - rank(b))
}

/**
 * `yyyy-mm-dd` → Date theo giờ ĐỊA PHƯƠNG.
 * `new Date('2026-08-04')` được hiểu là UTC nên ở múi giờ âm sẽ lùi một ngày —
 * chip ngày phải khớp đúng ngày backend trả về.
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

/** Các khung giờ của một buổi, giữ nguyên thứ tự backend trả về. */
export function sessionSlots(day: ConsultationDay | undefined, session: ConsultationSession): ConsultationSlot[] {
  return day?.slots.filter((slot) => slot.session === session) ?? []
}

/** Ngày đầu tiên còn ít nhất một slot trống — chip ngày mở sẵn ở ngày này. */
export function firstOpenDay(days: readonly ConsultationDay[]): ConsultationDay | undefined {
  return days.find((day) => day.slots.some((slot) => !slot.full)) ?? days[0]
}

/** "09:00" + 30 phút → "09:30"; dùng cho dòng tóm tắt "9:00 - 9:30" (Hình 16). */
export function slotEndTime(time: string, minutes = SLOT_MINUTES): string {
  const [hourPart, minutePart] = time.split(':')
  const total = Number(hourPart) * 60 + Number(minutePart) + minutes
  const hour = `${Math.floor(total / 60) % 24}`.padStart(2, '0')
  const minute = `${total % 60}`.padStart(2, '0')
  return `${hour}:${minute}`
}
