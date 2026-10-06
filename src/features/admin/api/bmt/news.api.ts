import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

/**
 * Tin tức — bài viết và cây danh mục (NewsArticleAdmin, NewsCategoryAdmin).
 * Quyền `news.manage`. Khóa lạc quan bằng `version` (số nguyên) đọc từ API.
 */

export type NewsArticleState = 'Draft' | 'Published' | 'Hidden'

export interface BmtAdminArticleItem {
  id: string
  state: NewsArticleState
  title?: string | null
  readingTimeMinutes?: number | null
  coverImageUrl?: string | null
  firstPublishedAtUtc?: string | null
  version: number
  categoryIds: string[]
  createdAtUtc: string
  modifiedAtUtc: string
}

export interface BmtAdminArticleDetail extends BmtAdminArticleItem {
  contentHtml?: string | null
}

/** Nội dung ghi của bài. Trường `null` nghĩa là xóa giá trị (PUT thay toàn bộ). */
export interface BmtArticleWrite {
  title: string | null
  readingTimeMinutes: number | null
  contentHtml: string | null
  coverImageUrl: string | null
  categoryIds: string[]
}

export interface BmtArticleStateChanged {
  id: string
  state: NewsArticleState
  version: number
  firstPublishedAtUtc?: string | null
}

export interface BmtNewsCategory {
  id: string
  /** `null` là danh mục gốc. */
  parentId?: string | null
  name: string
  sortOrder: number
  hasChildren: boolean
  version: number
}

export interface BmtNewsCategoryPosition {
  expectedVersion: number
  expectedParentId: string | null
  beforeCategoryId?: string
  expectedBeforeVersion?: number
}

/** Giới hạn độ dài theo BR-NEWS-001 khoản 9 và BR-NEWS-002 khoản 1. */
export const NEWS_LIMITS = {
  title: 200,
  /** Số phút đọc: số nguyên không âm, trần hợp lý cho ô nhập. */
  readingTimeMinutesMax: 999,
  contentHtml: 200_000,
  categoryName: 200
} as const

/** Trần `pageSize` của mọi danh sách BMT. */
const MAX_PAGE_SIZE = 100

export const newsAdminApi = {
  listArticles: (params: { pageIndex: number; pageSize: number; keyword?: string; state?: NewsArticleState }) =>
    http.get<PagedResult<BmtAdminArticleItem>>('/admin/news/articles', { params }),

  getArticle: (id: string) => http.get<BmtAdminArticleDetail>(`/admin/news/articles/${id}`),

  /** Tạo bài ở trạng thái Nháp — được thiếu mọi trường. */
  createArticle: (body: BmtArticleWrite) => http.post<BmtAdminArticleDetail>('/admin/news/articles', body),

  updateArticle: (id: string, body: BmtArticleWrite & { expectedVersion: number }) =>
    http.put<BmtAdminArticleDetail>(`/admin/news/articles/${id}`, body),

  deleteArticle: (id: string, expectedVersion: number) =>
    http.delete<void>(`/admin/news/articles/${id}`, { params: { expectedVersion } }),

  publishArticle: (id: string, expectedVersion: number) =>
    http.post<BmtArticleStateChanged>(`/admin/news/articles/${id}/publish`, { expectedVersion }),

  hideArticle: (id: string, expectedVersion: number) =>
    http.post<BmtArticleStateChanged>(`/admin/news/articles/${id}/hide`, { expectedVersion }),

  /** Danh mục con TRỰC TIẾP của `parentId` (bỏ trống = các danh mục gốc), xếp theo `sortOrder`. */
  listCategories: (params: { parentId?: string | null; pageIndex: number; pageSize: number }) =>
    http.get<PagedResult<BmtNewsCategory>>('/admin/news/categories', {
      params: { parentId: params.parentId ?? undefined, pageIndex: params.pageIndex, pageSize: params.pageSize }
    }),

  /**
   * Cả cây danh mục, phẳng: API chỉ trả từng tầng nên đọc lần lượt mọi trang của
   * mọi tầng có con. Dùng cho ô chọn danh mục của bài và ô chọn cha.
   */
  listAllCategories: async (): Promise<BmtNewsCategory[]> => {
    const all: BmtNewsCategory[] = []
    const queue: (string | null)[] = [null]
    while (queue.length) {
      const parentId = queue.shift() ?? null
      for (let pageIndex = 1; ; pageIndex += 1) {
        const page = await newsAdminApi.listCategories({ parentId, pageIndex, pageSize: MAX_PAGE_SIZE })
        for (const item of page.items) {
          all.push(item)
          if (item.hasChildren) queue.push(item.id)
        }
        if (!page.hasNextPage) break
      }
    }
    return all
  },

  createCategory: (body: { name: string; parentId: string | null }) =>
    http.post<BmtNewsCategory>('/admin/news/categories', body),

  /** Đổi tên và/hoặc chuyển cha (`parentId` null = về gốc). */
  updateCategory: (id: string, body: { name: string; parentId: string | null; expectedVersion: number }) =>
    http.put<BmtNewsCategory>(`/admin/news/categories/${id}`, body),

  deleteCategory: (id: string, expectedVersion: number) =>
    http.delete<void>(`/admin/news/categories/${id}`, { params: { expectedVersion } }),

  /** Đặt danh mục ngay trước `beforeCategoryId` (bỏ trống = xuống cuối nhóm cùng cha). */
  moveCategory: (id: string, body: BmtNewsCategoryPosition) =>
    http.post<BmtNewsCategory[]>(`/admin/news/categories/${id}/position`, body)
}
