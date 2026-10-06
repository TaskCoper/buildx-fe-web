/**
 * Logic thuần của luồng SECTION + UPLOAD THEO SECTION của thư viện mẫu (TDD-LIB-001,
 * BR-LIB-001 khoản 17/20) — không gọi mạng, không import alias nên kiểm được không cần
 * backend (`node --experimental-strip-types`).
 *
 * Bối cảnh: mọi ảnh/tệp của mẫu phải thuộc MỘT section; BE không còn nhận URL rời. Tệp đi
 * theo luồng presign riêng của thư viện (xin phiếu → PUT thẳng lên kho → complete).
 */

/* ===========================================================================
 * Định dạng tệp
 * ======================================================================== */

export type LibraryFileKind = 'Image' | 'Attachment'

/** Ảnh: JPG/PNG/WebP. Tệp đính kèm: PDF/DWG/DXF (BR-LIB-001 khoản 2). */
const FILE_TYPES: Record<string, { contentType: string; kind: LibraryFileKind }> = {
  jpg: { contentType: 'image/jpeg', kind: 'Image' },
  jpeg: { contentType: 'image/jpeg', kind: 'Image' },
  png: { contentType: 'image/png', kind: 'Image' },
  webp: { contentType: 'image/webp', kind: 'Image' },
  pdf: { contentType: 'application/pdf', kind: 'Attachment' },
  // Trình duyệt thường để `file.type` RỖNG cho DWG/DXF nên phải suy từ đuôi tệp.
  dwg: { contentType: 'image/vnd.dwg', kind: 'Attachment' },
  dxf: { contentType: 'image/vnd.dxf', kind: 'Attachment' }
}

/** Đuôi hợp lệ, dùng cho thuộc tính `accept` của ô chọn tệp. */
export const LIBRARY_ACCEPT = Object.keys(FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(',')

/** Trần ảnh theo MEDIA: 5 MiB. Tệp đính kèm do cấu hình hạ tầng nên không chặn ở client. */
export const LIBRARY_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase()
}

/** Loại + MIME chuẩn theo đuôi tệp; đuôi lạ → `null`. */
export function resolveFileType(fileName: string): { contentType: string; kind: LibraryFileKind } | null {
  return FILE_TYPES[extensionOf(fileName)] ?? null
}

export type FileProblem = 'unsupported' | 'empty' | 'imageTooLarge'

/** Kiểm sớm ở client để khỏi tốn một lượt xin phiếu; BE vẫn kiểm lại bytes thật. */
export function checkFile(file: { name: string; size: number }): FileProblem | null {
  const type = resolveFileType(file.name)
  if (!type) return 'unsupported'
  if (file.size <= 0) return 'empty'
  if (type.kind === 'Image' && file.size > LIBRARY_IMAGE_MAX_BYTES) return 'imageTooLarge'
  return null
}

/* ===========================================================================
 * Phiếu upload và kết quả complete
 * ======================================================================== */

export interface UploadTicket {
  uploadId: string
  /** BE ghi `method`, MEDIA ghi `uploadMethod` — đọc cả hai, mặc định PUT. */
  method: string
  /** Null khi phát lại phiếu đã hết hạn: phải xin phiếu mới bằng khoá mới. */
  uploadUrl: string | null
  requiredHeaders: Record<string, string>
  expiresAtUtc: string | null
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)

/**
 * Hai tài liệu đặt tên khác nhau cho cùng phiếu (LIB: `method`/`expiresAtUtc`, MEDIA:
 * `uploadMethod`/`uploadExpiresAtUtc`) và swagger không mô tả response, nên đọc khoan dung.
 */
export function normalizeUploadTicket(raw: Record<string, unknown> | null | undefined): UploadTicket {
  const source = raw ?? {}
  const headersRaw = source.requiredHeaders
  const requiredHeaders: Record<string, string> = {}
  if (headersRaw && typeof headersRaw === 'object') {
    for (const [key, value] of Object.entries(headersRaw as Record<string, unknown>)) {
      if (typeof value === 'string') requiredHeaders[key] = value
    }
  }
  return {
    uploadId: text(source.uploadId) ?? '',
    method: text(source.method) ?? text(source.uploadMethod) ?? 'PUT',
    uploadUrl: text(source.uploadUrl),
    requiredHeaders,
    expiresAtUtc: text(source.expiresAtUtc) ?? text(source.uploadExpiresAtUtc)
  }
}

export interface CompleteOutcome {
  /** `done`: tệp đã gắn vào section. `pending`: BE còn đang xác minh (202) — phải hỏi lại trạng thái. */
  status: 'done' | 'pending'
  assetId: string | null
  /** `null` khi BE không trả: caller đọc lại phiên bản để lấy số mới nhất. */
  editVersion: number | null
}

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * Kết quả của `complete` và của `GET uploads/{id}` (shape trạng thái không có ví dụ nên đoán
 * theo `state`): có `assetId` hoặc state `Completed` → xong; `Rejected`/`Expired`/`Failed`
 * được caller xử lý riêng qua `uploadFailure`.
 */
export function readCompleteOutcome(raw: Record<string, unknown> | null | undefined): CompleteOutcome {
  const source = raw ?? {}
  const assetId = text(source.assetId)
  const state = text(source.state)
  const done = Boolean(assetId) || state === 'Completed'
  return { status: done ? 'done' : 'pending', assetId, editVersion: finiteNumber(source.editVersion) }
}

/** Trạng thái phiếu đã chết hẳn (không còn hy vọng hoàn tất) → mã lỗi (`failureCode`, hoặc chính state). */
export function uploadFailure(raw: Record<string, unknown> | null | undefined): string | null {
  const source = raw ?? {}
  const state = text(source.state)
  if (state === 'Rejected' || state === 'Expired' || state === 'Failed') {
    return text(source.failureCode) ?? text(source.messageCode) ?? state
  }
  return null
}

/* ===========================================================================
 * Số phiên bản chỉnh sửa (khoá lạc quan) và vị trí
 * ======================================================================== */

/**
 * Mỗi lần ghi thành công tăng `editVersion` và BE trả số mới. Tải nhiều tệp phải TUẦN TỰ và
 * dùng số mới nhất của lần trước (không giữ số lúc cấp phiếu) — gọi song song là 409.
 */
export function chainEditVersion(current: number, response: { editVersion?: unknown } | null | undefined): number {
  return finiteNumber(response?.editVersion) ?? current
}

/** Vị trí trống kế tiếp (cuối danh sách); danh sách rỗng → 1. */
export function nextPosition(positions: readonly number[]): number {
  return positions.reduce((max, value) => Math.max(max, value), 0) + 1
}

/* ===========================================================================
 * Mã lỗi → khoá thông báo
 * ======================================================================== */

/** Mã lỗi (messageCode) của LIB và của MEDIA có câu tiếng Việt riêng. */
export const LIBRARY_ERROR_CODES = [
  'LibraryVersionConflict',
  'LibraryVersionChanged',
  'LibraryVersionReadOnly',
  'LibraryPositionConflict',
  'IdempotencyConflict',
  'MediaIdempotencyConflict',
  'InvalidLibraryContent',
  'LibraryNotFound',
  'LibraryStorageUnavailable',
  'MediaStorageUnavailable',
  'InvalidMediaUpload',
  'MediaUploadNotReady',
  'MediaUploadExpired',
  'MediaUploadLeaseLost',
  'AccessForbidden'
] as const

export type LibraryErrorCode = (typeof LIBRARY_ERROR_CODES)[number]

export function isLibraryErrorCode(code: string | null | undefined): code is LibraryErrorCode {
  return code !== undefined && code !== null && (LIBRARY_ERROR_CODES as readonly string[]).includes(code)
}

/** Phiếu hết hạn (khác bị từ chối vì nội dung): báo "hết hạn" thay vì "tệp không đạt". */
export function isExpiredFailure(code: string | null | undefined): boolean {
  return code !== undefined && code !== null && /expired/i.test(code)
}

/**
 * Danh sách câu lỗi trong thân 422 của BE. Khi công bố thiếu nhiều thứ, `detail` chỉ là câu tiếng Anh
 * chung ("One or more validation errors occurred") còn các câu tiếng Việt nói đúng thiếu gì nằm trong
 * `errors[]` (`{PropertyName, ErrorMessage}`; validator khác dùng `{code, message}`). Bỏ câu rỗng và trùng.
 */
export function extractValidationMessages(data: unknown): string[] {
  const errors = (data as { errors?: unknown } | null | undefined)?.errors
  if (!Array.isArray(errors)) return []
  const out: string[] = []
  for (const item of errors) {
    const row = (item ?? {}) as Record<string, unknown>
    const message = text(row.ErrorMessage) ?? text(row.message)
    if (message && !out.includes(message)) out.push(message)
  }
  return out
}

/** Mã lỗi nội bộ của bước upload (không phải messageCode của BE). */
export type UploadClientError =
  | 'unsupported'
  | 'empty'
  | 'imageTooLarge'
  | 'ticketExpired'
  | 'storagePutFailed'
  | 'stillValidating'
  | 'rejected'
