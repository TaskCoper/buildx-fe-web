import { NextResponse } from 'next/server'

import { lucideIconKey } from '@/shared/cms/home-sections'
import { resolveIconNodes } from '@/shared/cms/icon-nodes.server'

/**
 * Xem trước icon cho ô nhập tên icon của admin — `GET /api/icon-preview?name=Camera`.
 *
 * Trả `{ key, node }`: `node` là dữ liệu vẽ icon, hoặc `null` khi tên không phải icon lucide (admin gõ sai hoặc icon
 * không có trong phiên bản thư viện đang dùng). Chỉ trả hình dạng công khai của thư viện, không đụng dữ liệu nào của
 * hệ thống nên không cần đăng nhập.
 *
 * Là route `GET` thường chứ không phải server action: server action kiểm Origin so với Host, dễ bị từ chối khi ứng dụng
 * chạy sau reverse proxy hoặc tunnel; còn tra theo tên thì kết quả không đổi nên cho trình duyệt cache được.
 */
export function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name') ?? ''
  const key = lucideIconKey(name) ?? null
  const node = key ? (resolveIconNodes([name])[key] ?? null) : null

  return NextResponse.json({ key, node }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
