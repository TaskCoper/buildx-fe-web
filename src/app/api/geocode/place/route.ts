import { NextResponse } from 'next/server'

import { GeocodeNotConfiguredError, VietmapError, place } from '@/shared/geocode/vietmap.server'

/**
 * Lấy toạ độ của một gợi ý — `GET /api/geocode/place?refId=...`.
 *
 * Gọi sau khi người dùng CHỌN một dòng gợi ý, vì VietMap không trả toạ độ ở
 * bước gợi ý. Một lần chọn địa chỉ = hai lượt tính tiền (gợi ý + tra toạ độ).
 */
export async function GET(request: Request) {
  const refId = new URL(request.url).searchParams.get('refId')
  if (!refId) return NextResponse.json({ error: 'MissingRefId' }, { status: 400 })

  try {
    return NextResponse.json(await place(refId))
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
