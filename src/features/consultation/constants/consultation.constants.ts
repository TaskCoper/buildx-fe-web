import { CONSULT_SESSION_TIMES, CONSULT_SLOT_MINUTES } from '@/shared/cms'

import type { ConsultationSession } from '../types/consultation.types'

/** Dải chip ngày của khối chọn giờ: 7 ngày kể từ hôm nay (mục VIII.2). */
export const AVAILABILITY_DAYS = 7

/** Số hồ sơ mỗi lần tải danh sách kiến trúc sư ở khung cuộn của trang hồ sơ. */
export const CONSULTANT_LIST_PAGE_SIZE = 20

/** Số thẻ mỗi trang ở trang Tư vấn 1:1; nút "Xem thêm" tải trang kế tiếp từ backend (mục VIII.1). */
export const CONSULTANT_DIRECTORY_PAGE_SIZE = 6

/**
 * Khung giờ 30 phút trong giờ làm việc SAVICO (Hình 15).
 * Backend trả lịch thật; hằng số này để mock dựng lịch và để UI biết thứ tự cột.
 */
export const SESSION_TIMES: Record<ConsultationSession, readonly string[]> = CONSULT_SESSION_TIMES

/** Số thẻ KTS ghim ở section "Tư vấn 1:1" trang chủ (mục III.2: 3-4 thẻ). */
export const HOME_CONSULTANT_COUNT = 3

/** Mỗi buổi tư vấn kéo dài 30 phút — dùng để hiện "9:00 - 9:30". */
export const SLOT_MINUTES = CONSULT_SLOT_MINUTES
