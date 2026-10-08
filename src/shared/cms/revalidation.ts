/**
 * Làm mới trang theo yêu cầu (on-demand ISR): backend gọi webhook `POST /api/revalidate` sau khi admin lưu hoặc xóa nội
 * dung, để trang công khai đổi ngay thay vì chờ hết chu kỳ 60 giây.
 *
 * File này chỉ có logic thuần (thẻ, kiểm tra nội dung yêu cầu, so khóa) để cả route handler, hàm lấy dữ liệu ở server và
 * script test bằng node dùng chung, không import gì.
 */

/**
 * Thẻ gắn vào lời gọi lấy khối chữ của một trang (`fetchPageSections`). Backend gửi đúng chuỗi này (xem
 * `FrontendRevalidator.PageSectionsTag` của bmt-be): làm mới thẻ là làm mới mọi trang đã dựng từ khối chữ đó, kể cả
 * chân trang nằm trong layout của cả nhóm trang.
 */
export const pageSectionsTag = (pageKey: string): string => `page-sections:${pageKey}`

/** Tên header mang khóa bí mật của webhook; trùng `FrontendRevalidator.SecretHeader` của backend. */
export const REVALIDATE_SECRET_HEADER = 'x-revalidate-secret'

/** Số thẻ và đường dẫn tối đa trong một lần gọi. */
const MAX_ITEMS = 20

const TAG_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/i
const PATH_PATTERN = /^\/[A-Za-z0-9/_\-[\].]{0,200}$/

export interface RevalidationRequest {
  tags: string[]
  paths: string[]
}

export type ParsedRevalidation = { ok: true; value: RevalidationRequest } | { ok: false; error: string }

/**
 * Kiểm tra nội dung yêu cầu `{ tags?: string[], paths?: string[] }`. Chỉ nhận thẻ và đường dẫn đúng khuôn, tối đa
 * {@link MAX_ITEMS} mỗi loại, và phải có ít nhất một mục: lời gọi sai khuôn bị từ chối chứ không bị lờ đi.
 */
export function parseRevalidationBody(body: unknown): ParsedRevalidation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Nội dung phải là đối tượng JSON.' }
  }

  const { tags = [], paths = [] } = body as { tags?: unknown; paths?: unknown }
  if (!Array.isArray(tags) || !Array.isArray(paths)) {
    return { ok: false, error: '`tags` và `paths` phải là mảng chuỗi.' }
  }
  if (tags.length > MAX_ITEMS || paths.length > MAX_ITEMS) {
    return { ok: false, error: `Tối đa ${MAX_ITEMS} thẻ và ${MAX_ITEMS} đường dẫn mỗi lần.` }
  }
  if (tags.length + paths.length === 0) {
    return { ok: false, error: 'Cần ít nhất một thẻ hoặc đường dẫn.' }
  }

  if (!tags.every((tag) => typeof tag === 'string' && TAG_PATTERN.test(tag))) {
    return { ok: false, error: 'Có thẻ không hợp lệ.' }
  }
  if (
    !paths.every(
      (path) => typeof path === 'string' && PATH_PATTERN.test(path) && !path.includes('..') && !path.includes('//')
    )
  ) {
    return { ok: false, error: 'Có đường dẫn không hợp lệ.' }
  }

  return { ok: true, value: { tags: [...new Set(tags as string[])], paths: [...new Set(paths as string[])] } }
}
