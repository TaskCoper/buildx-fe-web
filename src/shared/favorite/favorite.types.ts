/**
 * What kind of catalogue item a ♥ points at — mẫu bản vẽ 2D hay mẫu nội thất 3D,
 * đúng hai loại nội dung của thư viện mẫu trong Cẩm nang.
 */
export type FavoriteKind = '2d' | '3d'

/**
 * A saved ♥ (mục VI — "lưu theo tài khoản: user_id, mã mẫu, thời điểm lưu").
 *
 * Beyond the id we snapshot the fields the account screen has to show (mục IV:
 * ảnh mẫu, tên mẫu, tag, ngày lưu). Denormalising them here keeps `shared/` free
 * of any feature dependency — `features/account` can render the grid without
 * importing `features/handbook` to look the template back up.
 */
export interface FavoriteEntry {
  /** Catalogue template id ("mã mẫu"). */
  templateId: string
  kind: FavoriteKind
  name: string
  imageUrl: string
  /** Nhãn tag hiển thị trên thẻ (phong cách nội thất / kiểu kiến trúc / loại công trình). */
  tagLabel: string
  /** ISO timestamp — "ngày lưu" shown on the account screen. */
  savedAt: string
}

/** What a call site hands the toggle; `savedAt` is stamped by the store. */
export type FavoriteInput = Omit<FavoriteEntry, 'savedAt'>

export interface FavoriteStore {
  /** Keyed by templateId for O(1) toggle + lookup. */
  entries: Record<string, FavoriteEntry>
  toggle: (item: FavoriteInput) => void
  isFavorite: (templateId: string) => boolean
  remove: (templateId: string) => void
  clear: () => void
}
