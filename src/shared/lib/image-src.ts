/**
 * Host mà `next/image` được phép tối ưu — PHẢI khớp `images.remotePatterns` trong `next.config.ts`
 * (`scripts/image-src.test.mjs` kiểm hai bên không lệch nhau).
 *
 * Gặp host ngoài danh sách thì bản dev ném lỗi, còn bản production chỉ để `/_next/image` trả 400 và ảnh vỡ lặng lẽ.
 * Nơi nào nhận URL do admin dán (có thể ở host lạ) cần hỏi `canOptimizeImage` trước khi chọn `next/image`.
 */
export const OPTIMIZABLE_IMAGE_HOSTS = [
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'i.ytimg.com',
  '**.ss.bfcplatform.vn',
  'bmt-cdn-vnzdna.cdn.vccloud.vn'
] as const

/** Khớp theo cú pháp `remotePatterns`: `**.x.y` là mọi tên miền con của `x.y` (không gồm chính `x.y`). */
function matchesHost(hostname: string, pattern: string): boolean {
  return pattern.startsWith('**.') ? hostname.endsWith(pattern.slice(2)) : hostname === pattern
}

/**
 * `true` khi ảnh đi qua bộ tối ưu của Next được (đổi sang AVIF/WebP, đúng cỡ khung): ảnh trong `public/` hoặc ảnh ở host
 * đã khai báo.
 *
 * `/api/…` là route của backend cần cookie phiên, mà `next/image` tải ảnh từ máy chủ Next nên không mang cookie đó;
 * ảnh loại này phải để trình duyệt tự tải bằng thẻ `<img>`.
 */
export function canOptimizeImage(src: string | null | undefined): boolean {
  if (!src) return false
  // `//host/x.png` cũng bắt đầu bằng `/` nhưng là URL tuyệt đối, không phải ảnh trong public.
  if (src.startsWith('/')) return !src.startsWith('//') && !src.startsWith('/api/')

  try {
    const { protocol, hostname } = new URL(src)
    return protocol === 'https:' && OPTIMIZABLE_IMAGE_HOSTS.some((pattern) => matchesHost(hostname, pattern))
  } catch {
    return false
  }
}
