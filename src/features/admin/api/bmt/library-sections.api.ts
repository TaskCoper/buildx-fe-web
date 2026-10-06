import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { LibraryStyleRef, VersionEdited } from './library.api'
import type { LibraryFileKind } from './library-sections.logic'

/**
 * SECTION của phiên bản mẫu + phân loại (TDD-LIB-001, BR-LIB-001 khoản 17/20) — cần `library.manage`.
 *
 * Mọi tệp thuộc một section; section chưa có tệp là "đang chuẩn bị" (`isPreparing`) và chỉ admin
 * thấy. Mỗi ghi gửi `expectedEditVersion`; BE trả số mới (`editVersion`) để gọi tiếp. Mutation cần
 * `Idempotency-Key` (1–100 ký tự); `complete` upload tự chống lặp theo `uploadId` nên không cần.
 *
 * Hình dạng response lấy từ API thật (đã kiểm): danh sách section có thêm `coverAssetId`,
 * `isCurrent`, `isReadOnly` mà docs không nêu.
 */

const BASE = '/admin/library/templates'
const MAX_PAGE = 100

const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })
const versionBase = (templateId: string, versionId: string) => `${BASE}/${templateId}/versions/${versionId}`

/* ===========================================================================
 * Section
 * ======================================================================== */

export interface SectionItem {
  sectionId: string
  /** Null với section của bản nháp chưa đặt tên. */
  name: string | null
  position: number
  isPreparing: boolean
  assetCount: number
  assetsUrl?: string
}

export interface VersionSections {
  versionId: string
  editVersion: number
  coverAssetId: string | null
  isCurrent: boolean
  isReadOnly: boolean
  sections: SectionItem[]
}

interface RawVersionSections extends Partial<Omit<VersionSections, 'sections'>> {
  sections?: PagedResult<SectionItem> | null
}

/**
 * Mọi section của một phiên bản (đi hết các trang), theo vị trí. Các trang sau gửi
 * `expectedEditVersion` của trang đầu — phiên bản bị sửa giữa chừng thì BE trả 409 và màn tải lại.
 */
export async function listSections(templateId: string, versionId: string): Promise<VersionSections> {
  const sections: SectionItem[] = []
  let head: RawVersionSections | null = null
  for (let page = 1; ; page++) {
    const res: RawVersionSections = await http.get<RawVersionSections>(
      `${versionBase(templateId, versionId)}/sections`,
      {
        params: { pageIndex: page, pageSize: MAX_PAGE, expectedEditVersion: head?.editVersion }
      }
    )
    head ??= res
    sections.push(...(res.sections?.items ?? []))
    if (!res.sections?.hasNextPage) break
  }
  return {
    versionId,
    editVersion: head?.editVersion ?? 0,
    coverAssetId: head?.coverAssetId ?? null,
    isCurrent: Boolean(head?.isCurrent),
    isReadOnly: Boolean(head?.isReadOnly),
    sections: sections.sort((a, b) => a.position - b.position)
  }
}

export interface SectionSaved extends VersionEdited {
  sectionId: string
  name: string | null
  position: number
  isPreparing?: boolean
}

/** Thêm section vào CUỐI. Nháp cho phép tên rỗng; bản hiện hành bắt buộc có tên. */
export function createSection(
  templateId: string,
  versionId: string,
  expectedEditVersion: number,
  name: string
): Promise<SectionSaved> {
  return http.post<SectionSaved>(
    `${versionBase(templateId, versionId)}/sections`,
    { expectedEditVersion, name },
    idempotent()
  )
}

export function renameSection(
  templateId: string,
  versionId: string,
  sectionId: string,
  expectedEditVersion: number,
  name: string
): Promise<SectionSaved> {
  return http.put<SectionSaved>(
    `${versionBase(templateId, versionId)}/sections/${sectionId}`,
    { expectedEditVersion, name },
    idempotent()
  )
}

/** Đặt ảnh đại diện: chỉ nhận ẢNH đã gắn trong một section của đúng phiên bản này. */
export function setVersionCover(
  templateId: string,
  versionId: string,
  expectedEditVersion: number,
  assetId: string
): Promise<VersionEdited> {
  return http.put<VersionEdited>(
    `${versionBase(templateId, versionId)}/cover`,
    { expectedEditVersion, assetId },
    idempotent()
  )
}

/* ===========================================================================
 * Tệp trong section
 * ======================================================================== */

export interface SectionAssetItem {
  assetId: string
  sectionId?: string
  kind: LibraryFileKind
  /** URL gốc — admin xem trực tiếp (khách chỉ nhận `contentUrl` qua route riêng). */
  url: string
  originalName: string
  mediaType: string
  sizeBytes?: number | null
  position: number
  isCover: boolean
}

export interface SectionAssets {
  versionId: string
  sectionId: string
  editVersion: number
  coverAssetId: string | null
  assets: SectionAssetItem[]
}

interface RawSectionAssets extends Partial<Omit<SectionAssets, 'assets'>> {
  assets?: PagedResult<SectionAssetItem> | null
}

/** Mọi tệp của một section (đi hết các trang), theo vị trí trong section. */
export async function listSectionAssets(
  templateId: string,
  versionId: string,
  sectionId: string
): Promise<SectionAssets> {
  const assets: SectionAssetItem[] = []
  let head: RawSectionAssets | null = null
  for (let page = 1; ; page++) {
    const res: RawSectionAssets = await http.get<RawSectionAssets>(
      `${versionBase(templateId, versionId)}/sections/${sectionId}/assets`,
      { params: { pageIndex: page, pageSize: MAX_PAGE, expectedEditVersion: head?.editVersion } }
    )
    head ??= res
    assets.push(...(res.assets?.items ?? []))
    if (!res.assets?.hasNextPage) break
  }
  return {
    versionId,
    sectionId,
    editVersion: head?.editVersion ?? 0,
    coverAssetId: head?.coverAssetId ?? null,
    assets: assets.sort((a, b) => a.position - b.position)
  }
}

/* ===========================================================================
 * Phân loại (thay cho quyền `estimate.catalog.manage` của màn danh mục dự toán)
 * ======================================================================== */

export interface ClassificationBuildingType {
  buildingTypeId: string
  name: string
  floorsEnabled: boolean
  tumEnabled: boolean
  architectureEnabled: boolean
  interiorEnabled: boolean
  floorCounts: number[]
  architectureStyles: LibraryStyleRef[]
  interiorStyles: LibraryStyleRef[]
}

export interface ClassificationOptions {
  /** Null khi chưa có danh mục hiện hành. */
  catalogRevisionId: string | null
  buildingTypes: ClassificationBuildingType[]
}

/**
 * Lựa chọn phân loại của danh mục dự toán HIỆN HÀNH, dành cho người có `library.manage`: loại
 * công trình, số tầng, tum và phong cách kiến trúc / nội thất. Loại tắt tầng/tum/nhóm phong cách
 * thì danh sách tương ứng rỗng. Không truyền `buildingTypeId` để lấy mọi loại.
 */
export async function getClassificationOptions(): Promise<ClassificationOptions> {
  const raw = await http.get<Partial<ClassificationOptions> | null>('/admin/library/classification-options')
  return {
    catalogRevisionId: raw?.catalogRevisionId ?? null,
    buildingTypes: (raw?.buildingTypes ?? []).map((type) => ({
      ...type,
      floorCounts: type.floorCounts ?? [],
      architectureStyles: type.architectureStyles ?? [],
      interiorStyles: type.interiorStyles ?? []
    }))
  }
}
