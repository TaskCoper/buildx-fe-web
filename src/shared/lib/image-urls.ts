import { canOptimizeImage } from './image-src'

const IMAGE_EXTENSION = /\.(avif|webp|png|jpe?g|gif)(\?|$)/i

/**
 * Gom mọi chuỗi trong JSON trông như URL ảnh mà `next/image` tối ưu được (https, host đã khai báo, đuôi ảnh). Quét theo
 * GIÁ TRỊ chứ không theo tên trường nên trường mới thêm sau này tự được phủ. Hàm thuần, có test
 * (`scripts/image-urls.test.mjs`).
 */
export function collectImageUrls(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') {
    if (value.startsWith('https://') && IMAGE_EXTENSION.test(value) && canOptimizeImage(value)) into.add(value)
  } else if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, into)
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectImageUrls(item, into)
  }
  return into
}
