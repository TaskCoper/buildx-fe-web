import type { GuideVideo } from '../types/guide.types'

/**
 * Logic thuần của trang Hướng dẫn (không gọi mạng, không import có alias lúc chạy) — tách
 * riêng để kiểm được không cần backend.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Id hướng dẫn thật của BE là GUID; id mock là chuỗi tự đặt. BE trả 400 nếu gửi id không phải GUID. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** Ảnh đại diện YouTube dựng từ mã video — dùng khi BE không có `metadata` (host `i.ytimg.com` đã khai trong next.config). */
export function youtubeThumbnail(videoId: string): string {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''
}

/**
 * `GuidePublicDto` (cả `GET /guides` lẫn `GET /guides/{id}`, cùng một DTO) → `GuideVideo`.
 *
 * `metadata` là `null` khi YouTube / bộ nhớ đệm lỗi (TDD-GUIDE-001): khi đó dùng ảnh dựng từ mã
 * video và thời lượng 0 — KHÔNG bịa thời lượng. Trước đây mapper đọc `guide.metadata.thumbnailUrl`
 * thẳng nên một video thiếu metadata làm ném lỗi cả danh sách rồi rơi về mock.
 *
 * Trả `null` cho phần tử không dùng được (thiếu id hoặc tiêu đề) để danh sách bỏ qua chứ không vỡ.
 */
export function normalizeGuide(raw: unknown, index: number): GuideVideo | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = text(item.id)
  const title = text(item.title)
  if (!id || !title) return null

  const youtubeId = text(item.youtubeVideoId)
  const metadata =
    item.metadata && typeof item.metadata === 'object' ? (item.metadata as Record<string, unknown>) : null
  const duration = metadata && typeof metadata.durationSeconds === 'number' ? metadata.durationSeconds : 0

  return {
    id,
    // BE chưa có nhóm chủ đề — dồn tạm về 'input', không ảnh hưởng hiển thị lưới video.
    topic: 'input',
    title,
    description: text(item.description),
    thumbnailUrl: text(metadata?.thumbnailUrl) || youtubeThumbnail(youtubeId),
    videoUrl: text(item.youtubeUrl) || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : ''),
    durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : 0,
    ...(youtubeId ? { youtubeId } : {}),
    status: 'visible',
    // BE chưa có cờ nổi bật — lấy video đầu danh sách.
    featured: index === 0
  }
}

/** Id trong `?video=<id>` của trang Hướng dẫn (deep link mở thẳng một video), hoặc `null`. */
export function readVideoParam(search: string): string | null {
  const value = new URLSearchParams(search).get('video')?.trim()
  return value ? value : null
}

/** Đường dẫn hiện tại bỏ tham số `video` (giữ phần còn lại) — dùng để không mở lại video khi tải lại trang. */
export function withoutVideoParam(href: string): string {
  const url = new URL(href, 'http://localhost')
  url.searchParams.delete('video')
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Kết cục tra cứu một hướng dẫn theo id. Chỉ `unavailable` mới hiện câu "không còn khả dụng":
 * 404 (`GuideNotFound`: Draft/Hidden/đã xoá/không có) và 400 (id sai định dạng) đều nghĩa là video
 * không xem được. Lỗi khác (mạng, 5xx) không khẳng định video mất — để phía gọi rơi về mock.
 */
export function classifyGuideLookupStatus(status: number): 'unavailable' | 'retryable' {
  return status === 404 || status === 400 ? 'unavailable' : 'retryable'
}
