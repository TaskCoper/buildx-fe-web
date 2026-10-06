import type { Contractor, ContractorProject, ServiceRegion } from '../types/contractor.types'

/**
 * Logic thuần của khu KHÁCH XEM nhà thầu (không gọi mạng, không import có alias lúc chạy) — tách
 * riêng để kiểm được không cần backend.
 *
 * Hình dạng THẬT của `GET /contractors/{id}` (đã đối chiếu với BE, hồ sơ Hiện): mọi thông tin hồ sơ
 * nằm trong `profile` chứ KHÔNG phẳng như item của danh sách:
 *   { contractorId, profile{ name, address, latitude, longitude, shortDescription, introduction,
 *     contractorType, foundedYear, architectCount, engineerCount, serviceAreaText, surveyHours,
 *     warrantyMonths, acceptingProjects, rating, ratingCount }, buildingTypes[{id,name}],
 *     scopes[{id,name}], images[{assetId,contentUrl,kind,position}], legal|null, licenses[],
 *     partnership|null, projects[], isVerified }
 *
 * Dự án công khai theo TDD-CTR-001 và Response.PublicProject: projectId, buildingType{id,name},
 * scope{id,name}, floorCount, hasAttic và bộ ảnh. Dạng phẳng cũ vẫn được đọc để giữ tương thích.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Id nhà thầu / dự án thật là GUID; id mock là chuỗi tự đặt — chỉ GUID mới đáng gọi API. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

type Bag = Record<string, unknown>

const bag = (value: unknown): Bag | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Bag) : null
const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}
/** Số, nhận cả chuỗi số (BE hay trả kích thước dạng "11"). */
const num = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}
const bool = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

/** Dự án công khai đã chuẩn hoá — trung tính, chưa gắn vào kiểu giao diện. */
export interface ApiProject {
  id: string
  name: string
  completedYear?: number
  buildingTypeId?: string
  buildingTypeName?: string
  scopeId?: string
  scopeName?: string
  /** URL ảnh công khai theo `position`, không trùng. */
  imageUrls: string[]
  widthM?: number
  lengthM?: number
  areaM2?: number
  floorCount?: number
  hasAttic?: boolean
  locationText?: string
  roleText?: string
  mainWork?: string
}

const IMAGE_URL_KEYS = ['contentUrl', 'url', 'imageUrl', 'fileUrl', 'src'] as const
const IMAGE_LIST_KEYS = ['images', 'photos', 'imageUrls', 'gallery'] as const

/** Ảnh từ một mảng có thể là chuỗi URL hoặc object `{contentUrl|url|…, position}`; chỉ nhận http(s). */
export function readImageUrls(source: Bag): string[] {
  const entries: { url: string; position: number; order: number }[] = []
  let order = 0
  const push = (url: string | undefined, position: number | undefined) => {
    if (url && /^https?:\/\//i.test(url))
      entries.push({ url, position: position ?? Number.MAX_SAFE_INTEGER, order: order++ })
  }

  for (const key of IMAGE_LIST_KEYS) {
    const list = source[key]
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (typeof item === 'string') push(text(item), undefined)
      else {
        const entry = bag(item)
        if (!entry) continue
        push(IMAGE_URL_KEYS.map((k) => text(entry[k])).find(Boolean), num(entry.position))
      }
    }
  }
  // Ảnh đơn lẻ (nếu BE trả thêm) đứng sau bộ ảnh.
  for (const key of ['coverUrl', 'imageUrl', 'thumbnailUrl'] as const) push(text(source[key]), undefined)

  const seen = new Set<string>()
  return entries
    .sort((a, b) => a.position - b.position || a.order - b.order)
    .filter((entry) => (seen.has(entry.url) ? false : (seen.add(entry.url), true)))
    .map((entry) => entry.url)
}

/** Một dự án (phần tử `projects[]` hoặc thân `GET …/projects/{id}`) → `ApiProject`; `null` nếu không phải object. */
export function normalizeProject(raw: unknown): ApiProject | null {
  const item = bag(raw)
  if (!item) return null
  const type = bag(item.buildingType)
  const scope = bag(item.scope)
  const buildingTypeId = text(item.buildingTypeId) ?? text(type?.id)
  const scopeId = text(item.scopeId) ?? text(scope?.id)
  return {
    id: text(item.id) ?? text(item.projectId) ?? '',
    name: text(item.name) ?? '',
    ...(num(item.completedYear) !== undefined ? { completedYear: num(item.completedYear) } : {}),
    ...(buildingTypeId ? { buildingTypeId } : {}),
    ...(text(type?.name) ? { buildingTypeName: text(type?.name) } : {}),
    ...(scopeId ? { scopeId } : {}),
    ...(text(scope?.name) ? { scopeName: text(scope?.name) } : {}),
    imageUrls: readImageUrls(item),
    ...(num(item.widthM) !== undefined ? { widthM: num(item.widthM) } : {}),
    ...(num(item.lengthM) !== undefined ? { lengthM: num(item.lengthM) } : {}),
    ...(num(item.areaM2) !== undefined ? { areaM2: num(item.areaM2) } : {}),
    ...(num(item.floorCount) !== undefined ? { floorCount: num(item.floorCount) } : {}),
    ...(bool(item.hasAttic) !== undefined ? { hasAttic: bool(item.hasAttic) } : {}),
    ...(text(item.locationText) ? { locationText: text(item.locationText) } : {}),
    ...(text(item.roleText) ? { roleText: text(item.roleText) } : {}),
    ...(text(item.mainWork) ? { mainWork: text(item.mainWork) } : {})
  }
}

/** Số thập phân kiểu Việt ("4,5") như dữ liệu mẫu ('4,5×18m'). */
const vn = (value: number): string => String(value).replace('.', ',')

/** "5×20m" khi có đủ rộng và dài, còn thiếu một cạnh thì không in (đừng bịa cạnh còn lại). */
export function dimensionsText(widthM?: number, lengthM?: number): string | undefined {
  return widthM !== undefined && lengthM !== undefined ? `${vn(widthM)}×${vn(lengthM)}m` : undefined
}

/**
 * `ApiProject` → dự án của giao diện. Giữ GUID và tên danh mục từ API để hiển thị và lọc loại công trình.
 * Phạm vi động dùng scopeId/scopeName; không ép GUID vào enum scope của mock.
 * `roleText` là chữ tự do, không ép vào enum contractorRole.
 */
export function projectFromApi(api: ApiProject): ContractorProject {
  const [cover, ...rest] = api.imageUrls
  const dimensions = dimensionsText(api.widthM, api.lengthM)
  return {
    id: api.id,
    name: api.name,
    year: api.completedYear ?? 0,
    ...(api.buildingTypeId ? { buildingTypeId: api.buildingTypeId } : {}),
    ...(api.buildingTypeName ? { buildingTypeName: api.buildingTypeName } : {}),
    ...(api.scopeId ? { scopeId: api.scopeId } : {}),
    ...(api.scopeName ? { scopeName: api.scopeName } : {}),
    ...(api.floorCount !== undefined ? { floorCount: api.floorCount } : {}),
    ...(api.hasAttic !== undefined ? { hasAttic: api.hasAttic } : {}),
    ...(api.areaM2 !== undefined ? { areaM2: api.areaM2 } : {}),
    ...(dimensions ? { dimensions } : {}),
    ...(api.locationText ? { location: api.locationText } : {}),
    ...(api.mainWork ? { mainItems: api.mainWork } : {}),
    ...(cover ? { imageUrl: cover } : {}),
    ...(rest.length ? { galleryUrls: rest } : {})
  }
}

/**
 * Phủ chi tiết dự án từ API lên dự án đang hiện (luật chung: field API có thì lấy, không có thì giữ).
 * `floorsLabel` do giao diện truyền vào để chữ "N tầng" đi qua i18n chứ không hardcode ở đây.
 */
export function mergeProjectDetail(
  base: ContractorProject,
  detail: ApiProject | null | undefined,
  floorsLabel: (count: number) => string
): ContractorProject {
  if (!detail) return base
  const api = projectFromApi(detail)
  return {
    ...base,
    ...(detail.name ? { name: api.name } : {}),
    ...(detail.completedYear !== undefined ? { year: api.year } : {}),
    ...(api.buildingTypeId ? { buildingTypeId: api.buildingTypeId } : {}),
    ...(api.buildingTypeName ? { buildingTypeName: api.buildingTypeName } : {}),
    ...(api.scopeId ? { scopeId: api.scopeId } : {}),
    ...(api.scopeName ? { scopeName: api.scopeName } : {}),
    ...(api.floorCount !== undefined ? { floorCount: api.floorCount } : {}),
    ...(api.hasAttic !== undefined ? { hasAttic: api.hasAttic } : {}),
    ...(api.areaM2 !== undefined ? { areaM2: api.areaM2 } : {}),
    ...(api.dimensions ? { dimensions: api.dimensions } : {}),
    ...(api.location ? { location: api.location } : {}),
    ...(api.mainItems ? { mainItems: api.mainItems } : {}),
    ...(api.imageUrl ? { imageUrl: api.imageUrl, galleryUrls: api.galleryUrls ?? [] } : {}),
    ...(detail.floorCount !== undefined && detail.floorCount > 0 ? { scale: floorsLabel(detail.floorCount) } : {})
  }
}

/** Hồ sơ nhà thầu công khai đã chuẩn hoá. */
export interface ApiContractor {
  region?: ServiceRegion | null
  provinceCode?: string | null
  id: string
  name: string
  shortDescription?: string
  intro?: string
  kind?: string
  address?: string
  foundedYear?: number
  teamSize?: number
  warrantyMonths?: number
  surveyHours?: number
  acceptingProjects?: boolean
  rating?: number
  ratingCount?: number
  serviceAreas: string[]
  buildingTypeIds: string[]
  logoUrl?: string
  photoUrls: string[]
  projects: ApiProject[]
  verified: boolean
}

const idsOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : []).map((entry) => text(bag(entry)?.id)).filter((id): id is string => Boolean(id))

/**
 * `PublicContractorDetail` → `ApiContractor`. Đọc `profile` lồng (hình dạng thật); nếu BE trả phẳng như
 * item danh sách thì dùng chính gốc làm `profile` — nên cả hai dạng đều ra đủ tên và thông tin lõi.
 * `null` khi không có id (không phải hồ sơ hợp lệ) để phía gọi rơi về mock.
 */
export function normalizeContractor(raw: unknown): ApiContractor | null {
  const root = bag(raw)
  if (!root) return null
  const id = text(root.contractorId) ?? text(root.id)
  if (!id) return null

  const profile = bag(root.profile) ?? root
  const architects = num(profile.architectCount)
  const engineers = num(profile.engineerCount)

  const images = (Array.isArray(root.images) ? root.images : [])
    .map(bag)
    .filter((entry): entry is Bag => entry !== null)
  const logo = images.find((entry) => /logo/i.test(text(entry.kind) ?? ''))
  const photoUrls = readImageUrls({ images: images.filter((entry) => entry !== logo) })

  return {
    id,
    name: text(profile.name) ?? '',
    region:
      root.regionCode === 'north' || root.regionCode === 'central' || root.regionCode === 'south'
        ? root.regionCode
        : null,
    provinceCode: text(profile.provinceCode) ?? null,
    ...(text(profile.shortDescription) ? { shortDescription: text(profile.shortDescription) } : {}),
    ...(text(profile.introduction) ? { intro: text(profile.introduction) } : {}),
    ...(text(profile.contractorType) ? { kind: text(profile.contractorType) } : {}),
    ...(text(profile.address) ? { address: text(profile.address) } : {}),
    ...(num(profile.foundedYear) !== undefined ? { foundedYear: num(profile.foundedYear) } : {}),
    ...(architects !== undefined || engineers !== undefined ? { teamSize: (architects ?? 0) + (engineers ?? 0) } : {}),
    ...(num(profile.warrantyMonths) !== undefined ? { warrantyMonths: num(profile.warrantyMonths) } : {}),
    ...(num(profile.surveyHours) !== undefined ? { surveyHours: num(profile.surveyHours) } : {}),
    ...(bool(profile.acceptingProjects) !== undefined ? { acceptingProjects: bool(profile.acceptingProjects) } : {}),
    ...(num(profile.rating) !== undefined ? { rating: num(profile.rating) } : {}),
    ...(num(profile.ratingCount) !== undefined ? { ratingCount: num(profile.ratingCount) } : {}),
    serviceAreas: (text(profile.serviceAreaText) ?? '')
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean),
    buildingTypeIds: idsOf(root.buildingTypes),
    ...(logo ? { logoUrl: readImageUrls({ images: [logo] })[0] } : {}),
    photoUrls,
    projects: (Array.isArray(root.projects) ? root.projects : [])
      .map(normalizeProject)
      .filter((p): p is ApiProject => p !== null),
    // Hồ sơ công khai = đã Hiện (BR-CTR-002 "publish = verified"); BE có cờ rõ thì theo cờ.
    verified: bool(root.isVerified) ?? true
  }
}

/**
 * `ApiContractor` → `Contractor` của giao diện. Field BE không có để giá trị trung tính như bản map từ
 * item danh sách (`scopes` để trống vì FE dùng 4 mã cứng còn BE dùng GUID động).
 */
export function contractorFromApi(api: ApiContractor): Contractor {
  return {
    id: api.id,
    name: api.name,
    ...(api.logoUrl ? { logoUrl: api.logoUrl } : {}),
    kind: api.kind ?? '',
    verified: api.verified,
    rating: api.rating ?? 0,
    reviewCount: api.ratingCount ?? 0,
    ratingKnown: api.rating != null,
    reviewCountKnown: api.ratingCount != null,
    similarProjects: 0,
    completedProjects: api.projects.length,
    distanceKm: 0,
    serviceAreas: api.serviceAreas,
    region: api.region ?? null,
    provinceCode: api.provinceCode ?? null,
    distanceKnown: false,
    surveyWithinHours: api.surveyHours ?? 0,
    acceptingProjects: api.acceptingProjects ?? false,
    surveyTimeKnown: api.surveyHours != null,
    acceptingProjectsKnown: api.acceptingProjects != null,
    intro: api.intro ?? '',
    strengths: [],
    photos: api.photoUrls.map((url) => ({ url, caption: '' })),
    buildingTypeIds: api.buildingTypeIds,
    scopes: [],
    ...(api.shortDescription ? { shortDescription: api.shortDescription } : {}),
    officeAddress: api.address ?? '',
    foundedYear: api.foundedYear ?? 0,
    teamSize: api.teamSize ?? 0,
    warrantyMonths: api.warrantyMonths ?? 0,
    legalChecks: [],
    featuredProjects: api.projects.map(projectFromApi),
    verifiedProjects: 0,
    partnership: { verified: false, since: '', contractCode: '', signedAt: '', pageCount: 0 },
    hidden: false
  }
}
