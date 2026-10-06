import { http } from '@/shared/lib/api'

/**
 * Tìm địa chỉ và tra toạ độ qua BE (`GET /maps/search`, `GET /maps/place`): khoá VietMap tìm/tra nằm ở backend, FE
 * chỉ giữ khoá TileMap để vẽ bản đồ. Người dùng phải đăng nhập (BE trả 401/403 nếu không).
 */

/** Một địa điểm khớp; gửi NGUYÊN `refId` khi người dùng chọn. */
export interface AddressSuggestion {
  refId: string
  /** Số nhà + tên đường (hoặc tên địa điểm). */
  name: string
  /** Phường + tỉnh/thành. */
  address: string
  /** Địa chỉ đầy đủ. */
  display: string
}

export interface PlaceCoordinates {
  refId: string
  display: string
  /** Vĩ độ, độ thập phân. */
  latitude: number
  /** Kinh độ, độ thập phân. */
  longitude: number
}

export const mapsApi = {
  search: async (address: string): Promise<AddressSuggestion[]> =>
    (await http.get<AddressSuggestion[] | null>('/maps/search', { params: { address } })) ?? [],

  place: (refId: string) => http.get<PlaceCoordinates>('/maps/place', { params: { refId } })
}
