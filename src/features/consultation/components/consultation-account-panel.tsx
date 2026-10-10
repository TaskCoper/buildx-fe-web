'use client'

import { env } from '@/shared/config/env'
import { ConsultationHistory } from './consultation-history'
import { MyConsultationRequests } from './my-consultation-requests'

/**
 * Nội dung tab Lịch tư vấn trong Tài khoản. Chạy với API thật thì đọc yêu cầu của chính khách từ
 * `GET /me/consultation-requests` (chỉ xem). Chế độ mock giữ màn lịch sử cũ vì nó cần đặt/hủy/đánh giá mà API chưa có.
 */
export function ConsultationAccountPanel() {
  return env.NEXT_PUBLIC_USE_MOCK_API ? <ConsultationHistory /> : <MyConsultationRequests />
}
