import { HOME_PAGE_KEY } from '@/shared/cms/home-sections'
import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { BmtPageSectionAdmin, BmtPageSectionWrite } from './handbook.api'

/**
 * Khối nội dung của trang chủ (`/admin/pages/home/sections`). Cùng cơ chế khối chữ với trang Cẩm nang: cần quyền
 * `news.manage`, khóa lạc quan bằng `version`, và backend kiểm nội dung theo hình dạng đã khai báo của từng khối
 * (sai hình dạng trả 422 `InvalidPageSection`, khối hoặc trang chưa khai báo trả 404 `PageSectionNotFound`).
 */
const BASE = `/admin/pages/${HOME_PAGE_KEY}/sections`

/** Mẫu thư viện công khai, đủ để admin nhận ra mẫu khi chọn cho trang chủ. */
export interface PublicTemplate {
  templateId: string
  name: string
  drawingKind: string
  thumbnailUrl?: string | null
  areaM2?: string | null
  floorCount?: number | null
  buildingTypeName?: string | null
}

/** Bài viết Cẩm nang công khai. */
export interface PublicArticle {
  id: string
  title?: string | null
  coverImageUrl?: string | null
  firstPublishedAtUtc?: string | null
  categories?: { id: string; name: string }[] | null
}

/** Video hướng dẫn công khai. */
export interface PublicGuide {
  id: string
  title?: string | null
  youtubeVideoId?: string | null
  metadata?: { thumbnailUrl?: string | null; durationSeconds?: number | null } | null
}

/** Kiến trúc sư công khai. */
export interface PublicArchitect {
  id: string
  fullName: string
  title?: string | null
  avatarUrl?: string | null
  companyName?: string | null
}

/** Đi hết các trang của một danh sách công khai (tối đa 20 trang, đủ cho mọi kho hiện có). */
async function listAllPages<T>(path: string, pageSize: number): Promise<T[]> {
  const all: T[] = []
  for (let pageIndex = 1; pageIndex <= 20; pageIndex++) {
    const page = await http.get<PagedResult<T>>(path, { params: { pageIndex, pageSize } })
    all.push(...page.items)
    if (!page.hasNextPage) break
  }
  return all
}

export const homeAdminApi = {
  /** Mọi khối đã có bản lưu của một ngôn ngữ; khối chưa lưu không có trong danh sách. */
  listSections: (locale: string) => http.get<BmtPageSectionAdmin[]>(BASE, { params: { locale } }),

  saveSection: (sectionKey: string, body: BmtPageSectionWrite) =>
    http.put<BmtPageSectionAdmin>(`${BASE}/${sectionKey}`, body),

  /** Xóa bản đã lưu để trang quay lại dùng nội dung có sẵn trong ứng dụng. */
  deleteSection: (sectionKey: string, locale: string) =>
    http.delete<void>(`${BASE}/${sectionKey}`, { params: { locale } }),

  /**
   * Bốn danh sách dưới đây dùng API CÔNG KHAI chứ không phải API quản trị: trang chủ chỉ hiện được những mục khách xem
   * được (mẫu đã công bố và chưa ẩn, bài viết và video đã đăng, kiến trúc sư đang hiển thị), nên ô chọn cũng chỉ liệt kê đúng
   * những mục đó, kèm ảnh và tên để admin nhận ra.
   */
  listPublicTemplates: () => listAllPages<PublicTemplate>('/design-templates', 100),
  listPublicArticles: () => listAllPages<PublicArticle>('/news/articles', 100),
  listPublicGuides: () => listAllPages<PublicGuide>('/guides', 100),
  listPublicArchitects: () => listAllPages<PublicArchitect>('/architects', 20)
}
