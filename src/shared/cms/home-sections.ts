/**
 * Nội dung trang chủ do admin biên tập: các "khối" của trang `home` mà backend lưu (GET /pages/home/sections).
 *
 * File này chỉ có logic thuần, không import gì, để cả phía server (lấy dữ liệu), phía client (hiển thị) lẫn script
 * test bằng node đều dùng chung. Quy tắc xuyên suốt: khối nào admin chưa lưu, hoặc trường nào để trống, thì giao
 * diện dùng nội dung có sẵn trong ứng dụng — trang chủ không bao giờ trống vì CMS.
 */

/** Khóa trang trên backend. */
export const HOME_PAGE_KEY = 'home'

/** Một khối như backend trả về. */
export interface BmtPageSection {
  sectionKey?: string | null
  schemaVersion?: number | null
  content?: Record<string, unknown> | null
}

/**
 * Nội dung các khối theo khóa. Dùng object thường (không phải Map) vì kết quả được server truyền xuống client
 * component, mà props đi qua ranh giới server/client phải tuần tự hóa được.
 */
export type HomeSections = Readonly<Record<string, Readonly<Record<string, unknown>>>>

export const EMPTY_HOME_SECTIONS: HomeSections = Object.freeze({})

type PlainObject = Record<string, unknown>

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Dựng bảng khối từ phản hồi backend; bỏ khối không có khóa hoặc nội dung không phải đối tượng. */
export function indexHomeSections(raw: readonly BmtPageSection[] | null | undefined): HomeSections {
  const result: Record<string, PlainObject> = {}
  if (!Array.isArray(raw)) return result

  for (const section of raw) {
    const key = section?.sectionKey?.trim()
    if (key && isPlainObject(section.content)) result[key] = section.content
  }
  return result
}

/**
 * Chữ của một trường, đã bỏ khoảng trắng đầu cuối. Trả `undefined` khi khối chưa lưu, trường bỏ trống hoặc không
 * phải chuỗi — để bên gọi dùng `??` rơi về chữ mặc định, không bao giờ ghi đè bằng chuỗi rỗng.
 */
export function sectionText(sections: HomeSections, sectionKey: string, field: string): string | undefined {
  return cleanText(sections[sectionKey]?.[field])
}

/** Danh sách mục của một trường; `undefined` khi chưa lưu hoặc rỗng. Phần tử không phải đối tượng thành `{}`. */
export function sectionItems(
  sections: HomeSections,
  sectionKey: string,
  field: string
): readonly PlainObject[] | undefined {
  const value = sections[sectionKey]?.[field]
  if (!Array.isArray(value) || value.length === 0) return undefined
  return value.map((item) => (isPlainObject(item) ? item : {}))
}

/** Chữ của một trường trong một mục (xem {@link sectionText}). */
export function itemText(item: Readonly<PlainObject> | undefined, field: string): string | undefined {
  return cleanText(item?.[field])
}

/** Danh sách id của một trường; `undefined` khi chưa lưu hoặc rỗng. Chỉ giữ phần tử là chuỗi có nội dung. */
export function sectionIds(sections: HomeSections, sectionKey: string, field: string): string[] | undefined {
  const value = sections[sectionKey]?.[field]
  if (!Array.isArray(value)) return undefined
  const ids = value.map(cleanText).filter((id): id is string => id !== undefined)
  return ids.length > 0 ? ids : undefined
}

/**
 * Lọc `items` theo danh sách id admin đã chọn, giữ đúng thứ tự đã chọn và tối đa `max` mục. Mục không còn trong
 * `items` (bị ẩn, bị xóa) bị bỏ qua, không bù thêm. Trả `undefined` khi admin chưa chọn gì để bên gọi dùng cách
 * chọn tự động như trước.
 */
export function pickByIds<T>(
  items: readonly T[],
  ids: readonly string[] | undefined,
  getId: (item: T) => string,
  max: number
): T[] | undefined {
  if (!ids || ids.length === 0) return undefined

  const byId = new Map<string, T>()
  for (const item of items) byId.set(getId(item).toLowerCase(), item)

  const picked: T[] = []
  for (const id of ids) {
    const found = byId.get(id.toLowerCase())
    if (found !== undefined && !picked.includes(found)) picked.push(found)
    if (picked.length >= max) break
  }
  return picked
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text === '' ? undefined : text
}

/**
 * Tên icon lucide-react về dạng kebab-case của thư viện (`PencilRuler` → `pencil-ruler`), hoặc `undefined` khi để
 * trống hoặc không đúng định dạng. Chấp nhận cả hai dạng admin có thể gõ.
 */
export function lucideIconKey(name: string | undefined): string | undefined {
  const value = name?.trim()
  if (!value || value.length > 64 || !/^[A-Za-z0-9-]+$/.test(value)) return undefined
  if (/^[a-z0-9-]+$/.test(value)) return value

  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/(?<!\d)([A-Za-z])(\d)/g, '$1-$2')
    .toLowerCase()
}

/** Tên component của một khóa kebab-case (`pencil-ruler` → `PencilRuler`, `grid-2x2` → `Grid2x2`). */
export function lucideComponentName(key: string): string {
  return key
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** Dữ liệu vẽ một icon lucide: danh sách phần tử SVG và thuộc tính. Chỉ gồm chuỗi nên gửi qua server → client được. */
export type LucideIconNode = [tag: string, attributes: Record<string, string>][]

/** Dữ liệu vẽ các icon admin đã đặt, theo khóa kebab-case (xem {@link lucideIconKey}). */
export type HomeIconNodes = Readonly<Record<string, LucideIconNode>>

export const EMPTY_HOME_ICON_NODES: HomeIconNodes = Object.freeze({})

/** Khóa kebab-case của mọi icon admin đã đặt trong các khối (trường `icon` của các mục), không trùng. */
export function collectIconKeys(sections: HomeSections): string[] {
  const keys = new Set<string>()

  for (const section of Object.values(sections)) {
    for (const [field, value] of Object.entries(section)) {
      if (field === 'icon' || field.endsWith('Icon')) {
        const key = lucideIconKey(cleanText(value))
        if (key) keys.add(key)
      }
      if (!Array.isArray(value)) continue
      for (const item of value) {
        if (!isPlainObject(item)) continue
        const key = lucideIconKey(cleanText(item.icon))
        if (key) keys.add(key)
      }
    }
  }
  return [...keys]
}
