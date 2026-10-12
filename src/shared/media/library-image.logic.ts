/**
 * Phần thuần của route ảnh thư viện mẫu đã đổi cỡ / đổi định dạng (không import để kiểm bằng `node --test`, xem
 * `scripts/library-image.test.mjs`).
 *
 * Ảnh trong trang chi tiết mẫu là `contentUrl` của backend (`/api/v1/library-versions/{v}/assets/{a}/content`): route tải
 * có kiểm quyền bằng cookie, trả NGUYÊN FILE gốc với `Cache-Control: private, no-store`. Bộ tối ưu của Next
 * (`/_next/image`) không dùng được cho ảnh này vì nó lưu cache DÙNG CHUNG cho mọi người, mà nội dung chỉ cấp cho người đã
 * mở mẫu. Route `/api/media/library/{v}/{a}` thay vào đó: chuyển cookie của chính người xem lên backend (backend vẫn
 * kiểm quyền), đổi sang WebP đúng cỡ rồi chỉ cho cache RIÊNG trong trình duyệt của họ.
 */

/** Các cỡ rộng (px) được phép; ngoài danh sách thì từ chối để không ai ép máy chủ dựng vô hạn biến thể. */
export const LIBRARY_IMAGE_WIDTHS = [640, 960, 1280, 1920] as const

export type LibraryImageWidth = (typeof LIBRARY_IMAGE_WIDTHS)[number]

/** Đường dẫn của route đổi cỡ (đặt dưới `app/api/media/library`). */
export const LIBRARY_IMAGE_ROUTE = '/api/media/library'

const GUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const GUID_PATTERN = new RegExp(`^${GUID}$`)
const CONTENT_URL = new RegExp(`^/api/v1/library-versions/(${GUID})/assets/(${GUID})/content/?$`)

export function isGuid(value: string): boolean {
  return GUID_PATTERN.test(value)
}

/** Tách mã phiên bản và mã tệp từ `contentUrl` của backend; URL khác dạng (kể cả có query) thì trả `null`. */
export function parseLibraryContentUrl(url: string | null | undefined): { versionId: string; assetId: string } | null {
  const match = url ? CONTENT_URL.exec(url) : null
  return match ? { versionId: match[1]!.toLowerCase(), assetId: match[2]!.toLowerCase() } : null
}

/** `?w=` chỉ nhận đúng chuỗi của các cỡ trong danh sách (`0640` hay `640.0` đều bị từ chối); thiếu hoặc lạ thì `null`. */
export function parseLibraryImageWidth(raw: string | null | undefined): LibraryImageWidth | null {
  return LIBRARY_IMAGE_WIDTHS.find((width) => String(width) === raw) ?? null
}

/** Địa chỉ ảnh đã đổi cỡ của một `contentUrl`; không phải `contentUrl` thư viện thì `null` (giữ nguyên URL gốc). */
export function libraryImageUrl(contentUrl: string | null | undefined, width: LibraryImageWidth): string | null {
  const parsed = parseLibraryContentUrl(contentUrl)
  return parsed ? `${LIBRARY_IMAGE_ROUTE}/${parsed.versionId}/${parsed.assetId}?w=${width}` : null
}

/** `srcset` đủ các cỡ cho trình duyệt tự chọn theo `sizes` và độ nét màn hình. */
export function libraryImageSrcSet(contentUrl: string | null | undefined): string | undefined {
  const entries = LIBRARY_IMAGE_WIDTHS.map((width) => {
    const url = libraryImageUrl(contentUrl, width)
    return url ? `${url} ${width}w` : null
  })
  return entries.every(Boolean) ? entries.join(', ') : undefined
}

/**
 * Định dạng trả về: WebP khi trình duyệt nhận, còn lại giữ nguyên file gốc (không đổi định dạng). Chỉ đổi ảnh
 * JPEG/PNG/WebP; tệp khác (PDF, DWG, DXF, ảnh động…) không đi qua route này.
 *
 * KHÔNG xuất AVIF ở đây dù trình duyệt nhận: ảnh thư viện là nội dung bảo vệ (`no-store`, kiểm quyền mỗi lần đọc) nên
 * không cache và không hâm nóng được — lần nào xem cũng phải mã hoá lại. AVIF đắt gấp 3–4 lần WebP (đo ảnh phối cảnh rộng
 * 960: 227 ms so với 59 ms; rộng 1920: 476 ms so với 133 ms trên máy dev nhanh, chậm hơn nhiều lần trên máy chủ nhỏ) mà
 * dung lượng ra gần như bằng nhau, nên tiền CPU không đáng.
 */
export type LibraryImageFormat = 'webp' | 'original'

export const CONVERTIBLE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function isConvertibleMediaType(mediaType: string | null | undefined): boolean {
  const base = (mediaType ?? '').split(';')[0]?.trim().toLowerCase() ?? ''
  return (CONVERTIBLE_MEDIA_TYPES as readonly string[]).includes(base)
}

export function negotiateLibraryImageFormat(accept: string | null | undefined): LibraryImageFormat {
  return (accept ?? '').toLowerCase().includes('image/webp') ? 'webp' : 'original'
}

/**
 * Mức nén theo nguồn. PNG thường là bản vẽ mặt bằng, chữ nhỏ và nét mảnh nên giữ đủ màu (4:4:4) và chất lượng cao hơn;
 * JPEG là ảnh chụp / phối cảnh nên 4:2:0 đủ và nhỏ hơn rõ rệt.
 */
export function libraryImageQuality(mediaType: string | null | undefined): {
  quality: number
  chroma: '4:4:4' | '4:2:0'
} {
  const base = (mediaType ?? '').split(';')[0]?.trim().toLowerCase()
  return base === 'image/png' ? { quality: 65, chroma: '4:4:4' } : { quality: 60, chroma: '4:2:0' }
}

/** Trần dung lượng file gốc mà route chịu đổi (byte); lớn hơn thì trả lỗi 413 và trình duyệt tự dùng file gốc. */
export const LIBRARY_IMAGE_MAX_SOURCE_BYTES = 30_000_000

/**
 * Nguồn nhỏ thì trả nguyên file, không mã hoá lại. Ảnh thư viện thật chỉ khoảng 50–110 KB; mã hoá AVIF lại chỉ bớt vài chục KB
 * nhưng tốn 1,2–2,5 giây CPU mỗi ảnh trên máy chủ Dev (4 ảnh tải cùng lúc chờ tới ~12 giây), trong khi chờ tải thêm vài chục KB
 * chỉ vài chục mili giây. Việc kiểm quyền vẫn xảy ra trước khi đọc byte nào.
 */
export const LIBRARY_IMAGE_PASSTHROUGH_MAX_BYTES = 300_000

/** Nguồn chỉ được trả nguyên khi không rộng hơn cỡ xin quá hệ số này (tránh bắt trình duyệt giải mã ảnh lớn cho ô nhỏ). */
export const LIBRARY_IMAGE_PASSTHROUGH_WIDTH_SLACK = 1.5

export function shouldServeLibraryImageOriginal({
  bytes,
  sourceWidth,
  width,
  maxBytes = LIBRARY_IMAGE_PASSTHROUGH_MAX_BYTES
}: {
  bytes: number
  sourceWidth: number | undefined
  width: number
  maxBytes?: number
}): boolean {
  return bytes <= maxBytes && sourceWidth !== undefined && sourceWidth <= width * LIBRARY_IMAGE_PASSTHROUGH_WIDTH_SLACK
}
