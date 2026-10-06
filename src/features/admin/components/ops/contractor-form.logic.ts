import type {
  ContractorImageInput,
  ContractorImageKind,
  ContractorLicenseInput,
  ContractorPartnershipInput,
  ContractorProjectImageInput
} from '../../api/bmt/contractors.admin.api'

/**
 * Logic thuần của form nhà thầu (TDD-CTR-001, commit c1f318b): tệp đi qua MEDIA presign và
 * hồ sơ CHỈ lưu URL. Tách khỏi component để kiểm được không cần backend.
 *
 * Nguyên tắc xuyên suốt: form giữ TOÀN BỘ trạng thái của ảnh / giấy phép / hợp tác — kể cả
 * tệp CŨ chỉ có `assetId` — và `PUT` thay toàn bộ section, nên những gì form không gửi lại là
 * bị xoá. Vì vậy mọi hàm `…FromDetail` đọc hết, mọi hàm `…ToRequest` ghi lại đủ.
 */

/* ===== Tiện ích chung ===== */

const ZERO_GUID = '00000000-0000-0000-0000-000000000000'

/** GET trả `assetId` toàn số 0 cho tệp mới (chỉ có url) — coi như không có. */
export function realAssetId(value?: string | null): string | undefined {
  return value && value !== ZERO_GUID ? value : undefined
}

const cleanText = (value?: string | null): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed === '' ? undefined : trimmed
}

/** Chuỗi ngày ISO hoặc `YYYY-MM-DD` → `YYYY-MM-DD`; không phải ngày thì rỗng. */
export function toDateOnly(value?: string | null): string {
  const match = typeof value === 'string' ? /^(\d{4}-\d{2}-\d{2})/.exec(value.trim()) : null
  return match?.[1] ?? ''
}

let keySeq = 0
/** Khoá React cho một dòng trong danh sách — không liên quan dữ liệu gửi lên BE. */
const nextKey = (prefix: string) => `${prefix}-${(keySeq += 1)}`

/** Đường dẫn route admin đọc tệp CŨ (chỉ dùng để xem trước dữ liệu cũ, tệp mới có URL công khai). */
export function legacyAssetPath(contractorId: string, assetId: string): string {
  return `/api/v1/admin/contractors/${contractorId}/assets/${assetId}/content`
}

/* ===== Ảnh hồ sơ ===== */

export const IMAGE_KINDS: readonly ContractorImageKind[] = ['Logo', 'Cover', 'Office', 'Team']

/** Mỗi hồ sơ chỉ một Logo và một Cover; Office/Team là bộ ảnh. */
export const SINGLE_KINDS: readonly ContractorImageKind[] = ['Logo', 'Cover']

/** Tối đa ảnh mỗi bộ (ContractorFileOption, TDD-CTR-001). */
export const MAX_IMAGES_PER_SET = 50

export interface ProfileImageDraft {
  key: string
  kind: ContractorImageKind
  /** Ảnh mới: URL công khai cố định. */
  url?: string
  /** Ảnh cũ (multipart). Không có cùng lúc với `url`. */
  assetId?: string
}

const isKind = (value: unknown): value is ContractorImageKind =>
  typeof value === 'string' && (IMAGE_KINDS as readonly string[]).includes(value)

export function imagesFromDetail(images: readonly ContractorImageInput[] | null | undefined): ProfileImageDraft[] {
  const drafts: { draft: ProfileImageDraft; position: number }[] = []
  for (const image of images ?? []) {
    if (!isKind(image.kind)) continue
    const url = cleanText(image.url)
    const assetId = url ? undefined : realAssetId(image.assetId)
    if (!url && !assetId) continue
    drafts.push({
      draft: { key: nextKey('image'), kind: image.kind, ...(url ? { url } : { assetId: assetId as string }) },
      position: Number.isFinite(image.position) ? image.position : 0
    })
  }
  const order = (kind: ContractorImageKind) => IMAGE_KINDS.indexOf(kind)
  return drafts
    .sort((a, b) => order(a.draft.kind) - order(b.draft.kind) || a.position - b.position)
    .map((item) => item.draft)
}

export function imagesOfKind(drafts: readonly ProfileImageDraft[], kind: ContractorImageKind): ProfileImageDraft[] {
  return drafts.filter((draft) => draft.kind === kind)
}

/**
 * Body `images` của PUT: nhóm theo loại theo thứ tự Logo → Cover → Office → Team, vị trí đánh lại
 * 0..n-1 trong từng loại (trùng `(kind, position)` là bị BE từ chối). Mỗi phần tử chỉ có `url`
 * HOẶC `assetId`, không bao giờ cả hai.
 */
export function imagesToRequest(drafts: readonly ProfileImageDraft[]): ContractorImageInput[] {
  const result: ContractorImageInput[] = []
  for (const kind of IMAGE_KINDS) {
    const limit = SINGLE_KINDS.includes(kind) ? 1 : MAX_IMAGES_PER_SET
    imagesOfKind(drafts, kind)
      .slice(0, limit)
      .forEach((draft, position) => {
        if (draft.url) result.push({ url: draft.url, kind, position })
        else if (draft.assetId) result.push({ assetId: draft.assetId, kind, position })
      })
  }
  return result
}

export function canAddImage(drafts: readonly ProfileImageDraft[], kind: ContractorImageKind): boolean {
  if (SINGLE_KINDS.includes(kind)) return true // thay ảnh cũ
  return imagesOfKind(drafts, kind).length < MAX_IMAGES_PER_SET
}

/** Thêm ảnh mới tải lên. Logo/Cover thì THAY ảnh hiện có; Office/Team thì nối cuối (đủ 50 thì giữ nguyên). */
export function addImage(
  drafts: readonly ProfileImageDraft[],
  kind: ContractorImageKind,
  url: string
): ProfileImageDraft[] {
  if (!canAddImage(drafts, kind)) return [...drafts]
  const kept = SINGLE_KINDS.includes(kind) ? drafts.filter((draft) => draft.kind !== kind) : [...drafts]
  return [...kept, { key: nextKey('image'), kind, url }]
}

export function removeImage(drafts: readonly ProfileImageDraft[], key: string): ProfileImageDraft[] {
  return drafts.filter((draft) => draft.key !== key)
}

/** Đổi chỗ với ảnh liền kề CÙNG LOẠI (`delta` -1 lên trước, +1 lùi sau). Hết đường thì giữ nguyên. */
export function moveImage(drafts: readonly ProfileImageDraft[], key: string, delta: -1 | 1): ProfileImageDraft[] {
  const target = drafts.find((draft) => draft.key === key)
  if (!target) return [...drafts]
  const group = imagesOfKind(drafts, target.kind)
  const from = group.findIndex((draft) => draft.key === key)
  const to = from + delta
  if (to < 0 || to >= group.length) return [...drafts]

  const swapped = [...group]
  const moved = swapped.splice(from, 1)[0] as ProfileImageDraft
  swapped.splice(to, 0, moved)

  // Đặt lại đúng các vị trí của loại này trong danh sách chung, giữ nguyên vị trí loại khác.
  let next = 0
  return drafts.map((draft) => (draft.kind === target.kind ? (swapped[next++] as ProfileImageDraft) : draft))
}

/* ===== Giấy phép ===== */

export interface LicenseDraft {
  key: string
  licenseId?: string
  licenseType: string
  licenseNumber: string
  issuer: string
  issuedOn: string
  expiresOn: string
  scanUrl?: string
  assetId?: string
}

export const emptyLicense = (): LicenseDraft => ({
  key: nextKey('license'),
  licenseType: '',
  licenseNumber: '',
  issuer: '',
  issuedOn: '',
  expiresOn: ''
})

export function licensesFromDetail(list: readonly ContractorLicenseInput[] | null | undefined): LicenseDraft[] {
  return (list ?? []).map((item) => {
    const scanUrl = cleanText(item.scanUrl)
    const assetId = scanUrl ? undefined : realAssetId(item.assetId)
    return {
      key: nextKey('license'),
      ...(cleanText(item.licenseId) ? { licenseId: cleanText(item.licenseId) as string } : {}),
      licenseType: item.licenseType ?? '',
      licenseNumber: item.licenseNumber ?? '',
      issuer: item.issuer ?? '',
      issuedOn: toDateOnly(item.issuedOn),
      expiresOn: toDateOnly(item.expiresOn),
      ...(scanUrl ? { scanUrl } : {}),
      ...(assetId ? { assetId } : {})
    }
  })
}

/** Dòng chưa nhập gì (kể cả tệp) — bỏ qua khi lưu thay vì gửi một giấy phép rỗng. */
export function isBlankLicense(draft: LicenseDraft): boolean {
  return (
    !cleanText(draft.licenseType) &&
    !cleanText(draft.licenseNumber) &&
    !cleanText(draft.issuer) &&
    !draft.issuedOn &&
    !draft.expiresOn &&
    !draft.scanUrl &&
    !draft.assetId
  )
}

export function licensesToRequest(drafts: readonly LicenseDraft[]): ContractorLicenseInput[] {
  return drafts
    .filter((draft) => !isBlankLicense(draft))
    .map((draft) => ({
      ...(draft.licenseId ? { licenseId: draft.licenseId } : {}),
      licenseType: cleanText(draft.licenseType) ?? null,
      licenseNumber: cleanText(draft.licenseNumber) ?? null,
      issuer: cleanText(draft.issuer) ?? null,
      issuedOn: draft.issuedOn || null,
      expiresOn: draft.expiresOn || null,
      ...(draft.scanUrl ? { scanUrl: draft.scanUrl } : draft.assetId ? { assetId: draft.assetId } : {})
    }))
}

export type LicenseProblem = 'licenseType' | 'licenseNumber' | 'dateOrder'

/**
 * Lỗi nhập giấy phép phát hiện TRƯỚC khi gửi. `LicenseType`/`LicenseNumber` là NOT NULL ở BE
 * (data model TDD-CTR-001) nên dòng đã có nội dung thì bắt buộc hai trường này; ngày hết hạn
 * không được trước ngày cấp.
 */
export function licenseProblems(drafts: readonly LicenseDraft[]): { index: number; problem: LicenseProblem }[] {
  const problems: { index: number; problem: LicenseProblem }[] = []
  drafts.forEach((draft, index) => {
    if (isBlankLicense(draft)) return
    if (!cleanText(draft.licenseType)) problems.push({ index, problem: 'licenseType' })
    if (!cleanText(draft.licenseNumber)) problems.push({ index, problem: 'licenseNumber' })
    if (draft.issuedOn && draft.expiresOn && draft.expiresOn < draft.issuedOn)
      problems.push({ index, problem: 'dateOrder' })
  })
  return problems
}

/* ===== Hợp tác BuildX ===== */

export interface PartnershipDraft {
  startsOn: string
  endsOn: string
  signedOn: string
  recordCode: string
  pageCount: number | null
  scanUrl?: string
  assetId?: string
}

export const emptyPartnership = (): PartnershipDraft => ({
  startsOn: '',
  endsOn: '',
  signedOn: '',
  recordCode: '',
  pageCount: null
})

export function partnershipFromDetail(detail: ContractorPartnershipInput | null | undefined): PartnershipDraft {
  if (!detail) return emptyPartnership()
  const scanUrl = cleanText(detail.scanUrl)
  const assetId = scanUrl ? undefined : realAssetId(detail.assetId)
  return {
    startsOn: toDateOnly(detail.startsOn),
    endsOn: toDateOnly(detail.endsOn),
    signedOn: toDateOnly(detail.signedOn),
    recordCode: detail.recordCode ?? '',
    pageCount: typeof detail.pageCount === 'number' ? detail.pageCount : null,
    ...(scanUrl ? { scanUrl } : {}),
    ...(assetId ? { assetId } : {})
  }
}

export function isBlankPartnership(draft: PartnershipDraft | null | undefined): boolean {
  return (
    !draft ||
    (!draft.startsOn &&
      !draft.endsOn &&
      !draft.signedOn &&
      !cleanText(draft.recordCode) &&
      draft.pageCount == null &&
      !draft.scanUrl &&
      !draft.assetId)
  )
}

/** `null` = xoá section hợp tác (BE: `partnership=null` xoá), dùng khi form để trống hoàn toàn. */
export function partnershipToRequest(draft: PartnershipDraft | null | undefined): ContractorPartnershipInput | null {
  if (!draft || isBlankPartnership(draft)) return null
  return {
    startsOn: draft.startsOn || null,
    endsOn: draft.endsOn || null,
    signedOn: draft.signedOn || null,
    recordCode: cleanText(draft.recordCode) ?? null,
    pageCount: draft.pageCount,
    ...(draft.scanUrl ? { scanUrl: draft.scanUrl } : draft.assetId ? { assetId: draft.assetId } : {})
  }
}

/** Ngày kết thúc không được trước ngày bắt đầu. */
export function partnershipDateOrderInvalid(draft: PartnershipDraft | null | undefined): boolean {
  return Boolean(draft && draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn)
}

/* ===== Ảnh dự án ===== */

export interface ProjectImageDraft {
  key: string
  url?: string
  assetId?: string
  /** Địa chỉ để hiển thị xem trước (URL công khai, hoặc route admin của tệp cũ). */
  previewUrl?: string
}

interface ProjectImageDetail {
  assetId?: string | null
  url?: string | null
  contentUrl?: string | null
  position?: number
}

export function projectImagesFromDetail(
  images: readonly ProjectImageDetail[] | null | undefined,
  contractorId: string
): ProjectImageDraft[] {
  const ordered = [...(images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const drafts: ProjectImageDraft[] = []
  for (const image of ordered) {
    const url = cleanText(image.url)
    const assetId = url ? undefined : realAssetId(image.assetId)
    if (!url && !assetId) continue
    const previewUrl = url ?? cleanText(image.contentUrl) ?? legacyAssetPath(contractorId, assetId as string)
    drafts.push({ key: nextKey('project-image'), previewUrl, ...(url ? { url } : { assetId: assetId as string }) })
  }
  return drafts
}

export function projectImagesToRequest(drafts: readonly ProjectImageDraft[]): ContractorProjectImageInput[] {
  const result: ContractorProjectImageInput[] = []
  drafts.forEach((draft) => {
    const position = result.length
    if (draft.url) result.push({ url: draft.url, position })
    else if (draft.assetId) result.push({ assetId: draft.assetId, position })
  })
  return result
}

export function addProjectImage(drafts: readonly ProjectImageDraft[], url: string): ProjectImageDraft[] {
  return [...drafts, { key: nextKey('project-image'), url, previewUrl: url }]
}

export function removeProjectImage(drafts: readonly ProjectImageDraft[], key: string): ProjectImageDraft[] {
  return drafts.filter((draft) => draft.key !== key)
}

export function moveProjectImage(
  drafts: readonly ProjectImageDraft[],
  key: string,
  delta: -1 | 1
): ProjectImageDraft[] {
  const from = drafts.findIndex((draft) => draft.key === key)
  const to = from + delta
  if (from < 0 || to < 0 || to >= drafts.length) return [...drafts]
  const next = [...drafts]
  const moved = next.splice(from, 1)[0] as ProjectImageDraft
  next.splice(to, 0, moved)
  return next
}

/* ===== Mã lỗi → khoá thông báo ===== */

/**
 * Mã lỗi có câu tiếng Việt riêng: lỗi nội bộ của bước tải (`MediaUploadError.code`), mã MEDIA
 * (TDD-MEDIA-001) và mã nhà thầu (TDD-CTR-001). Mã ngoài danh sách rơi về câu BE gửi kèm.
 */
export const CONTRACTOR_ERROR_CODES = [
  'UnsupportedType',
  'TooLarge',
  'StoragePutFailed',
  'StillValidating',
  'Rejected',
  'Expired',
  'InvalidMediaUpload',
  'MediaUploadNotReady',
  'MediaUploadExpired',
  'MediaStorageUnavailable',
  'MediaIdempotencyConflict',
  'MediaUploadLeaseLost',
  'MediaImageNotReady',
  'MediaImageGone',
  'MediaReferenceUnavailable',
  'ContractorVersionConflict',
  'ContractorProfileIncomplete',
  'InvalidContractorInput',
  'InvalidContractorProject',
  'ContractorCategoryUnavailable',
  'ContractorFileUnavailable',
  'ContractorAssetInUse',
  'ContractorNotFound',
  'ContractorProjectNotFound',
  'LocationDatasetChanged',
  'DependencyUnavailable',
  'AccessForbidden'
] as const

export type ContractorErrorCode = (typeof CONTRACTOR_ERROR_CODES)[number]

export function contractorErrorKey(code: string | null | undefined): ContractorErrorCode | null {
  return CONTRACTOR_ERROR_CODES.find((known) => known === code) ?? null
}

/**
 * Mã lỗi của một ngoại lệ bất kỳ: `messageCode` của `ApiError` (BE), hoặc `code` của
 * `MediaUploadError` (lỗi ở bước tải). `code` chung kiểu `Conflict` của `ApiError` cố ý bị bỏ
 * qua vì không nói được gì.
 */
export function errorCodeOf(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as { messageCode?: unknown; code?: unknown; name?: unknown }
  if (typeof candidate.messageCode === 'string' && candidate.messageCode) return candidate.messageCode
  if (candidate.name === 'MediaUploadError' && typeof candidate.code === 'string') return candidate.code
  return undefined
}
