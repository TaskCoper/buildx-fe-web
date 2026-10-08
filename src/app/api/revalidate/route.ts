import { createHash, timingSafeEqual } from 'node:crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

import { parseRevalidationBody, REVALIDATE_SECRET_HEADER } from '@/shared/cms/revalidation'

/**
 * Webhook làm mới trang theo yêu cầu (on-demand ISR). Backend gọi sau khi admin lưu hoặc xóa nội dung:
 *
 *   POST /api/revalidate
 *   x-revalidate-secret: <REVALIDATE_SECRET>
 *   { "tags": ["page-sections:home"] }       (hoặc "paths": ["/vi/contractors"])
 *
 * Trang dựng sẵn vẫn tự làm mới theo chu kỳ (60 giây); webhook chỉ để khách thấy nội dung mới ngay. Làm mới theo thẻ
 * nên một lần gọi cập nhật mọi trang đã dùng khối chữ đó, kể cả chân trang nằm trong layout.
 *
 * Chưa đặt `REVALIDATE_SECRET` thì webhook tắt (503). Khóa sai trả 401, không ghi lại giá trị đã gửi.
 */

/** So hai chuỗi không lộ độ dài hay vị trí khác nhau: băm trước để hai bên bằng độ dài rồi so thời gian không đổi. */
function sameSecret(provided: string, expected: string): boolean {
  const hash = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(hash(provided), hash(expected))
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'Webhook làm mới chưa được bật.' }, { status: 503 })
  }

  const provided = request.headers.get(REVALIDATE_SECRET_HEADER) ?? ''
  if (!sameSecret(provided, expected)) {
    return NextResponse.json({ error: 'Khóa không đúng.' }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = parseRevalidationBody(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { tags, paths } = parsed.value
  // `expire: 0` hết hạn ngay: người xem kế tiếp nhận bản mới, không phải bản cũ trong lúc nó làm mới ngầm.
  for (const tag of tags) revalidateTag(tag, { expire: 0 })
  for (const path of paths) revalidatePath(path)

  return NextResponse.json({ revalidated: true, tags, paths })
}
