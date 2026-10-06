/**
 * Logic thuần của khu quản trị — không React, không HTTP.
 */

/**
 * Sinh mã cho bản ghi mới. Backend thật sẽ cấp id; ở chế độ mock chỉ cần một
 * chuỗi không đụng nhau, có tiền tố để nhìn là biết thuộc bảng nào.
 */
export function newAdminId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}${random}`
}

/** `yyyy-mm-dd` theo giờ địa phương (không dùng toISOString vì lệch múi giờ). */
export function todayKey(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Bỏ dấu tiếng Việt và chuyển thành slug dùng cho URL bài viết. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
