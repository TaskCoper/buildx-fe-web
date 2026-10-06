/**
 * Quy tắc dùng chung của các danh mục quản trị — thuần, không React, không HTTP.
 */

/** So khớp tên không phân biệt hoa thường, bỏ khoảng trắng hai đầu (tên danh mục không trùng). */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('vi') === b.trim().toLocaleLowerCase('vi')
}
