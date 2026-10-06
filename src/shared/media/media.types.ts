import type { UploadPurpose } from './media.logic'

/**
 * Upload dùng chung (MEDIA — STORY-MEDIA-001, BR-MEDIA-001, TDD-MEDIA-001).
 *
 * Tệp KHÔNG đi qua API BMT: backend chỉ cấp URL ký, trình duyệt PUT thẳng bytes
 * lên kho BizFly, rồi backend tải lại để xác minh. API nghiệp vụ sau đó nhận
 * URL dạng chuỗi (không có trường `mediaId`/`assetId` mới).
 */

/**
 * Loại tệp — quyết định định dạng và dung lượng tối đa backend cho phép:
 * `ContractorImage` ảnh JPG/PNG/WebP ≤ 10 MiB, `ContractorScan` PDF/JPG/PNG ≤ 20 MiB.
 * Cả hai chỉ admin được dùng.
 */
export type MediaPurpose = UploadPurpose

/** Bước 1: chỗ để tải lên, kèm chữ ký có hạn 5 phút. */
export interface UploadTicket {
  uploadId: string
  state: string
  uploadMethod: string
  /** Null khi phát lại một phiếu đã hết hạn — phải tạo phiếu mới. */
  uploadUrl: string | null
  requiredHeaders: Record<string, string>
  uploadExpiresAtUtc: string
  maxSizeBytes: number
}

/** Bước 3: kết quả xác minh. Chỉ `Completed` mới có `fileUrl`. */
export interface UploadResult {
  uploadId: string
  state: 'Issued' | 'Validating' | 'Completed' | 'Rejected' | 'Expired'
  fileUrl?: string | null
  contentType?: string | null
  sizeBytes?: number | null
  failureCode?: string | null
}

/** Tệp đã xác minh, sẵn sàng gắn vào bản ghi nghiệp vụ (URL HTTPS cố định, không chữ ký). */
export interface UploadedFile {
  url: string
  contentType: string
  sizeBytes: number
}

/** Định dạng ảnh backend nhận (BR-MEDIA-001). */
export { IMAGE_MIME as ACCEPTED_IMAGE_TYPES } from './media.logic'
