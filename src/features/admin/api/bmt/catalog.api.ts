import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/api'

/**
 * Danh mục dự toán (EstimateCatalogAdmin) — loại công trình, cấu hình tầng/tum
 * và hai nhóm phong cách. Cần quyền `estimate.catalog.manage`.
 *
 * Danh mục CÓ PHIÊN BẢN: mỗi lần lưu tạo một revision mới và tăng
 * `catalogVersion`. Mọi thao tác ghi gửi lại `expectedCatalogVersion` đã đọc —
 * lệch thì BE trả 409 `CatalogVersionConflict`. API không có xóa, không có trạng
 * thái bật/tắt cho loại hay phong cách và không có thứ tự sắp xếp.
 */

export type CatalogStyleGroup = 'Architecture' | 'Interior'

export interface CatalogBuildingTypeDto {
  buildingTypeId: string
  name: string
  floorsEnabled: boolean
  tumEnabled: boolean
  architectureEnabled: boolean
  interiorEnabled: boolean
  /** Số tầng được chọn: 1 là Trệt, 3 là Trệt + 2 lầu. Nhóm tắt vẫn giữ danh sách. */
  floorCounts: number[]
  architectureStyleIds: string[]
  interiorStyleIds: string[]
  /**
   * Mã gốc của app demo (`nha-pho|villa-biet-thu|nha-mai|nha-vuon-cap4|can-ho`) và mã phong cách gốc mặc định cho
   * loại không chọn phong cách kiến trúc (TDD-PROJ-007 mục B). NULL khi chưa gắn; loại chưa gắn vẫn lưu được nhưng
   * bản dự toán dùng nó bị chặn chạy chặng 2D (BR-PROJ-004 khoản 19–20).
   */
  baseCode: string | null
  defaultBaseStyleCode: string | null
}

export interface CatalogStyleDto {
  styleId: string
  name: string
  imageUrl: string
  /** Phong cách kiến trúc: mã phong cách gốc của app demo. */
  baseStyleCode: string | null
  /** Phong cách nội thất: mô tả cho AI, 1–1.000 ký tự (BR-PROJ-004 khoản 21). */
  promptDescriptor: string | null
}

export interface AdminCatalog {
  /**
   * BE đã có các trường gắn mã gốc / mô tả cho AI chưa (trả khoá `baseCode`/`baseStyleCode`/`promptDescriptor`). Chưa
   * có thì không gửi các trường này, vì BE cũ trả 422 với trường lạ.
   */
  supportsAiMapping: boolean
  catalogVersion: number
  catalogRevisionId: string | null
  buildingTypes: CatalogBuildingTypeDto[]
  architectureStyles: CatalogStyleDto[]
  interiorStyles: CatalogStyleDto[]
}

interface RawCatalogView {
  catalogRevisionId?: string | null
  buildingTypes?: Partial<CatalogBuildingTypeDto>[] | null
  architectureStyles?: Partial<CatalogStyleDto>[] | null
  interiorStyles?: Partial<CatalogStyleDto>[] | null
}

interface RawAdminCatalogView {
  catalogVersion?: number
  catalog?: RawCatalogView | null
}

export interface BuildingTypeInput {
  name: string
  floorsEnabled: boolean
  tumEnabled: boolean
  architectureEnabled: boolean
  interiorEnabled: boolean
  floorCounts: number[]
  architectureStyleIds: string[]
  interiorStyleIds: string[]
  baseCode?: string | null
  defaultBaseStyleCode?: string | null
}

export interface StyleInput {
  name: string
  imageUrl: string
  baseStyleCode?: string | null
  promptDescriptor?: string | null
}

export interface CatalogSaved {
  catalogVersion: number
  catalogRevisionId?: string
}

/** `POST /styles` trả kèm `styleId` để gán ngay vào loại công trình sau khi tạo. */
export interface StyleSaved extends CatalogSaved {
  styleId: string
}

const BASE = '/admin/estimate-catalog'

const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

function toBuildingType(raw: Partial<CatalogBuildingTypeDto>): CatalogBuildingTypeDto {
  return {
    buildingTypeId: raw.buildingTypeId ?? '',
    name: raw.name ?? '',
    floorsEnabled: Boolean(raw.floorsEnabled),
    tumEnabled: Boolean(raw.tumEnabled),
    architectureEnabled: Boolean(raw.architectureEnabled),
    interiorEnabled: Boolean(raw.interiorEnabled),
    floorCounts: [...(raw.floorCounts ?? [])].sort((a, b) => a - b),
    architectureStyleIds: raw.architectureStyleIds ?? [],
    interiorStyleIds: raw.interiorStyleIds ?? [],
    baseCode: raw.baseCode ?? null,
    defaultBaseStyleCode: raw.defaultBaseStyleCode ?? null
  }
}

function toStyle(raw: Partial<CatalogStyleDto>): CatalogStyleDto {
  return {
    styleId: raw.styleId ?? '',
    name: raw.name ?? '',
    imageUrl: raw.imageUrl ?? '',
    baseStyleCode: raw.baseStyleCode ?? null,
    promptDescriptor: raw.promptDescriptor ?? null
  }
}

const hasKey = (items: object[] | null | undefined, key: string) => (items ?? []).some((item) => key in item)

/** Danh mục hiện hành, gồm cả danh sách được giữ của nhóm đang tắt. */
export async function getEstimateCatalog(): Promise<AdminCatalog> {
  const res = await http.get<RawAdminCatalogView>(BASE)
  const catalog = res.catalog ?? {}
  const supportsAiMapping =
    hasKey(catalog.buildingTypes, 'baseCode') ||
    hasKey(catalog.architectureStyles, 'baseStyleCode') ||
    hasKey(catalog.interiorStyles, 'promptDescriptor') ||
    // Danh mục rỗng thì không dò được: theo cờ bật luồng bốn chặng.
    (!catalog.buildingTypes?.length && env.NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED)
  return {
    supportsAiMapping,
    catalogVersion: res.catalogVersion ?? 0,
    catalogRevisionId: catalog.catalogRevisionId ?? null,
    buildingTypes: (catalog.buildingTypes ?? []).map(toBuildingType),
    architectureStyles: (catalog.architectureStyles ?? []).map(toStyle),
    interiorStyles: (catalog.interiorStyles ?? []).map(toStyle)
  }
}

export function createBuildingType(expectedCatalogVersion: number, input: BuildingTypeInput): Promise<CatalogSaved> {
  return http.post<CatalogSaved>(`${BASE}/building-types`, { expectedCatalogVersion, ...input }, idempotent())
}

export function updateBuildingType(
  buildingTypeId: string,
  expectedCatalogVersion: number,
  input: BuildingTypeInput
): Promise<CatalogSaved> {
  return http.put<CatalogSaved>(
    `${BASE}/building-types/${buildingTypeId}`,
    { expectedCatalogVersion, ...input },
    idempotent()
  )
}

/** Nhóm (`group`) chỉ đặt lúc tạo, không đổi được sau đó. */
export function createCatalogStyle(
  expectedCatalogVersion: number,
  group: CatalogStyleGroup,
  input: StyleInput
): Promise<StyleSaved> {
  return http.post<StyleSaved>(`${BASE}/styles`, { expectedCatalogVersion, group, ...input }, idempotent())
}

export function updateCatalogStyle(
  styleId: string,
  expectedCatalogVersion: number,
  input: StyleInput
): Promise<CatalogSaved> {
  return http.put<CatalogSaved>(`${BASE}/styles/${styleId}`, { expectedCatalogVersion, ...input }, idempotent())
}
