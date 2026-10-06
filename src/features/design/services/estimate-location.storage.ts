/**
 * Lưu TẠM vị trí (vĩ độ/kinh độ) ở trình duyệt theo từng dự toán, chỉ dùng khi BE CHƯA lưu toạ độ cho dự toán đó (khoá
 * `latitude` không có trong `GET /estimates/{id}`). BE đã triển khai toạ độ thì không còn đọc/ghi ở đây. Mọi truy cập
 * bọc try/catch: trình duyệt có thể chặn lưu trữ.
 */

export interface StoredLocation {
  latitude: number
  longitude: number
}

const key = (projectId: string) => `bmt.estimate-location.${projectId}`

export function readStoredLocation(projectId: string): StoredLocation | null {
  try {
    const raw = window.localStorage.getItem(key(projectId))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<StoredLocation>
    return typeof value.latitude === 'number' && typeof value.longitude === 'number'
      ? { latitude: value.latitude, longitude: value.longitude }
      : null
  } catch {
    return null
  }
}

export function writeStoredLocation(projectId: string, location: StoredLocation | null): void {
  try {
    if (location) window.localStorage.setItem(key(projectId), JSON.stringify(location))
    else window.localStorage.removeItem(key(projectId))
  } catch {
    // Chặn lưu trữ: vẫn dùng được trong phiên này.
  }
}
