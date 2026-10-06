/**
 * Số điện thoại liên lạc (mục IV.3.d): 10 chữ số bắt đầu bằng 0, hoặc dạng
 * +84 bỏ số 0 đầu. Chấp nhận khoảng trắng / dấu chấm / gạch nối khi người dùng
 * gõ, nhưng chuẩn hóa về dạng liền trước khi lưu.
 *
 * Nằm ở `shared/` vì hai feature dùng chung: modal "Bổ sung số điện thoại" của
 * Bước 1 (`features/design`) và modal xác nhận đặt lịch tư vấn
 * (`features/consultation`, mục VIII.3) — hai feature không được import lẫn nhau.
 */
const VN_PHONE = /^(0\d{9}|\+84\d{9})$/

/** Bỏ mọi ký tự phân cách người dùng gõ cho dễ nhìn. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s.-]/g, '')
}

export function isValidPhone(raw: string): boolean {
  return VN_PHONE.test(normalizePhone(raw))
}

/**
 * "0938123456" → "0938 123 456" — tách nhóm 4-3-3 cho dễ đọc lúc gõ (modal đặt
 * lịch tư vấn, mục VIII.3). Bỏ qua dạng `+84...`: gạch bỏ dấu `+` sẽ phá luôn
 * định dạng quốc tế, trong khi ảnh mô tả chỉ cho ví dụ số nội địa.
 */
export function formatPhoneDisplay(raw: string): string {
  if (raw.trim().startsWith('+')) return raw
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)].filter(Boolean).join(' ')
}
