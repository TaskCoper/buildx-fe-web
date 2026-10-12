import { env } from '@/shared/config/env'
import { bmtConsultationApi } from './consultation.bmt'
import { mockConsultationApi } from './consultation.mock'

/**
 * Chức năng đã nối BMT API. Hàm nào API chưa đáp ứng đủ giao diện thì KHÔNG
 * khai ở đây — vẫn chạy bản mock kể cả khi tắt `NEXT_PUBLIC_USE_MOCK_API`
 * (danh sách thiếu gửi BE: `docs/SITE_API_WIRING_STATUS.md`).
 */
// Đã nối: liệt kê KTS, xem một KTS (`/architects`), gửi yêu cầu tư vấn (`POST /consultation-requests`, miễn phí).
// Đã nối thêm: danh sách yêu cầu của chính khách (`GET /me/consultation-requests`, chỉ xem) cho màn Lịch tư vấn 1:1.
// Giữ mock: lịch trống (getAvailability), lịch sử kiểu cũ (getMyBookings) và hủy lịch (cancelMyBooking) — API
// không có. Hồ sơ đã có công ty, đánh giá, mô tả ngắn và các dự án thiết kế từ API.
const BmtConsultationApi = {
  listConsultantsPage: bmtConsultationApi.listConsultantsPage,
  listSpecialties: bmtConsultationApi.listSpecialties,
  listConsultants: bmtConsultationApi.listConsultants,
  getConsultant: bmtConsultationApi.getConsultant,
  bookConsultation: bmtConsultationApi.bookConsultation,
  listMyRequestsPage: bmtConsultationApi.listMyRequestsPage
} satisfies Partial<typeof mockConsultationApi>

export const consultationApi = env.NEXT_PUBLIC_USE_MOCK_API
  ? mockConsultationApi
  : { ...mockConsultationApi, ...BmtConsultationApi }
