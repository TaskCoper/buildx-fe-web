import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

/**
 * HƯỚNG DẪN (AdminGuide) — các bước hướng dẫn dạng video YouTube, cần quyền
 * `guide.manage`.
 *
 * Admin chỉ nhập `youtubeUrl`; BE tự tách `youtubeVideoId` và lấy `metadata`
 * (ảnh đại diện, thời lượng) từ YouTube. `video-preview` cho xem trước trước khi
 * lưu. Mỗi guide có khóa lạc quan riêng `version`; toàn danh sách có `orderVersion`
 * dùng cho thao tác sắp xếp (`move`). Vòng đời: Nháp → công bố (Published) → ẩn
 * (Hidden). `videoWarning` báo khi video lỗi/không truy cập được.
 */

export interface VideoMetadata {
  thumbnailUrl: string
  durationSeconds: number
  fetchedAtUtc: string
}

export interface AdminGuide {
  id: string
  title?: string | null
  description?: string | null
  youtubeUrl?: string | null
  youtubeVideoId?: string | null
  state: string
  sortOrder: number
  version: number
  createdAtUtc: string
  modifiedAtUtc: string
  metadata: VideoMetadata
  videoWarning?: string | null
}

/** `GET /admin/guides` — trang danh sách kèm `orderVersion` cho `move`. */
export interface AdminGuidePage {
  page: PagedResult<AdminGuide>
  orderVersion: number
}

export interface GuideVideoPreview {
  youtubeVideoId: string
  metadata: VideoMetadata
}

/** Nội dung ghi (tạo / sửa) — chỉ URL + tiêu đề + mô tả; meta do BE lấy. */
export interface GuideContent {
  title: string | null
  description: string | null
  youtubeUrl: string | null
}

const BASE = '/admin/guides'

export const guidesAdminApi = {
  list: (params: { keyword?: string; state?: string; pageIndex: number; pageSize: number }) =>
    http.get<AdminGuidePage>(BASE, { params }),

  get: (id: string) => http.get<AdminGuide>(`${BASE}/${id}`),

  create: (body: GuideContent) => http.post<AdminGuide>(BASE, body),

  update: (id: string, body: GuideContent & { expectedVersion: number }) => http.put<AdminGuide>(`${BASE}/${id}`, body),

  remove: (id: string, expectedVersion: number) => http.delete<void>(`${BASE}/${id}`, { params: { expectedVersion } }),

  publish: (id: string, expectedVersion: number) => http.post<AdminGuide>(`${BASE}/${id}/publish`, { expectedVersion }),

  hide: (id: string, expectedVersion: number) => http.post<AdminGuide>(`${BASE}/${id}/hide`, { expectedVersion }),

  /** Đổi thứ tự: đặt guide TRƯỚC `beforeId` (null = xuống cuối). */
  move: (id: string, body: { expectedVersion: number; expectedOrderVersion: number; beforeId: string | null }) =>
    http.post<{ orderVersion: number }>(`${BASE}/${id}/move`, body),

  /** Xem trước video từ URL (không lưu) — trả videoId + metadata. */
  previewVideo: (youtubeUrl: string) => http.post<GuideVideoPreview>(`${BASE}/video-preview`, { youtubeUrl })
}
