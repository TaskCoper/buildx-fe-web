import { NextResponse } from 'next/server'

import { GeocodeNotConfiguredError, VietmapError, autocomplete } from '@/shared/geocode/vietmap.server'

/**
 * Gợi ý địa chỉ — `GET /api/geocode/suggest?text=...`.
 *
 * Trình duyệt gọi route này chứ KHÔNG gọi thẳng VietMap: khoá dịch vụ tính tiền
 * theo lượt nên phải nằm lại máy chủ (tài liệu VietMap cũng yêu cầu vậy).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const text = (params.get('text') ?? '').trim()
  const focus = params.get('focus') ?? undefined

  // VietMap yêu cầu tối thiểu 2 ký tự; trả rỗng sớm để khỏi tốn một lượt.
  if (text.length < 2) return NextResponse.json([])

  try {
    return NextResponse.json(await autocomplete(text, focus))
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
