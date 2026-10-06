import type { Consultant } from '@/shared/cms'
import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { BookConsultationPayload, ConsultationBooking } from '../types/consultation.types'

/**
 * Nối Tư vấn 1:1 vào BMT API (KTS công khai + gửi yêu cầu tư vấn miễn phí).
 *
 * Chỉ ba chức năng có API: liệt kê KTS, xem một KTS, gửi yêu cầu. Lịch trống,
 * "lịch tư vấn của tôi" và hủy lịch KHÔNG có API nên giữ mock (xem
 * `docs/SITE_API_WIRING_STATUS.md`). Vì consultantId dùng chung với danh sách,
 * cả ba hàm này nối cùng nhau để id luôn là uuid thật của `/architects`.
 */

/** `GET /architects` và `/architects/{id}` (Response.PublicArchitect). */
interface BmtArchitect {
  id: string
  fullName: string
  title: string
  avatarUrl: string
  yearsExperience: number
  projectCount: number
  introduction: string
  categories: { id: string; name: string }[]
  companyName?: string | null
  rating?: number | null
  reviewCount?: number | null
}

/**
 * PublicArchitect → Consultant (type UI). BE đã trả `companyName`, `rating`,
 * `reviewCount` (map vào company / rating / reviewCount). Còn thiếu: headline
 * và ảnh công trình (works) → để trống.
 */
function toConsultant(a: BmtArchitect): Consultant {
  return {
    id: a.id,
    name: a.fullName,
    title: a.title,
    avatarUrl: a.avatarUrl,
    yearsExperience: a.yearsExperience,
    projectCount: a.projectCount,
    specialties: (a.categories ?? []).map((c) => ({ id: c.id, label: c.name })),
    bio: a.introduction
      ? a.introduction
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      : [],
    headline: '',
    ...(a.companyName ? { company: a.companyName } : {}),
    rating: a.rating ?? 0,
    reviewCount: a.reviewCount ?? 0,
    works: [],
    visible: true
  }
}

/** Ghép ngày (yyyy-mm-dd) + giờ (HH:mm) khách chọn thành ISO có múi giờ VN. */
function toDesiredAt(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}+07:00`
}

/** Số KTS của một trang danh sách (cột trái + lưới trang Tư vấn). */
const CONSULTANT_LIST_PAGE_SIZE = 20

export const bmtConsultationApi = {
  /**
   * Lấy DANH SÁCH KTS (một trang đầu), không kéo toàn bộ KTS về như trước. Mở hồ sơ
   * một KTS bất kỳ đã có `getConsultant` riêng nên không cần cả danh sách trong tay.
   */
  async listConsultants(): Promise<Consultant[]> {
    const page = await http.get<PagedResult<BmtArchitect>>('/architects', {
      params: { pageIndex: 1, pageSize: CONSULTANT_LIST_PAGE_SIZE }
    })
    return page.items.map(toConsultant)
  },

  async getConsultant(id: string): Promise<Consultant | null> {
    try {
      return toConsultant(await http.get<BmtArchitect>(`/architects/${id}`))
    } catch (error) {
      if ((error as { status?: number } | undefined)?.status === 404) return null
      throw error
    }
  },

  /**
   * Gửi yêu cầu tư vấn. Lịch trống là mock nên ngày+giờ khách chọn trở thành
   * `desiredAt`; backend xếp lịch gọi lại. Biên nhận không có tên KTS, mà
   * `onSuccess` chỉ dùng `consultantId` + toast nên để trống tên là đủ.
   */
  async bookConsultation(payload: BookConsultationPayload): Promise<ConsultationBooking> {
    const receipt = await http.post<{ id: string; receivedAtUtc: string; message: string }>(
      '/consultation-requests',
      {
        architectId: payload.consultantId,
        desiredAt: toDesiredAt(payload.date, payload.time),
        contactPhone: payload.phone || null,
        message: payload.note ?? null
      },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } }
    )
    return {
      id: receipt.id,
      consultantId: payload.consultantId,
      consultantName: '',
      date: payload.date,
      time: payload.time,
      phone: payload.phone,
      note: payload.note,
      status: 'pending',
      createdAt: receipt.receivedAtUtc
    }
  }
}
