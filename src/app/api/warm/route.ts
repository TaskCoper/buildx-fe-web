import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { warmImages } from '@/shared/lib/warm-images'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Một lượt warm có thể kéo dài vài phút khi cache trống (xem TIME_BUDGET_MS trong warm-images).
export const maxDuration = 300

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

const digest = (value: string) => createHash('sha256').update(value).digest()

/**
 * Hâm nóng cache ảnh của bộ tối ưu: sinh trước mọi bậc ảnh để khách không phải chờ resize nguội.
 *
 *     curl -H "Authorization: Bearer $CMS_REVALIDATION_SECRET" https://<host>/api/warm
 *     curl -H "Authorization: Bearer $CMS_REVALIDATION_SECRET" "https://<host>/api/warm?from=120"
 *
 * Phản hồi có `nextFrom` khác null nghĩa là chưa hết việc, gọi lại với số đó. Dùng chung khoá với webhook CMS và chỉ
 * nhận qua header (không để khoá trên URL vì URL bị ghi log). Nên gọi một lần sau mỗi lần deploy (cache ảnh trống sau
 * deploy nếu chưa có volume) — `/api/cms/revalidate` cũng tự gọi sau mỗi lần nội dung đổi.
 */
export async function GET(request: Request) {
  const secret = process.env.CMS_REVALIDATION_SECRET
  const supplied = request.headers.get('authorization')
  if (!secret || !supplied || !timingSafeEqual(digest(supplied), digest(`Bearer ${secret}`))) {
    return json({ code: 'Unauthorized' }, 401)
  }
  const from = Number(new URL(request.url).searchParams.get('from') ?? 0)
  return json(await warmImages(Number.isInteger(from) && from > 0 ? from : 0))
}
