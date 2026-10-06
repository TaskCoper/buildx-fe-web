/**
 * Giữ số nhà khách đã gõ khi chọn một gợi ý địa chỉ.
 *
 * VietMap hay trả gợi ý cấp ĐƯỜNG ("Đường Nguyễn Huệ") dù khách gõ "12 Nguyễn Huệ"; ghi đè ô bằng gợi ý đó làm mất số nhà
 * (khách thấy "không chọn được số nhà"). Gợi ý đã có số ở đầu (cấp địa chỉ) thì giữ nguyên; chưa có thì ghép số nhà của
 * khách vào trước tên đường, bỏ tiền tố "Đường/Phố" cho giống cách viết địa chỉ.
 */

/** Số nhà ở đầu chuỗi: "12", "12A", "12/3", "12-14", "12/3A". */
const HOUSE_NUMBER = /^\s*(\d+[A-Za-zÀ-ỹ]?(?:[/-]\d+[A-Za-zÀ-ỹ]?)*)(?=[\s,]|$)/u

export function houseNumberOf(typed: string): string | null {
  return HOUSE_NUMBER.exec(typed)?.[1] ?? null
}

export function addressWithHouseNumber(typed: string, suggestion: string): string {
  const base = suggestion.trim()
  const number = houseNumberOf(typed)
  if (!number || /^\d/.test(base)) return base
  return `${number} ${base.replace(/^(đường|phố)\s+/iu, '')}`
}
