/**
 * Điều kiện "đủ để công bố" mà BE kiểm — hàm thuần để form quản trị báo thiếu ngay trước khi gọi API.
 * Giữ khớp với BE: `NewsArticleWriteFlow.MissingForPublish` (BR-NEWS-001) và
 * `LibraryContentPolicy` / `LibrarySectionPolicy.RequirePublishable` (BR-LIB-001).
 */

/**
 * Nội dung bài có chữ khác khoảng trắng hoặc ít nhất một ảnh có `src` — đúng nghĩa `HasMeaningfulContent` của BE.
 * Trình soạn rich text trả `<p></p>` khi để trống nên không thể chỉ kiểm chuỗi rỗng.
 */
export function hasMeaningfulHtml(html: string | null | undefined): boolean {
  if (!html) return false
  if (/<img\b[^>]*\bsrc\s*=\s*["']?[^"'\s>]/i.test(html)) return true
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 0
}

/** Phần của một mục (section) trong form thư viện mà việc kiểm tra cần đọc. */
export interface LibrarySectionDraft {
  sectionId?: string
  name: string
  files: readonly { name: string }[]
  assets: readonly { isImage: boolean }[]
}

export type LibrarySectionsProblem =
  | { kind: 'noSection' }
  | { kind: 'sectionWithoutFile'; name: string }
  | { kind: 'noImage' }

/**
 * Mục để trống hoàn toàn (mới, không tên, không tệp) bị bỏ khi lưu nên không tính — giống `normalizeSections`.
 * Còn lại phải: có ít nhất một mục; mỗi mục có ít nhất một tệp; tổng cộng có ít nhất một ảnh (ảnh đầu tiên
 * làm ảnh đại diện). Tên mục để trống được điền "Tầng N" lúc lưu nên không phải điều kiện ở đây.
 */
export function librarySectionsProblem(
  sections: readonly LibrarySectionDraft[],
  isImageName: (fileName: string) => boolean
): LibrarySectionsProblem | null {
  const kept = sections.filter((section) => section.sectionId || section.name.trim() !== '' || section.files.length > 0)
  if (kept.length === 0) return { kind: 'noSection' }

  const empty = kept.find((section) => section.files.length + section.assets.length === 0)
  if (empty) return { kind: 'sectionWithoutFile', name: empty.name.trim() }

  const hasImage = kept.some(
    (section) => section.assets.some((asset) => asset.isImage) || section.files.some((file) => isImageName(file.name))
  )
  return hasImage ? null : { kind: 'noImage' }
}
