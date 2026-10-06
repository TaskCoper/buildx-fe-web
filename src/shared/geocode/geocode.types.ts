/**
 * Địa chỉ + toạ độ dùng chung cho cả khu quản trị và trang khách.
 *
 * Vì sao cần toạ độ: BR-CTR-006 giao cho frontend việc xác định kinh độ/vĩ độ
 * từ địa chỉ người dùng nhập, rồi gửi kèm xuống backend — backend TỪ CHỐI tạo
 * công trình nếu thiếu một trong hai, và hồ sơ nhà thầu phải đủ toạ độ mới được
 * bật Hiện (BR-CTR-002). Toạ độ còn dùng để tìm nhà thầu theo bán kính km.
 */

/** Một dòng gợi ý khi đang gõ — CHƯA có toạ độ (VietMap chỉ trả sau bước chọn). */
export interface AddressSuggestion {
  /** Khoá để tra toạ độ ở bước sau; gửi nguyên văn, không cắt tiền tố. */
  refId: string
  /** Dòng đầy đủ để hiển thị, gồm cả phường/tỉnh. */
  display: string
  /** Phần số nhà + tên đường. */
  name: string
  /** Phần phường + tỉnh/thành. */
  address: string
}

/** Địa chỉ gần một toạ độ (kéo ghim trên bản đồ). */
export interface ReverseAddress {
  /** Số nhà + tên đường. */
  name: string
  /** Phường + tỉnh/thành. */
  address: string
  display: string
}

/** Địa chỉ đã chốt, đủ toạ độ để gửi xuống backend. */
export interface GeocodedAddress {
  display: string
  address: string
  ward: string
  /** Rỗng với dạng địa giới hai cấp sau sáp nhập 2025. */
  district: string
  city: string
  latitude: number
  longitude: number
}
