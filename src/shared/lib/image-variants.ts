/**
 * NGUỒN SỰ THẬT về các bậc ảnh mà bộ tối ưu của Next (`/_next/image`) được phép tạo.
 *
 * Vì sao quan tâm: bộ tối ưu chỉ resize khi có người YÊU CẦU và cache theo từng bộ (url, w, q, định dạng). Một lần
 * resize nguội tốn 2–6 giây (tải ảnh gốc, giải mã, mã hoá AVIF) trong khi lấy từ cache chỉ ~0,3 giây. Đo trên
 * buildx.vnzdna.com ngày 12/10/2026: ảnh nguội chờ 3,5–5,8 giây TTFB dù file ra chỉ 1–24 KB. Cách giữ cho khách khỏi
 * chờ là (1) ít bậc cỡ và một mức nén để chia sẻ được cache, (2) sinh trước cả bộ ngay khi nội dung đổi
 * (`/api/warm`, xem `warm-images.ts`), (3) giữ cache qua lần deploy. Cách làm lấy từ perlunas.
 *
 * Danh sách này PHẢI khớp `images.deviceSizes` / `imageSizes` / `qualities` trong `next.config.ts`
 * (`scripts/image-variants.test.mjs` kiểm hai bên không lệch): xin bậc ngoài danh sách thì bộ tối ưu trả 400, còn
 * warm sai bậc thì khách vẫn rơi vào cache nguội.
 */

/**
 * Mức nén DUY NHẤT của cả site. `q` nằm trong cache key nên chỉ cần một ảnh xin mức khác là nó nguội dù cả bộ đã được
 * warm. Đừng thêm mức thứ hai.
 */
export const IMAGE_QUALITY = 75

/** Bậc cho ảnh theo cỡ màn hình. Cố tình thưa: mỗi bậc là một cache key riêng, bậc sát nhau chỉ làm loãng cache. */
export const DEVICE_SIZES = [640, 828, 1080, 1600, 1920] as const

/** Bậc cho ảnh nhỏ cố định (thumbnail, avatar, icon). */
export const IMAGE_SIZES = [96, 192, 384] as const

/** Mọi bậc mà warm phải sinh trước cho từng ảnh. */
export const ALL_WIDTHS: readonly number[] = [...IMAGE_SIZES, ...DEVICE_SIZES]

/** Địa chỉ của bộ tối ưu cho đúng một bậc. Dùng chung để không ai gõ sai query. */
export const optimizedImageUrl = (src: string, width: number, quality: number = IMAGE_QUALITY) =>
  `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`
