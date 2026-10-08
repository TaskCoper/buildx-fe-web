import { http } from '@/shared/lib/api'

/**
 * Cẩm nang — ba bước, thuộc tính Cẩm nang của danh mục, khối Bản tin và khối chữ cố định của trang (TDD-HB-001,
 * TDD-HB-002, TDD-HB-003). Mọi endpoint cần quyền `news.manage`; khóa lạc quan bằng `version` đọc từ API.
 */

/** Một trong ba bước cố định; không thêm, xóa hay đổi thứ tự được (BR-HB-001 khoản 1). */
export interface BmtHandbookStageAdmin {
  id: string
  /** `structure`, `finishing` hoặc `interior`. */
  code: string
  stepNumber: number
  title: string
  description: string
  coverImageUrl: string
  version: number
}

export interface BmtHandbookStageWrite {
  title: string
  description: string
  coverImageUrl: string
  expectedVersion: number
}

/** Thuộc tính Cẩm nang của một danh mục gốc sau khi lưu. */
export interface BmtCategoryHandbook {
  id: string
  name: string
  stageId?: string | null
  isInstruction: boolean
  iconKey?: string | null
  version: number
}

export interface BmtCategoryHandbookWrite {
  stageId: string | null
  isInstruction: boolean
  /** Tắt `isInstruction` thì backend xóa biểu tượng. */
  iconKey: string | null
  expectedVersion: number
}

/** Một bài trong khối Bản tin, kèm trạng thái để biết bài có đang hiển thị không. */
export interface BmtSpotlightItem {
  articleId: string
  /** Thứ tự tương đối; trang công khai đánh số lại theo các bài thực sự hiển thị. */
  position: number
  state: 'Draft' | 'Published' | 'Hidden'
  title?: string | null
  slug?: string | null
}

/** Các khối chữ của trang Cẩm nang (BR-HB-003 khoản 2). */
export const HANDBOOK_PAGE_KEY = 'handbook'

export interface BmtPageSectionAdmin {
  sectionKey: string
  locale: string
  schemaVersion: number
  content: Record<string, unknown>
  version: number
}

export interface BmtPageSectionWrite {
  locale: string
  schemaVersion: number
  content: Record<string, unknown>
  /** Bỏ trống khi khối chưa có bản lưu. */
  expectedVersion?: number
}

export const handbookAdminApi = {
  /** Đúng ba bước theo thứ tự `stepNumber`. */
  listStages: () => http.get<BmtHandbookStageAdmin[]>('/admin/handbook/stages'),

  updateStage: (id: string, body: BmtHandbookStageWrite) =>
    http.put<BmtHandbookStageAdmin>(`/admin/handbook/stages/${id}`, body),

  /** Chỉ đặt được cho danh mục gốc; bật `isInstruction` thì bắt buộc có `stageId`. */
  setCategoryHandbook: (categoryId: string, body: BmtCategoryHandbookWrite) =>
    http.put<BmtCategoryHandbook>(`/admin/news/categories/${categoryId}/handbook`, body),

  /** Toàn bộ khối Bản tin, kể cả bài đang ẩn hoặc nháp. */
  getSpotlight: () => http.get<BmtSpotlightItem[]>('/admin/handbook/newsletter'),

  /** Thay toàn bộ danh sách và thứ tự; danh sách rỗng là gỡ hết. */
  saveSpotlight: (articleIds: string[]) => http.put<BmtSpotlightItem[]>('/admin/handbook/newsletter', { articleIds }),

  listPageSections: (locale: string) =>
    http.get<BmtPageSectionAdmin[]>(`/admin/pages/${HANDBOOK_PAGE_KEY}/sections`, { params: { locale } }),

  savePageSection: (sectionKey: string, body: BmtPageSectionWrite) =>
    http.put<BmtPageSectionAdmin>(`/admin/pages/${HANDBOOK_PAGE_KEY}/sections/${sectionKey}`, body),

  /** Xóa bản đã lưu để trang quay lại dùng bản dịch sẵn có trong giao diện. */
  deletePageSection: (sectionKey: string, locale: string) =>
    http.delete<void>(`/admin/pages/${HANDBOOK_PAGE_KEY}/sections/${sectionKey}`, { params: { locale } })
}
