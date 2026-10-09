import { NextResponse } from 'next/server'
import sharp from 'sharp'

import {
  LIBRARY_IMAGE_MAX_SOURCE_BYTES,
  isConvertibleMediaType,
  isGuid,
  libraryImageQuality,
  negotiateLibraryImageFormat,
  parseLibraryImageWidth
} from '@/shared/media/library-image.logic'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ versionId: string; assetId: string }>
}

/** Trình duyệt giữ bản đã đổi tối đa chừng này giây; ngắn hơn một ngày vì backend chủ ý không cho cache lâu nội dung trả phí. */
const BROWSER_CACHE_SECONDS = 3600

/** Mã lỗi của backend được chuyển nguyên cho trình duyệt (quyền, không thấy, kho ảnh tạm lỗi); mã khác coi là lỗi cổng. */
const PASS_THROUGH = new Set([401, 403, 404, 503])

function fail(status: number, code: string) {
  return NextResponse.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Ảnh thư viện mẫu đã đổi cỡ và định dạng — `GET /api/media/library/{versionId}/{assetId}?w=640|960|1280|1920`.
 *
 * Thay cho `contentUrl` của backend (trả nguyên file gốc, `no-store`) ở chỗ chỉ HIỂN THỊ ảnh; nút "Tải" vẫn lấy file gốc
 * từ backend. Nội dung chỉ cấp cho người đã mở mẫu, nên route này:
 *  - chuyển cookie của CHÍNH người xem lên backend để backend kiểm quyền như cũ (không có cookie hay không có quyền thì
 *    nhận đúng mã lỗi của backend, không bao giờ nhận ảnh);
 *  - không lưu gì ở phía máy chủ và không đi qua `/_next/image` (cache dùng chung của Next);
 *  - trả `Cache-Control: private` + `Vary: Cookie` để chỉ trình duyệt của người xem được giữ bản sao.
 *
 * Tệp không phải JPEG/PNG/WebP, tệp quá lớn hoặc lỗi đổi định dạng thì trả lỗi và trình duyệt tự quay về file gốc.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { versionId, assetId } = await params
  if (!isGuid(versionId) || !isGuid(assetId)) return fail(400, 'InvalidId')

  const url = new URL(request.url)
  const width = parseLibraryImageWidth(url.searchParams.get('w'))
  if (!width) return fail(400, 'InvalidWidth')

  const cookie = request.headers.get('cookie')
  if (!cookie) return fail(401, 'Unauthorized')

  const origin = (process.env.BMT_API_ORIGIN ?? 'https://bmt-api.vnzdna.com').replace(/\/$/, '')
  let upstream: Response
  try {
    upstream = await fetch(`${origin}/api/v1/library-versions/${versionId}/assets/${assetId}/content`, {
      headers: { cookie, accept: 'image/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000)
    })
  } catch {
    return fail(502, 'UpstreamUnavailable')
  }
  if (!upstream.ok) return fail(PASS_THROUGH.has(upstream.status) ? upstream.status : 502, 'UpstreamRejected')

  const mediaType = upstream.headers.get('content-type')
  if (!isConvertibleMediaType(mediaType)) return fail(415, 'NotConvertible')
  const declared = Number(upstream.headers.get('content-length') ?? 0)
  if (declared > LIBRARY_IMAGE_MAX_SOURCE_BYTES) return fail(413, 'SourceTooLarge')

  const source = Buffer.from(await upstream.arrayBuffer())
  if (source.length > LIBRARY_IMAGE_MAX_SOURCE_BYTES) return fail(413, 'SourceTooLarge')

  const format = negotiateLibraryImageFormat(request.headers.get('accept'))
  const headers: Record<string, string> = {
    'Cache-Control': `private, max-age=${BROWSER_CACHE_SECONDS}`,
    Vary: 'Cookie, Accept',
    'X-Content-Type-Options': 'nosniff'
  }

  // Trình duyệt không nhận AVIF lẫn WebP (rất cũ): giữ nguyên file gốc.
  if (format === 'original') {
    return new NextResponse(new Uint8Array(source), {
      headers: { ...headers, 'Content-Type': mediaType ?? 'application/octet-stream' }
    })
  }

  try {
    const { quality, chroma } = libraryImageQuality(mediaType)
    const resized = sharp(source, { limitInputPixels: 120_000_000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
    const output =
      format === 'avif'
        ? await resized.avif({ quality, effort: 3, chromaSubsampling: chroma }).toBuffer()
        : await resized.webp({ quality: quality + 15 }).toBuffer()
    return new NextResponse(new Uint8Array(output), {
      headers: { ...headers, 'Content-Type': format === 'avif' ? 'image/avif' : 'image/webp' }
    })
  } catch {
    return fail(422, 'ConvertFailed')
  }
}
