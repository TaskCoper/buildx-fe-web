/**
 * Khoảng cách đường chim bay giữa hai toạ độ — cùng công thức và cùng hằng số với backend (TDD-CTR-002: Haversine,
 * R = 6371.0088 km) để số km tính ở FE khớp số `distanceKm` BE trả ở các màn khác. Không phải độ dài đường đi.
 */
const EARTH_RADIUS_KM = 6371.0088

export interface GeoPoint {
  latitude: number
  longitude: number
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Km giữa hai điểm, chưa làm tròn (nơi hiển thị tự định dạng). */
export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2
  // Kẹp 0..1 để sai số máy gần hai điểm đối xứng không làm `asin` ra NaN.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
}
