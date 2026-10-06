/**
 * Logic THUẦN của chi tiết thư viện mẫu theo SECTION, bộ lọc thư viện và tải tệp đính kèm
 * (TDD-LIB-001/002, docs commit 786a220). Không gọi mạng, không import alias — để kiểm được
 * bằng `node --experimental-strip-types` mà không cần backend.
 *
 * Hình dạng response lấy từ TDD-LIB-002 và đã đối chiếu với API thật ngày 01/10/2026
 * (`/design-templates/filters`, `/design-templates?architectureStyleIds=…`). Các route
 * `library-versions/{id}/sections…` chưa gọi thử được vì BE chưa có mẫu nào công bố, nên mọi
 * field đều đọc phòng thủ: thiếu field thì dùng giá trị an toàn, không ném lỗi làm sập trang.
 */

/* ===========================================================================
 * DTO
 * ======================================================================== */

export interface PageLike<T> {
  items?: T[]
  hasNextPage?: boolean
}

export interface BmtSectionItem {
  sectionId: string
  name?: string | null
  position?: number | null
  assetCount?: number | null
  assetsUrl?: string | null
}

/** `GET /library-versions/{versionId}/sections`. */
export interface BmtSectionsPage {
  versionId?: string
  editVersion?: number
  sections?: PageLike<BmtSectionItem>
}

export interface BmtSectionAsset {
  assetId: string
  sectionId?: string | null
  kind?: string | null
  name?: string | null
  mediaType?: string | null
  sizeBytes?: number | null
  position?: number | null
  isCover?: boolean | null
  contentUrl?: string | null
}

/** `GET /library-versions/{versionId}/sections/{sectionId}/assets`. */
export interface BmtSectionAssetsPage {
  versionId?: string
  editVersion?: number
  sectionId?: string
  sectionName?: string | null
  sectionPosition?: number | null
  coverAssetId?: string | null
  assets?: PageLike<BmtSectionAsset>
}

/* ===========================================================================
 * Kiểu cho giao diện
 * ======================================================================== */

export interface HandbookSectionImage {
  assetId: string
  name: string
  /** Route nội dung của backend — cần cookie phiên, KHÔNG đưa qua trình tối ưu ảnh của Next. */
  imageUrl: string
  isCover: boolean
}

export interface HandbookAttachment {
  assetId: string
  name: string
  mediaType: string
  sizeBytes?: number
  contentUrl: string
  /** "PDF", "DWG", "DXF" — để hiện nhãn loại tệp. */
  extension: string
}

/** Một nhóm nội dung (section) của mẫu cùng các tệp của nó. */
export interface HandbookSectionGroup {
  sectionId: string
  name: string
  position: number
  images: HandbookSectionImage[]
  attachments: HandbookAttachment[]
}

export interface HandbookStyleRef {
  styleId: string
  name: string
  imageUrl?: string
}

/* ===========================================================================
 * Đường dẫn
 * ======================================================================== */

/**
 * Nguồn ảnh là route của backend cần COOKIE PHIÊN (nội dung thư viện chỉ cấp cho người đã mở
 * mẫu). `next/image` tải ảnh phía máy chủ Next nên không mang cookie của khách → phải để
 * trình duyệt tự tải bằng thẻ `<img>` thường.
 */
export function isProtectedContentUrl(src: string | null | undefined): boolean {
  return Boolean(src && src.startsWith('/api/'))
}

/* ===========================================================================
 * Loại tệp
 * ======================================================================== */

/** Định dạng ảnh BE nhận (BR-MEDIA-001). `image/vnd.dwg|dxf` cũng bắt đầu bằng `image/` nhưng là bản vẽ. */
const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const EXTENSION_BY_MEDIA_TYPE: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/vnd.dwg': 'DWG',
  'image/vnd.dxf': 'DXF'
}

/** Ưu tiên `kind` do BE trả; thiếu thì xét đúng ba định dạng ảnh, KHÔNG xét tiền tố `image/`. */
export function isImageAsset(asset: Pick<BmtSectionAsset, 'kind' | 'mediaType'>): boolean {
  if (asset.kind) return asset.kind.toLowerCase() === 'image'
  return IMAGE_MEDIA_TYPES.includes((asset.mediaType ?? '').toLowerCase())
}

export function extensionOf(name: string | null | undefined, mediaType: string | null | undefined): string {
  const fromName = /\.([A-Za-z0-9]{1,5})$/.exec(name ?? '')?.[1]
  if (fromName) return fromName.toUpperCase()
  return EXTENSION_BY_MEDIA_TYPE[(mediaType ?? '').toLowerCase()] ?? ''
}

/** "1,2 MB" — một chữ số thập phân, theo ngôn ngữ đang dùng. `undefined` khi thiếu hoặc ≤ 0. */
export function formatFileSize(bytes: number | null | undefined, locale = 'vi'): string | undefined {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return undefined
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const text = new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value)
  return `${text} ${units[unit]}`
}

/**
 * Tên tệp từ header `Content-Disposition` của route tải. BE gửi cả `filename*` UTF-8 (tên gốc)
 * và bản ASCII dự phòng; ưu tiên `filename*`, hỏng mã hoá thì rơi về bản ASCII.
 */
export function parseContentDisposition(header: string | null | undefined): string | null {
  if (!header) return null

  const star = /filename\*\s*=\s*([^;]+)/i.exec(header)?.[1]?.trim()
  if (star) {
    // Dạng: UTF-8''%E1%BA%A3nh.pdf (charset'lang'giá trị đã mã hoá %).
    const value = star.replace(/^[^']*'[^']*'/, '').replace(/^"|"$/g, '')
    try {
      const decoded = decodeURIComponent(value)
      if (decoded) return decoded
    } catch {
      // bỏ qua, dùng bản ASCII
    }
  }

  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header)
  const raw = plain?.[2] ?? plain?.[1]
  const name = raw?.trim().replace(/^"|"$/g, '')
  return name ? name : null
}

/* ===========================================================================
 * Section và tệp
 * ======================================================================== */

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export interface NormalizedSections {
  versionId: string
  editVersion: number | undefined
  items: BmtSectionItem[]
  hasNextPage: boolean
}

/** Sắp Position rồi SectionId (đúng thứ tự BE); bỏ dòng thiếu `sectionId`. */
export function normalizeSectionsPage(raw: BmtSectionsPage | null | undefined): NormalizedSections {
  const items = (raw?.sections?.items ?? [])
    .filter((item) => Boolean(item?.sectionId))
    .map((item) => ({
      sectionId: item.sectionId,
      name: text(item.name),
      position: toNumber(item.position, Number.MAX_SAFE_INTEGER),
      assetCount: toNumber(item.assetCount, 0),
      assetsUrl: item.assetsUrl ?? null
    }))
    .sort((a, b) => a.position - b.position || a.sectionId.localeCompare(b.sectionId))

  return {
    versionId: text(raw?.versionId),
    editVersion: typeof raw?.editVersion === 'number' ? raw.editVersion : undefined,
    items,
    hasNextPage: Boolean(raw?.sections?.hasNextPage)
  }
}

export interface NormalizedSectionAssets {
  editVersion: number | undefined
  sectionId: string
  sectionName: string
  coverAssetId: string | null
  items: BmtSectionAsset[]
  hasNextPage: boolean
}

export function normalizeSectionAssetsPage(raw: BmtSectionAssetsPage | null | undefined): NormalizedSectionAssets {
  const items = (raw?.assets?.items ?? []).filter((item) => Boolean(item?.assetId))
  return {
    editVersion: typeof raw?.editVersion === 'number' ? raw.editVersion : undefined,
    sectionId: text(raw?.sectionId),
    sectionName: text(raw?.sectionName),
    coverAssetId: raw?.coverAssetId ?? null,
    items,
    hasNextPage: Boolean(raw?.assets?.hasNextPage)
  }
}

const byPosition = <T extends { position?: number | null; assetId: string }>(a: T, b: T): number =>
  toNumber(a.position, Number.MAX_SAFE_INTEGER) - toNumber(b.position, Number.MAX_SAFE_INTEGER) ||
  a.assetId.localeCompare(b.assetId)

/**
 * Dựng các nhóm hiển thị. Khách chỉ thấy section đã có tệp (BE cũng không trả section đang
 * chuẩn bị), nên nhóm rỗng bị bỏ. Tệp thiếu `contentUrl` không tải được nên cũng bỏ.
 */
export function buildSectionGroups(
  sections: readonly Pick<BmtSectionItem, 'sectionId' | 'name' | 'position'>[],
  assetsBySection: Readonly<Record<string, readonly BmtSectionAsset[]>>,
  coverAssetId?: string | null
): HandbookSectionGroup[] {
  const groups: HandbookSectionGroup[] = []

  for (const section of sections) {
    const assets = [...(assetsBySection[section.sectionId] ?? [])].filter((asset) => Boolean(asset.contentUrl))
    if (!assets.length) continue
    assets.sort(byPosition)

    const images: HandbookSectionImage[] = []
    const attachments: HandbookAttachment[] = []
    for (const asset of assets) {
      const name = text(asset.name)
      if (isImageAsset(asset)) {
        images.push({
          assetId: asset.assetId,
          name,
          imageUrl: asset.contentUrl as string,
          isCover: Boolean(asset.isCover) || (coverAssetId != null && asset.assetId === coverAssetId)
        })
      } else {
        attachments.push({
          assetId: asset.assetId,
          name,
          mediaType: text(asset.mediaType),
          ...(typeof asset.sizeBytes === 'number' && asset.sizeBytes > 0 ? { sizeBytes: asset.sizeBytes } : {}),
          contentUrl: asset.contentUrl as string,
          extension: extensionOf(name, asset.mediaType)
        })
      }
    }

    groups.push({
      sectionId: section.sectionId,
      name: text(section.name),
      position: toNumber(section.position, groups.length + 1),
      images,
      attachments
    })
  }

  return groups
}

/**
 * Mọi ảnh của các nhóm, theo thứ tự nhóm rồi thứ tự tệp — là dải "tầng" của trình xem ảnh.
 * Nhãn: nhóm chỉ có một ảnh thì dùng tên nhóm; nhiều ảnh thì "tên nhóm 1, 2…". Thiếu tên nhóm
 * thì dùng tên tệp, rồi `fallbackLabel(n)`.
 */
export function floorsFromGroups(
  groups: readonly HandbookSectionGroup[],
  fallbackLabel: (index: number) => string = (index) => `Ảnh ${index}`
): { id: string; label: string; imageUrl: string; groupId: string; groupLabel: string }[] {
  const floors: { id: string; label: string; imageUrl: string; groupId: string; groupLabel: string }[] = []

  for (const group of groups) {
    group.images.forEach((image, index) => {
      const base = group.name || image.name
      const label =
        base === ''
          ? fallbackLabel(floors.length + 1)
          : group.images.length > 1 && group.name
            ? `${group.name} ${index + 1}`
            : base
      floors.push({
        id: image.assetId,
        label,
        imageUrl: image.imageUrl,
        groupId: group.sectionId,
        groupLabel: group.name || label
      })
    })
  }

  return floors
}

/** Ảnh đại diện: ảnh được BE gắn cờ `isCover` trong các nhóm. */
export function coverImageOf(groups: readonly HandbookSectionGroup[]): string | undefined {
  for (const group of groups) {
    const cover = group.images.find((image) => image.isCover)
    if (cover) return cover.imageUrl
  }
  return undefined
}

/**
 * Dự phòng khi route section không dùng được (BE cũ): mọi tệp của route phẳng vào MỘT nhóm
 * không tên. Route phẳng vẫn tồn tại theo docs, chỉ thêm `sectionId/sectionName/sectionPosition`.
 */
export function singleGroupFromFlat(
  assets: readonly BmtSectionAsset[],
  coverAssetId?: string | null
): HandbookSectionGroup[] {
  return buildSectionGroups([{ sectionId: '_flat', name: '', position: 1 }], { _flat: assets }, coverAssetId)
}

/* ===========================================================================
 * Phong cách, bộ lọc, truy vấn
 * ======================================================================== */

export interface BmtStyleRef {
  styleId?: string | null
  name?: string | null
  imageUrl?: string | null
}

export function normalizeStyles(raw: readonly BmtStyleRef[] | null | undefined): HandbookStyleRef[] {
  return (raw ?? [])
    .filter((style) => Boolean(style?.styleId) && Boolean(text(style.name)))
    .map((style) => ({
      styleId: style.styleId as string,
      name: text(style.name),
      ...(style.imageUrl ? { imageUrl: style.imageUrl } : {})
    }))
}

/** Dòng "Phong cách" của mẫu 3D: kiến trúc rồi nội thất; rỗng thì dùng `fallback` (loại công trình). */
export function styleLabelOf(
  architecture: readonly HandbookStyleRef[],
  interior: readonly HandbookStyleRef[],
  fallback: string
): string {
  const names = [...architecture, ...interior].map((style) => style.name)
  return names.length ? names.join(' · ') : fallback
}

/** `GET /design-templates/filters`. */
export interface BmtLibraryFilters {
  buildingTypes?: { buildingTypeId?: string | null; name?: string | null }[]
  floorCounts?: number[]
  architectureStyles?: BmtStyleRef[]
  interiorStyles?: BmtStyleRef[]
}

export interface LibraryFilterOptions {
  buildingTypes: { id: string; name: string }[]
  floorCounts: number[]
  architectureStyles: HandbookStyleRef[]
  interiorStyles: HandbookStyleRef[]
}

export function normalizeLibraryFilters(raw: BmtLibraryFilters | null | undefined): LibraryFilterOptions {
  return {
    buildingTypes: (raw?.buildingTypes ?? [])
      .filter((item) => Boolean(item?.buildingTypeId) && Boolean(text(item.name)))
      .map((item) => ({ id: item.buildingTypeId as string, name: text(item.name) })),
    floorCounts: (raw?.floorCounts ?? []).filter((count) => typeof count === 'number' && Number.isFinite(count)),
    architectureStyles: normalizeStyles(raw?.architectureStyles),
    interiorStyles: normalizeStyles(raw?.interiorStyles)
  }
}

export type QueryValue = string | number | boolean | readonly string[] | null | undefined

/**
 * Chuỗi truy vấn với tham số LẶP (`architectureStyleIds=a&architectureStyleIds=b`) — đúng dạng
 * BE nhận (đã thử: 200). Axios mặc định viết `ids[]=a`, BE sẽ không hiểu. Bỏ giá trị rỗng.
 */
export function buildQuery(params: Record<string, QueryValue>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      if (item === '' || item === undefined || item === null) continue
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`)
    }
  }
  return parts.join('&')
}

/** `templateId` của một trang `GET /design-templates` (dùng để lọc lưới theo phong cách ở phía BE). */
export function templateIdsOf(page: { items?: { templateId?: string | null }[] } | null | undefined): string[] {
  return (page?.items ?? []).map((item) => item.templateId).filter((id): id is string => Boolean(id))
}
