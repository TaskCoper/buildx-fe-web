import { http, httpClient } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

/**
 * Thư viện mẫu bản vẽ (AdminLibrary) — cần quyền `library.manage`.
 *
 * Một MẪU (`templateId`, khóa lạc quan `templateVersion`) có nhiều PHIÊN BẢN:
 * nháp (`Draft`) và đã công bố (`Published`). Phiên bản hiện hành là bản khách
 * đang xem; bản đã bị thay thế chỉ đọc. Mỗi phiên bản có khóa lạc quan riêng
 * `editVersion`, tăng sau mỗi lần sửa metadata / section / tệp / thứ tự / cover.
 *
 * Mọi ảnh và tệp PDF/DWG/DXF thuộc một SECTION của phiên bản (BR-LIB-001 khoản 17) và
 * được tải lên theo luồng presign riêng của thư viện — xem `library-sections.api.ts` và
 * `library-upload.ts`. BE KHÔNG còn nhận URL rời: `POST /templates/{id}/assets` và
 * `PUT …/assets/{assetId}` trả 422 `InvalidLibraryContent`, nên file này không còn hàm
 * tạo/gắn tài nguyên bằng URL.
 */

export type DrawingKind = '2D' | '3D'
export type LibraryVersionState = 'Draft' | 'Published'

export interface AdminTemplateItem {
  templateId: string
  templateVersion: number
  isHidden: boolean
  createdAtUtc: string
  currentVersionId?: string | null
  currentNumber?: number | null
  currentName?: string | null
  currentPublishedAtUtc?: string | null
  draftCount: number
}

/** Phong cách kiến trúc / nội thất gắn với mẫu 3D. */
export interface LibraryStyleRef {
  styleId: string
  name: string
  imageUrl?: string | null
}

export interface AdminVersionItem {
  versionId: string
  state: LibraryVersionState
  number?: number | null
  editVersion: number
  baseVersionId?: string | null
  isCurrent: boolean
  isReadOnly: boolean
  name?: string | null
  description?: string | null
  drawingKind?: string | null
  widthM?: string | null
  lengthM?: string | null
  areaM2?: string | null
  catalogRevisionId?: string | null
  buildingTypeId?: string | null
  buildingTypeName?: string | null
  floorCount?: number | null
  hasTum?: boolean | null
  coverAssetId?: string | null
  assetCount: number
  /** Số section của phiên bản (kể cả section đang chuẩn bị). */
  sectionCount?: number
  architectureStyles?: LibraryStyleRef[]
  interiorStyles?: LibraryStyleRef[]
  createdAtUtc: string
  modifiedAtUtc: string
  publishedAtUtc?: string | null
}

export interface AdminTemplateVersions {
  templateId: string
  templateVersion: number
  isHidden: boolean
  currentVersionId: string | null
  versions: AdminVersionItem[]
}

/** Metadata của một phiên bản. Mọi trường được để trống khi lưu nháp. */
export interface TemplateContent {
  name?: string | null
  description?: string | null
  drawingKind?: DrawingKind | null
  /** Chuỗi thập phân > 0, tối đa hai chữ số lẻ. */
  widthM?: string | null
  lengthM?: string | null
  areaM2?: string | null
  buildingTypeId?: string | null
  /** Bỏ trống khi loại công trình tắt chọn tầng — không gửi 0. */
  floorCount?: number | null
  /** Bỏ trống khi loại công trình tắt chọn tum — không gửi `false`. */
  hasTum?: boolean | null
  /**
   * Phong cách của mẫu 3D. Luôn GỬI MẢNG (kể cả rỗng): bỏ qua hoặc `null` thì BE giữ nguyên
   * tập cũ, còn mẫu 2D bị từ chối nếu gắn phong cách — nên đổi 3D → 2D phải gửi `[]` rõ ràng.
   */
  architectureStyleIds?: string[]
  interiorStyleIds?: string[]
}

export interface VersionCreated {
  templateId: string
  versionId: string
  templateVersion: number
  editVersion: number
}

export interface VersionEdited {
  versionId: string
  editVersion: number
}

import { extractValidationMessages } from './library-sections.logic'

const BASE = '/admin/library/templates'
/** Trần `pageSize` của BE. */
const MAX_PAGE = 100

const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

export function listLibraryTemplates(pageIndex: number, pageSize: number): Promise<PagedResult<AdminTemplateItem>> {
  return http.get<PagedResult<AdminTemplateItem>>(BASE, { params: { pageIndex, pageSize } })
}

/** Toàn bộ mẫu (đi hết các trang) — danh sách quản trị không lọc được theo 2D/3D hay tên. */
export async function listAllLibraryTemplates(): Promise<AdminTemplateItem[]> {
  const all: AdminTemplateItem[] = []
  for (let page = 1; ; page++) {
    const res = await listLibraryTemplates(page, MAX_PAGE)
    all.push(...res.items)
    if (!res.hasNextPage) return all
  }
}

interface RawTemplateVersions {
  templateId?: string
  templateVersion?: number
  isHidden?: boolean
  currentVersionId?: string | null
  versions?: PagedResult<AdminVersionItem> | null
}

/** Mọi phiên bản của một mẫu (đi hết các trang), mới nhất trước. */
export async function getTemplateVersions(templateId: string): Promise<AdminTemplateVersions> {
  const versions: AdminVersionItem[] = []
  let head: RawTemplateVersions | null = null
  for (let page = 1; ; page++) {
    const res = await http.get<RawTemplateVersions>(`${BASE}/${templateId}/versions`, {
      params: { pageIndex: page, pageSize: MAX_PAGE }
    })
    head ??= res
    versions.push(...(res.versions?.items ?? []))
    if (!res.versions?.hasNextPage) break
  }
  return {
    templateId,
    templateVersion: head?.templateVersion ?? 0,
    isHidden: Boolean(head?.isHidden),
    currentVersionId: head?.currentVersionId ?? null,
    versions: versions.sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))
  }
}

/** Tạo mẫu cùng nháp đầu tiên — mẫu chưa công khai cho tới khi công bố. */
export function createLibraryTemplate(content: TemplateContent): Promise<VersionCreated> {
  return http.post<VersionCreated>(BASE, content, idempotent())
}

/** Thay toàn bộ metadata của nháp hoặc phiên bản hiện hành (giữ `versionId`). */
export function saveTemplateVersion(
  templateId: string,
  versionId: string,
  expectedEditVersion: number,
  content: TemplateContent
): Promise<VersionEdited> {
  return http.put<VersionEdited>(
    `${BASE}/${templateId}/versions/${versionId}`,
    { expectedEditVersion, ...content },
    idempotent()
  )
}

/** Sao phiên bản hiện hành thành nháp mới (metadata, phân loại, section, tệp, ảnh đại diện). */
export function createTemplateDraft(
  templateId: string,
  expectedTemplateVersion: number,
  baseVersionId: string
): Promise<VersionCreated> {
  return http.post<VersionCreated>(
    `${BASE}/${templateId}/drafts`,
    { expectedTemplateVersion, baseVersionId },
    idempotent()
  )
}

/** Chỉ xóa được nháp; bản đã công bố dùng Ẩn. Xóa nháp kéo theo section và liên kết tệp của nó. */
export function deleteTemplateDraft(templateId: string, versionId: string, expectedEditVersion: number) {
  return http.delete<void>(`${BASE}/${templateId}/versions/${versionId}`, {
    params: { expectedEditVersion },
    ...idempotent()
  })
}

/**
 * Gỡ tệp khỏi phiên bản — không xóa ở kho. BE từ chối (422 `InvalidLibraryContent`) nếu đó là
 * tệp cuối của section đang phục vụ khách.
 */
export function detachTemplateAsset(
  templateId: string,
  versionId: string,
  assetId: string,
  expectedEditVersion: number
): Promise<VersionEdited> {
  return http.delete<VersionEdited>(`${BASE}/${templateId}/versions/${versionId}/assets/${assetId}`, {
    params: { expectedEditVersion },
    ...idempotent()
  })
}

/**
 * Công bố bị BE từ chối (422 `InvalidLibraryContent`) vì nội dung chưa đủ. Mang ĐẦY ĐỦ các câu tiếng Việt
 * nói thiếu gì (chiều ngang, ảnh đại diện, phong cách…) — `ApiError` chung chỉ giữ câu đầu tiên.
 */
export class LibraryValidationError extends Error {
  constructor(
    readonly messages: string[],
    readonly messageCode: string | undefined
  ) {
    super(messages[0] ?? 'InvalidLibraryContent')
    this.name = 'LibraryValidationError'
  }
}

export async function publishTemplateVersion(
  templateId: string,
  versionId: string,
  body: { expectedTemplateVersion: number; expectedEditVersion: number; expectedCurrentVersionId: string | null }
) {
  type Published = { versionId: string; number: number; templateVersion: number; editVersion: number }
  const res = await httpClient.post<{ value?: Published; messageCode?: string; errors?: unknown }>(
    `${BASE}/${templateId}/versions/${versionId}/publish`,
    body,
    {
      ...idempotent(),
      // Chỉ 2xx và 422 được trả về để tự đọc danh sách lỗi; mọi mã khác (401 tự làm mới phiên, 409…) đi đường cũ.
      validateStatus: (status) => (status >= 200 && status < 300) || status === 422
    }
  )
  if (res.status === 422) throw new LibraryValidationError(extractValidationMessages(res.data), res.data?.messageCode)
  return res.data.value as Published
}

export function setTemplateVisibility(templateId: string, expectedTemplateVersion: number, isHidden: boolean) {
  return http.put<{ templateId: string; templateVersion: number; isHidden: boolean }>(
    `${BASE}/${templateId}/visibility`,
    { expectedTemplateVersion, isHidden },
    idempotent()
  )
}
