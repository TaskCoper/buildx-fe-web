/**
 * Địa chỉ khách chọn ở cửa sổ Tạo dự án, chuyển sang Bước 1. `POST /estimates` chỉ nhận tên + toạ độ (không nhận địa chỉ),
 * nên Bước 1 phải ghi địa chỉ chữ + tỉnh/phường cùng cặp toạ độ đó ở lần mở đầu tiên. Lưu ở sessionStorage theo mã dự
 * toán, dùng MỘT lần rồi xoá.
 */

export interface AddressSeed {
  /** Số nhà, đường đã chốt. */
  text: string
  /** Địa chỉ "phường/xã, tỉnh/thành" của VietMap (để chọn tỉnh/phường trong form). */
  region: string
  latitude: number
  longitude: number
}

const key = (projectId: string) => `bmt.estimate-address-seed.${projectId}`

export function writeAddressSeed(projectId: string, seed: AddressSeed): void {
  try {
    window.sessionStorage.setItem(key(projectId), JSON.stringify(seed))
  } catch {
    // Chặn lưu trữ: Bước 1 chỉ không được điền sẵn, khách chọn lại địa chỉ.
  }
}

export function takeAddressSeed(projectId: string): AddressSeed | null {
  try {
    const raw = window.sessionStorage.getItem(key(projectId))
    if (!raw) return null
    window.sessionStorage.removeItem(key(projectId))
    const value = JSON.parse(raw) as Partial<AddressSeed>
    return typeof value.text === 'string' && typeof value.latitude === 'number' && typeof value.longitude === 'number'
      ? { text: value.text, region: value.region ?? '', latitude: value.latitude, longitude: value.longitude }
      : null
  } catch {
    return null
  }
}
