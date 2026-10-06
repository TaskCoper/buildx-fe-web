import { http, isApiError } from '@/shared/lib/api'
import { listSections } from './library-sections.api'
import {
  checkFile,
  isExpiredFailure,
  normalizeUploadTicket,
  readCompleteOutcome,
  resolveFileType,
  uploadFailure,
  type UploadClientError
} from './library-sections.logic'

/**
 * Tải MỘT tệp vào một section của phiên bản mẫu (TDD-LIB-001, dùng máy trạng thái ticket của
 * MEDIA nhưng qua route riêng của thư viện — route `/media/uploads` chung KHÔNG nhận tệp thư viện).
 *
 *   1. `POST …/sections/{id}/uploads`  → phiếu có URL ký (sống ~5 phút)
 *   2. `PUT` bytes thô lên kho BizFly  → đúng `requiredHeaders`, KHÔNG cookie BMT, KHÔNG multipart
 *   3. `POST …/uploads/{id}/complete`  → BE tải lại bytes, xác minh, gắn vào section; 202 = đang xác minh
 *   4. (202) hỏi lại `GET …/uploads/{id}` mỗi ~2 giây tới khi xong
 *
 * Tải NHIỀU tệp phải tuần tự: mỗi lần hoàn tất tăng `editVersion` của phiên bản, nên tệp sau dùng
 * số mới của tệp trước (gọi song song là 409 `LibraryVersionConflict`).
 */

export type UploadPhase = 'requesting' | 'uploading' | 'verifying'

/** Lỗi của chính bước upload (không phải `ApiError` của BE). */
export class LibraryUploadError extends Error {
  constructor(readonly code: UploadClientError) {
    super(code)
    this.name = 'LibraryUploadError'
  }
}

export interface UploadToSectionParams {
  templateId: string
  versionId: string
  sectionId: string
  file: File
  /** `editVersion` MỚI NHẤT — số của lần ghi trước, không phải lúc bắt đầu cả loạt. */
  editVersion: number
  position: number
  setAsCover: boolean
  onPhase?: (phase: UploadPhase) => void
}

export interface UploadToSectionResult {
  assetId: string | null
  /** `editVersion` sau khi tệp được gắn — truyền tiếp cho tệp kế. */
  editVersion: number
}

/** Khoảng hỏi lại trạng thái (MEDIA: `Retry-After: 2`). */
const POLL_INTERVAL_MS = 2000
/** Tối đa ~30 giây; quá thì báo "còn đang xác minh" chứ không treo vô hạn. */
const MAX_POLLS = 15

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

type Raw = Record<string, unknown>

export async function uploadFileToSection(params: UploadToSectionParams): Promise<UploadToSectionResult> {
  const { templateId, versionId, sectionId, file, editVersion, position, setAsCover, onPhase } = params

  // Kiểm sớm để khỏi tốn một lượt xin phiếu; BE vẫn kiểm lại bytes thật ở bước complete.
  const problem = checkFile(file)
  if (problem) throw new LibraryUploadError(problem)
  const type = resolveFileType(file.name)
  if (!type) throw new LibraryUploadError('unsupported')

  const base = `/admin/library/templates/${templateId}/versions/${versionId}/sections/${sectionId}/uploads`

  // 1) Xin phiếu. `contentType` lấy theo ĐUÔI tệp: trình duyệt để rỗng cho DWG/DXF.
  onPhase?.('requesting')
  const ticket = normalizeUploadTicket(
    await http.post<Raw>(
      base,
      { expectedEditVersion: editVersion, fileName: file.name, contentType: type.contentType, sizeBytes: file.size },
      idempotent()
    )
  )
  // Phát lại một phiếu đã hết hạn thì `uploadUrl` null: phải xin phiếu mới bằng khoá mới.
  if (!ticket.uploadId || !ticket.uploadUrl) throw new LibraryUploadError('ticketExpired')

  // 2) Đẩy bytes thẳng lên kho. Không gửi cookie BMT sang máy chủ khác, không bọc multipart.
  onPhase?.('uploading')
  let stored: Response
  try {
    stored = await fetch(ticket.uploadUrl, {
      method: ticket.method,
      headers: ticket.requiredHeaders,
      body: file,
      credentials: 'omit'
    })
  } catch {
    // Thường là CORS / mạng — trình duyệt không cho biết chi tiết.
    throw new LibraryUploadError('storagePutFailed')
  }
  if (!stored.ok) throw new LibraryUploadError('storagePutFailed')

  // 3) Báo hoàn tất. Gửi lại đúng body này là an toàn: cùng ticket chỉ tạo một tệp và trả kết quả đã lưu.
  onPhase?.('verifying')
  const completeBody = { expectedEditVersion: editVersion, position, setAsCover }
  const complete = async (): Promise<Raw> => {
    try {
      return await http.post<Raw>(`${base}/${ticket.uploadId}/complete`, completeBody)
    } catch (error) {
      // PUT vừa xong mà kho chưa thấy bytes: thử lại đúng một lần sau một nhịp ngắn.
      if (isApiError(error) && error.messageCode === 'MediaUploadNotReady') {
        await sleep(1500)
        return http.post<Raw>(`${base}/${ticket.uploadId}/complete`, completeBody)
      }
      throw error
    }
  }

  let outcome = readCompleteOutcome(await complete())

  // 4) 202: hỏi lại trạng thái, có giới hạn. Shape của GET trạng thái không có ví dụ trong docs nên
  // chỉ dựa vào `state`/`assetId`; khi nó báo xong mà thiếu số liệu thì gửi lại `complete` để lấy kết quả đã lưu.
  for (let attempt = 0; outcome.status === 'pending' && attempt < MAX_POLLS; attempt++) {
    await sleep(POLL_INTERVAL_MS)
    const status = await http.get<Raw>(`${base}/${ticket.uploadId}`)
    const failure = uploadFailure(status)
    if (failure) throw new LibraryUploadError(isExpiredFailure(failure) ? 'ticketExpired' : 'rejected')
    const polled = readCompleteOutcome(status)
    if (polled.status === 'done') {
      outcome = polled.assetId && polled.editVersion !== null ? polled : readCompleteOutcome(await complete())
    }
  }
  if (outcome.status !== 'done') throw new LibraryUploadError('stillValidating')

  // BE không luôn trả `editVersion` (phản hồi 202 → Completed): đọc lại phiên bản để lấy số mới nhất.
  const nextVersion = outcome.editVersion ?? (await listSections(templateId, versionId)).editVersion
  return { assetId: outcome.assetId, editVersion: nextVersion }
}
