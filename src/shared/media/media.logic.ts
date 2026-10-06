/**
 * Quy tắc tệp theo purpose của MEDIA (BR-MEDIA-001, TDD-MEDIA-001, TDD-CTR-001) — logic
 * thuần, không gọi mạng, để kiểm được không cần backend.
 *
 * Client chỉ kiểm SỚM để khỏi tốn một lượt xin URL; người quyết định cuối cùng là backend
 * (nó kiểm lại bytes thật ở bước `complete` và trả `maxSizeBytes` thật trong phiếu).
 */

export const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Bản quét giấy phép / hợp đồng: PDF hoặc ảnh JPG/PNG — KHÔNG nhận WebP (BR-MEDIA-001 khoản 2). */
export const SCAN_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const

const MIB = 1024 * 1024

/** Purpose gửi lên BE. `undefined` là purpose mặc định `Image` (mọi tài khoản đã đăng nhập). */
export type UploadPurpose = 'ContractorImage' | 'ContractorScan'

interface Rule {
  types: readonly string[]
  maxBytes: number
}

const RULES: Record<'Image' | UploadPurpose, Rule> = {
  Image: { types: IMAGE_MIME, maxBytes: 5 * MIB },
  ContractorImage: { types: IMAGE_MIME, maxBytes: 10 * MIB },
  ContractorScan: { types: SCAN_MIME, maxBytes: 20 * MIB }
}

export function uploadRule(purpose?: UploadPurpose): Rule {
  return RULES[purpose ?? 'Image']
}

export function isAcceptedType(type: string, purpose?: UploadPurpose): boolean {
  return uploadRule(purpose).types.includes(type)
}

/** Giá trị cho thuộc tính `accept` của ô chọn tệp. */
export function acceptAttribute(purpose?: UploadPurpose): string {
  return uploadRule(purpose).types.join(',')
}

export type FileProblem = 'UnsupportedType' | 'TooLarge'

/**
 * Kiểm sớm một tệp. `size <= 0` cũng coi là không hợp lệ: BE bắt `sizeBytes >= 1` và một
 * tệp rỗng chỉ tốn một vòng xin URL rồi bị từ chối.
 */
export function checkFile(file: { type: string; size: number }, purpose?: UploadPurpose): FileProblem | null {
  if (!isAcceptedType(file.type, purpose)) return 'UnsupportedType'
  if (file.size <= 0 || file.size > uploadRule(purpose).maxBytes) return 'TooLarge'
  return null
}
