import { env } from '@/shared/config/env'
import { bmtConsultationApi } from './consultation.bmt'
import { mockConsultationApi } from './consultation.mock'

/**
 * Chức năng đã nối BMT API. Hàm nào API chưa đáp ứng đủ giao diện thì KHÔNG
 * khai ở đây — vẫn chạy bản mock kể cả khi tắt `NEXT_PUBLIC_USE_MOCK_API`
 * (danh sách thiếu gửi BE: `docs/SITE_API_WIRING_STATUS.md`).
 */
// Đã nối: liệt kê KTS, xem một KTS (`/architects`), gửi yêu cầu tư vấn (`POST /consultation-requests`, miễn phí).
// Giữ mock: lịch trống (getAvailability), lịch tư vấn của tôi (getMyBookings) và hủy lịch (cancelMyBooking) — API
// không có. `/architects` thiếu điểm đánh giá, số nhận xét, ảnh công trình, headline, nơi công tác → để trống.
const BmtConsultationApi = {
  listConsultants: bmtConsultationApi.listConsultants,
  getConsultant: bmtConsultationApi.getConsultant,
  bookConsultation: bmtConsultationApi.bookConsultation
} satisfies Partial<typeof mockConsultationApi>

export const consultationApi = env.NEXT_PUBLIC_USE_MOCK_API
  ? mockConsultationApi
  : { ...mockConsultationApi, ...BmtConsultationApi }
