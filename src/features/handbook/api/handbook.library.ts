import { http, isApiError } from '@/shared/lib/api'
import {
  buildQuery,
  buildSectionGroups,
  normalizeLibraryFilters,
  normalizeSectionAssetsPage,
  normalizeSectionsPage,
  parseContentDisposition,
  singleGroupFromFlat,
  templateIdsOf,
  type BmtLibraryFilters,
  type BmtSectionAsset,
  type BmtSectionAssetsPage,
  type BmtSectionItem,
  type BmtSectionsPage,
  type HandbookSectionGroup,
  type LibraryFilterOptions,
  type PageLike
} from './handbook.library.logic'

/**
 * Phần gọi mạng của chi tiết thư viện mẫu THEO SECTION (TDD-LIB-002) và bộ lọc thư viện.
 * Mọi chuyển đổi dữ liệu nằm ở `handbook.library.logic.ts` (hàm thuần, có kiểm thử).
 *
 * Đường dẫn tự dựng từ `versionId`/`sectionId` chứ KHÔNG dùng `assetsUrl` BE trả: nó đã kèm
 * tiền tố `/api/v1` còn `http` có sẵn `baseURL` đó, đưa nguyên vào sẽ bị nhân đôi.
 */

const PAGE_SIZE = 100
const MAX_PAGES = 20

export interface LoadedVersionContent {
  groups: HandbookSectionGroup[]
  editVersion: number | undefined
  coverAssetId: string | null
}

/** BE đổi phiên bản giữa hai lần đọc (docs: 409 `LibraryVersionChanged`, phía khách). */
function isVersionChanged(error: unknown): boolean {
  return isApiError(error) && error.messageCode === 'LibraryVersionChanged'
}

/**
 * Đọc các section rồi tệp của từng section, cùng một khoá lạc quan `expectedEditVersion`:
 * trang đầu của GET phân trang là tuỳ chọn, các trang sau và GET tệp thì bắt buộc gửi lại giá
 * trị BE vừa trả — để phiên bản bị sửa giữa chừng thì 409 chứ không ghép hai lần sửa.
 */
async function readSections(versionId: string, editVersion: number | undefined): Promise<LoadedVersionContent> {
  let current = editVersion
  const sections: BmtSectionItem[] = []

  for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex++) {
    const raw = await http.get<BmtSectionsPage>(`/library-versions/${versionId}/sections`, {
      params: { pageIndex, pageSize: PAGE_SIZE, ...(current !== undefined ? { expectedEditVersion: current } : {}) }
    })
    const page = normalizeSectionsPage(raw)
    sections.push(...page.items)
    if (page.editVersion !== undefined) current = page.editVersion
    if (!page.hasNextPage) break
  }

  let coverAssetId: string | null = null
  const assetsBySection: Record<string, BmtSectionAsset[]> = {}

  await Promise.all(
    sections.map(async (section) => {
      const items: BmtSectionAsset[] = []
      for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex++) {
        const raw = await http.get<BmtSectionAssetsPage>(
          `/library-versions/${versionId}/sections/${section.sectionId}/assets`,
          {
            params: {
              pageIndex,
              pageSize: PAGE_SIZE,
              ...(current !== undefined ? { expectedEditVersion: current } : {})
            }
          }
        )
        const page = normalizeSectionAssetsPage(raw)
        items.push(...page.items)
        if (page.coverAssetId) coverAssetId = page.coverAssetId
        if (!page.hasNextPage) break
      }
      assetsBySection[section.sectionId] = items
    })
  )

  return { groups: buildSectionGroups(sections, assetsBySection, coverAssetId), editVersion: current, coverAssetId }
}

/**
 * Dự phòng khi route section không dùng được: route tệp PHẲNG vẫn tồn tại theo docs (chỉ thêm
 * `sectionId/sectionName/sectionPosition`), gom hết vào một nhóm không tên.
 */
async function readFlat(versionId: string, editVersion: number | undefined): Promise<LoadedVersionContent> {
  const items: BmtSectionAsset[] = []
  let coverAssetId: string | null = null
  let current = editVersion

  for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex++) {
    const raw = await http.get<{
      editVersion?: number
      coverAssetId?: string | null
      assets?: PageLike<BmtSectionAsset>
    }>(`/library-versions/${versionId}/assets`, {
      params: { pageIndex, pageSize: PAGE_SIZE, ...(current !== undefined ? { expectedEditVersion: current } : {}) }
    })
    if (typeof raw.editVersion === 'number') current = raw.editVersion
    if (raw.coverAssetId) coverAssetId = raw.coverAssetId
    items.push(...(raw.assets?.items ?? []))
    if (!raw.assets?.hasNextPage) break
  }

  return { groups: singleGroupFromFlat(items, coverAssetId), editVersion: current, coverAssetId }
}

/**
 * Nội dung của một phiên bản đã mở: theo section; gặp 409 đổi phiên bản thì đọc lại đúng một
 * lần (không gửi khoá cũ); route section hỏng vì lý do khác thì rơi về route phẳng. Lỗi của
 * route phẳng (403/404…) được ném tiếp để nơi gọi về mock.
 */
export async function loadVersionContent(
  versionId: string,
  editVersion: number | undefined
): Promise<LoadedVersionContent> {
  try {
    try {
      return await readSections(versionId, editVersion)
    } catch (error) {
      if (!isVersionChanged(error)) throw error
      return await readSections(versionId, undefined)
    }
  } catch {
    return readFlat(versionId, editVersion)
  }
}

/* ===========================================================================
 * Bộ lọc thư viện
 * ======================================================================== */

export interface LibraryFilterQuery {
  drawingKind?: '2D' | '3D'
  buildingTypeId?: string
}

/** `GET /design-templates/filters` — công khai; `2D` thì hai tập phong cách rỗng. */
export async function fetchLibraryFilters(query: LibraryFilterQuery = {}): Promise<LibraryFilterOptions> {
  const qs = buildQuery({ drawingKind: query.drawingKind, buildingTypeId: query.buildingTypeId })
  const raw = await http.get<BmtLibraryFilters>(`/design-templates/filters${qs ? `?${qs}` : ''}`)
  return normalizeLibraryFilters(raw)
}

export interface TemplateStyleQuery {
  drawingKind: '2D' | '3D'
  buildingTypeId?: string
  floorCount?: number
  hasTum?: boolean
  architectureStyleIds?: readonly string[]
  interiorStyleIds?: readonly string[]
}

/**
 * `templateId` của mọi mẫu công khai khớp các bộ lọc. BE nhận tham số LẶP cho phong cách: trong
 * mỗi nhóm khớp ít nhất một (OR), giữa hai nhóm và với loại công trình là AND; mẫu 2D bỏ qua
 * cả hai nhóm phong cách. Gửi id không phải GUID là 400.
 */
export async function fetchTemplateIdsByStyle(query: TemplateStyleQuery): Promise<string[]> {
  const ids: string[] = []
  for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex++) {
    const qs = buildQuery({
      drawingKind: query.drawingKind,
      buildingTypeId: query.buildingTypeId,
      floorCount: query.floorCount,
      hasTum: query.hasTum,
      architectureStyleIds: query.architectureStyleIds,
      interiorStyleIds: query.interiorStyleIds,
      pageIndex,
      pageSize: PAGE_SIZE
    })
    const page = await http.get<{ items?: { templateId?: string | null }[]; hasNextPage?: boolean }>(
      `/design-templates?${qs}`
    )
    ids.push(...templateIdsOf(page))
    if (!page.hasNextPage) break
  }
  return ids
}

/* ===========================================================================
 * Tải tệp đính kèm
 * ======================================================================== */

/** Tải tệp thất bại; `status` là mã HTTP (0 khi lỗi mạng). */
export class LibraryDownloadError extends Error {
  constructor(readonly status: number) {
    super(`Tải tệp thất bại (${status})`)
    this.name = 'LibraryDownloadError'
  }
}

/**
 * Tải một tệp đính kèm qua route nội dung của BE (cần cookie phiên, BE stream bytes — không
 * bao giờ trả URL kho gốc). Dùng `fetch` + blob thay vì `<a href download>` để lỗi 403/404 báo
 * được cho người dùng và tên tệp lấy đúng từ `Content-Disposition` (tên gốc UTF-8).
 */
export async function downloadLibraryAsset(contentUrl: string, fallbackName: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(contentUrl, { credentials: 'include' })
  } catch {
    throw new LibraryDownloadError(0)
  }
  if (!response.ok) throw new LibraryDownloadError(response.status)

  const name = parseContentDisposition(response.headers.get('Content-Disposition')) ?? (fallbackName || 'download')
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Trình duyệt cần thời gian bắt đầu ghi tệp trước khi giải phóng blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
