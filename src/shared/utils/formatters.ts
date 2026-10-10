import type { Locale } from '@/i18n/routing'

/**
 * Locale-aware formatting helpers built on the native Intl API.
 * Pass the active locale (from `useLocale()`) so output matches the UI.
 */

export function formatDate(
  value: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(locale, options).format(date)
}

/** Múi giờ hiển thị chung của toàn website — ngày/giờ luôn theo giờ Việt Nam. */
const DISPLAY_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function displayParts(value: Date | string | number, locale: Locale) {
  const date = value instanceof Date ? value : new Date(value)
  const parts = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: DISPLAY_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const weekday = get('weekday')
  return {
    date: `${get('day')}/${get('month')}/${get('year')}`,
    time: `${get('hour')}:${get('minute')}`,
    weekday: weekday.charAt(0).toLocaleUpperCase(locale) + weekday.slice(1)
  }
}

/**
 * MỘT kiểu ghi ngày cho toàn website (góp ý BuildX, mục 38), theo giờ Việt Nam:
 * - `formatDisplayDate` → "24/09/2026"
 * - `formatDisplayDate(…, { weekday: true })` → "Thứ Năm, 24/09/2026"
 * - `formatDisplayDate(…, { time: true })` → "14:45 - 23/09/2026"
 * - cả hai → "Thứ Năm, 14:45 - 24/09/2026"
 */
export function formatDisplayDate(
  value: Date | string | number,
  locale: Locale,
  options: { weekday?: boolean; time?: boolean } = {}
): string {
  const parts = displayParts(value, locale)
  const date = options.time ? `${parts.time} - ${parts.date}` : parts.date
  return options.weekday ? `${parts.weekday}, ${date}` : date
}

/**
 * Ngày + giờ (lịch hẹn tư vấn, lịch khảo sát, biên nhận…) — cùng kiểu với
 * `formatDisplayDate(…, { time: true })`: "14:45 - 23/09/2026", giờ 24h, giờ Việt Nam.
 *
 * Nhận thêm cặp `{ date: 'yyyy-mm-dd', time: 'HH:mm' }` — dạng lịch hẹn đang lưu —
 * và hiểu cặp đó là giờ Việt Nam, không phụ thuộc múi giờ của trình duyệt.
 */
export function formatDisplayDateTime(
  value: Date | string | number | { date: string; time: string },
  locale: Locale
): string {
  const instant = typeof value === 'object' && !(value instanceof Date) ? `${value.date}T${value.time}:00+07:00` : value
  return formatDisplayDate(instant, locale, { time: true })
}

/** Chỉ giờ "14:45" (24h, giờ Việt Nam) — cho nhãn kiểu "Đã lưu nháp lúc …". */
export function formatDisplayTime(value: Date | string | number, locale: Locale): string {
  return displayParts(value, locale).time
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatCurrency(value: number, locale: Locale, currency = 'VND'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2
  }).format(value)
}

/**
 * Ngày ngắn dạng `dd/MM` (thêm năm khi cần) — định dạng bản mô tả dùng ở mọi
 * lịch trình và chip nhắc lịch.
 *
 * KHÔNG dùng `Intl` cho dạng này: `vi-VN` trả về "23-09" (gạch nối) còn bản mô
 * tả viết "23/09", và hai kiểu này từng đứng cạnh nhau trong cùng một màn.
 */
export function formatDayMonth(
  value: Date | string | number,
  options: { year?: boolean; time?: boolean } = {}
): string {
  // Cùng múi giờ Việt Nam với `formatDisplayDate` — trước đây lấy giờ của trình duyệt.
  const parts = displayParts(value, 'vi')
  const base = options.year ? parts.date : parts.date.slice(0, 5)

  return options.time ? `${base} ${parts.time}` : base
}

/**
 * Giá dạng gọn `399.000đ` — cách viết trong bản mô tả (thẻ gói S01, S19).
 *
 * `Intl` tiếng Việt trả về "399.000 ₫" (có khoảng trắng và ký hiệu ₫), còn bản
 * mô tả viết liền chữ "đ". Chỉ dùng cho GIÁ HIỂN THỊ TRÊN THẺ; hoá đơn và bảng
 * kê vẫn dùng `formatCurrency` để giữ định dạng chuẩn.
 */
export function formatPriceTag(value: number, locale: Locale): string {
  if (locale !== 'vi') return formatCurrency(value, locale)
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

/**
 * Ngân sách dạng gọn `1,85 tỷ` — cách viết trong Hình S11 (thẻ dự án cột phải).
 *
 * Chỗ đó chỉ cần độ lớn để khách liếc qua, in đủ `1.850.000.000 ₫` thì dài gấp
 * ba và đè lên nhãn. Dưới một tỷ thì rơi về `formatPriceTag` vì "0,85 tỷ" khó
 * đọc hơn "850.000.000đ".
 */
export function formatBudgetShort(value: number, locale: Locale): string {
  if (locale !== 'vi' || value < 1_000_000_000) return formatPriceTag(value, locale)
  return `${formatNumber(value / 1_000_000_000, locale, { maximumFractionDigits: 2 })} tỷ`
}

/**
 * Nhóm chữ số theo hàng nghìn cho Ô NHẬP: `1850000000` → `1.850.000.000`.
 *
 * Khác `formatCurrency`/`formatPriceTag` ở chỗ KHÔNG kèm ký hiệu tiền tệ — người
 * dùng đang gõ dở, thêm "₫" vào giữa sẽ nhảy con trỏ. Mọi ký tự không phải số bị
 * bỏ, nên dán "1.850.000.000 đ" từ chỗ khác vào vẫn ra đúng.
 */
export function formatDigitGroups(value: string, locale: Locale): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return formatNumber(Number(digits), locale)
}

/**
 * `formatter` của ô nhập TIỀN (antd `InputNumber`): `1850000` → `1.850.000`.
 *
 * Luôn dấu chấm kiểu Việt cho mọi ô tiền ở khu quản trị (góp ý case 17), không phụ thuộc ngôn ngữ trình duyệt.
 * Chỉ dùng cho số nguyên VND — ô có phần thập phân (như phần trăm) không dùng hàm này.
 */
export function formatMoneyInput(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return ''
  return String(value)
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * `parser` đi cặp với {@link formatMoneyInput}: bỏ mọi ký tự không phải số (dán "1.850.000 ₫" vẫn ra đúng).
 * Ô trống trả chuỗi rỗng để antd hiểu là chưa nhập (trả 0 thì ô "không giới hạn" không xoá trống được).
 */
export function parseMoneyInput(value?: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/**
 * Vị trí con trỏ trong chuỗi đã nhóm, ngay SAU chữ số thứ `digits`.
 *
 * Ô nhập tiền được định dạng lại mỗi lần gõ (`1850` → `1.850`), React đặt lại giá trị nên con trỏ nhảy về cuối. Đếm số
 * chữ số nằm trước con trỏ rồi tìm lại đúng chỗ đó trong chuỗi mới thì sửa giữa chừng vẫn gõ tiếp đúng vị trí.
 */
export function caretAfterDigits(formatted: string, digits: number): number {
  if (digits <= 0) return 0
  let seen = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted.charAt(index))) seen += 1
    if (seen === digits) return index + 1
  }
  return formatted.length
}
