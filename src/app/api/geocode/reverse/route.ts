import { NextResponse } from 'next/server'

import { GeocodeNotConfiguredError, VietmapError, reverse } from '@/shared/geocode/vietmap.server'

/**
 * Địa chỉ tại một toạ độ — `GET /api/geocode/reverse?lat=...&lng=...`.
 *
 * Dùng khi khách kéo ghim / bấm bản đồ để chỉnh vị trí: ô số nhà, đường đổi theo ghim. Trả `null` khi quanh đó không có
 * địa chỉ nào (ghim giữa đồng, giữa sông…) để client giữ nguyên ô nhập thay vì ghi đè bằng chữ rỗng.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const valid =
    params.get('lat') !== null &&
    params.get('lng') !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  if (!valid) return NextResponse.json({ error: 'InvalidCoordinates' }, { status: 400 })

  try {
    return NextResponse.json(await reverse(lat, lng))
  } catch (error) {
    if (error instanceof GeocodeNotConfiguredError) {
      return NextResponse.json({ error: 'GeocodeNotConfigured' }, { status: 503 })
    }
    if (error instanceof VietmapError) {
      return NextResponse.json({ error: 'GeocodeUpstreamFailed' }, { status: 502 })
    }
    return NextResponse.json({ error: 'GeocodeFailed' }, { status: 500 })
  }
}
