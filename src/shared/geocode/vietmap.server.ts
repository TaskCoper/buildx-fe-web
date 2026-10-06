import type { AddressSuggestion, GeocodedAddress, ReverseAddress } from './geocode.types'

/**
 * VietMap Maps API — CHỈ CHẠY Ở MÁY CHỦ.
 *
 * Khoá `VIETMAP_API_KEY` cố tình KHÔNG có tiền tố `NEXT_PUBLIC_` để Next không
 * nhúng vào bundle trình duyệt. File này chỉ được import từ route handler
 * (`src/app/api/geocode/*`); đừng import từ component phía client, khoá sẽ là
 * `undefined` và mọi lời gọi hỏng. Khoá hiển thị bản đồ là biến khác
 * (`NEXT_PUBLIC_VIETMAP_API_KEY`, Tilemap Key) — hai khoá không dùng lẫn nhau.
 *
 * Tài liệu: https://maps.vietmap.vn/docs/map-api/
 * - `GET /api/autocomplete/v4` — gợi ý theo chữ đang gõ, **không kèm toạ độ**.
 * - `GET /api/place/v4` — đổi `ref_id` của một gợi ý lấy `lat`/`lng`.
 * - `GET /api/reverse/v4` — địa chỉ gần một toạ độ (kéo ghim trên bản đồ).
 *
 * Mỗi lời gọi là MỘT lượt tính tiền, nên chọn xong một địa chỉ tốn hai lượt.
 * Vì thế Place có bộ nhớ đệm bên dưới, còn Autocomplete thì gọi thẳng (chữ gõ
 * luôn khác nhau nên đệm gần như vô dụng) và được gõ trễ ở phía client.
 */

const BASE = 'https://maps.vietmap.vn/api'

/**
 * Dạng địa giới sau sáp nhập 2025: phường → tỉnh/thành (bỏ cấp quận/huyện).
 * Đổi sang `2` nếu cần dạng cũ ba cấp.
 */
const DISPLAY_TYPE = '1'

interface VietmapSuggestion {
  ref_id: string
  name: string
  address: string
  display: string
}

interface VietmapPlace {
  display: string
  address: string
  ward: string
  district: string
  city: string
  lat: number
  lng: number
}

/** Lỗi có mã trạng thái để route trả đúng mã cho client. */
export class VietmapError extends Error {
  constructor(readonly status: number) {
    super(`VietMap trả về ${status}`)
    this.name = 'VietmapError'
  }
}

export class GeocodeNotConfiguredError extends Error {
  constructor() {
    super('Thiếu VIETMAP_API_KEY')
    this.name = 'GeocodeNotConfiguredError'
  }
}

async function call<T>(path: string, params: Record<string, string>): Promise<T> {
  const apikey = process.env.VIETMAP_API_KEY
  if (!apikey) throw new GeocodeNotConfiguredError()

  const query = new URLSearchParams({ ...params, apikey })
  // `no-store`: kết quả phụ thuộc chữ người dùng gõ, đệm của Next vô nghĩa ở đây.
  const response = await fetch(`${BASE}${path}?${query.toString()}`, { cache: 'no-store' })
  // KHÔNG đưa thân lỗi vào message — tránh lỡ ghi khoá ra log.
  if (!response.ok) throw new VietmapError(response.status)
  return (await response.json()) as T
}

interface VietmapReverseRow {
  name: string
  address: string
  display: string
  distance?: number
}

/** Địa chỉ gần nhất của một toạ độ, hoặc `null` khi quanh đó không có gì. Kết quả đã được VietMap xếp theo khoảng cách. */
export async function reverse(lat: number, lng: number): Promise<ReverseAddress | null> {
  const rows = await call<VietmapReverseRow[]>('/reverse/v4', {
    lat: String(lat),
    lng: String(lng),
    display_type: DISPLAY_TYPE
  })
  const first = rows.find((row) => row.name || row.display)
  return first ? { name: first.name ?? '', address: first.address ?? '', display: first.display ?? '' } : null
}

/** Gợi ý địa chỉ theo chữ đang gõ. Trả tối đa 10 dòng, chưa có toạ độ. */
export async function autocomplete(text: string, focus?: string): Promise<AddressSuggestion[]> {
  const params: Record<string, string> = { text, display_type: DISPLAY_TYPE }
  if (focus) params.focus = focus

  const rows = await call<VietmapSuggestion[]>('/autocomplete/v4', params)
  return rows.map((row) => ({
    refId: row.ref_id,
    display: row.display,
    name: row.name,
    address: row.address
  }))
}

/**
 * Đệm kết quả Place vì mỗi lần gọi là một lượt tính tiền, mà người dùng rất hay
 * chọn lại đúng địa chỉ vừa chọn (mở lại form, sửa tên rồi lưu…). Đệm nằm trong
 * bộ nhớ tiến trình nên mất khi máy chủ khởi động lại — chấp nhận được, đây là
 * tiết kiệm chứ không phải nguồn dữ liệu.
 */
const placeCache = new Map<string, GeocodedAddress>()
const PLACE_CACHE_MAX = 500

/** Đổi `ref_id` của một gợi ý lấy toạ độ + địa chỉ đầy đủ. */
export async function place(refId: string): Promise<GeocodedAddress> {
  const cached = placeCache.get(refId)
  if (cached) return cached

  // `refid` (liền, không gạch dưới) là tên tham số, khác tên trường `ref_id`
  // trong JSON. Phải gửi nguyên văn, kể cả tiền tố `auto:`.
  const row = await call<VietmapPlace>('/place/v4', { refid: refId })
  const result: GeocodedAddress = {
    display: row.display,
    address: row.address,
    // Dạng hai cấp trả `district` rỗng — giữ chuỗi rỗng, đừng bịa.
    ward: row.ward ?? '',
    district: row.district ?? '',
    city: row.city ?? '',
    latitude: row.lat,
    longitude: row.lng
  }

  if (placeCache.size >= PLACE_CACHE_MAX) {
    const oldest = placeCache.keys().next().value
    if (oldest) placeCache.delete(oldest)
  }
  placeCache.set(refId, result)
  return result
}
