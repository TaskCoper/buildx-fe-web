/**
 * Đổi địa chỉ do VietMap trả ("Phường Chợ Quán,Thành phố Hồ Chí Minh") thành tỉnh/thành và phường/xã đã chọn trong form.
 * Danh sách của BE và VietMap viết tên hơi khác nhau (tiền tố, dấu, khoảng trắng) nên so khớp theo tên đã chuẩn hoá,
 * không so chuỗi thô. Không khớp thì trả `undefined` — form giữ lựa chọn cũ thay vì đoán.
 */

/** Địa chỉ dạng hai cấp sau sáp nhập: "phường/xã, tỉnh/thành" (cấp cuối là tỉnh, cấp liền trước là phường/xã). */
export function parseRegion(address: string): { ward: string; province: string } {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return { province: parts.at(-1) ?? '', ward: parts.length >= 2 ? (parts.at(-2) ?? '') : '' }
}

const PREFIX = /^(thanh pho|tinh|tp\.?|phuong|xa|dac khu|thi tran|quan|huyen)\s+/

/** Bỏ dấu, chữ thường, bỏ tiền tố hành chính và khoảng trắng thừa: "Thành phố Hồ Chí Minh" → "ho chi minh". */
export function foldName(name: string): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim()
  return base.replace(PREFIX, '').trim()
}

export function findByName<T extends { name: string }>(list: readonly T[] | undefined, name: string): T | undefined {
  const wanted = foldName(name)
  if (!wanted) return undefined
  return list?.find((item) => foldName(item.name) === wanted)
}
