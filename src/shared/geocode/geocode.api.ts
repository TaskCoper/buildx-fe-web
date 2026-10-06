import type { AddressSuggestion, GeocodedAddress, ReverseAddress } from './geocode.types'

/**
 * Gọi route geocode CỦA CHÍNH APP (`/api/geocode/*`), không phải VietMap và cũng
 * không phải API BMT — nên dùng `fetch` trần thay vì `http` của `shared/lib/api`
 * (cái đó gắn sẵn `baseURL` `/api/v1`, cookie và bộ chặn 401 của backend BMT).
 */
async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params)
  const response = await fetch(`${path}?${query.toString()}`)
  if (!response.ok) throw new Error(`Geocode lỗi ${response.status}`)
  return (await response.json()) as T
}

export const geocodeApi = {
  /** Gợi ý theo chữ đang gõ. `focus` là "lat,lng" để ưu tiên kết quả gần đó. */
  suggest: (text: string, focus?: string) =>
    getJson<AddressSuggestion[]>('/api/geocode/suggest', focus ? { text, focus } : { text }),

  /** Tra toạ độ của gợi ý đã chọn. */
  place: (refId: string) => getJson<GeocodedAddress>('/api/geocode/place', { refId }),

  /** Địa chỉ gần một toạ độ; `null` khi quanh đó không có địa chỉ nào. */
  reverse: (latitude: number, longitude: number) =>
    getJson<ReverseAddress | null>('/api/geocode/reverse', { lat: String(latitude), lng: String(longitude) })
}
