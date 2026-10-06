/**
 * Kiểu dữ liệu của Cẩm nang (mục VI).
 *
 * Các bản ghi NỘI DUNG (mẫu, bài viết, giai đoạn) là thứ admin biên soạn nên
 * type của chúng nằm ở `shared/cms` — nơi cả trang Cẩm nang lẫn trang quản trị
 * cùng đọc được. Ở đây chỉ re-export lại để barrel của feature không đổi, cộng
 * thêm các kiểu chỉ giao diện Cẩm nang mới dùng.
 */
export type {
  HandbookArticle,
  HandbookArticleSection,
  HandbookCategory,
  HandbookFloor,
  HandbookStage,
  HandbookStageId,
  HandbookTags,
  HandbookTemplate,
  HandbookTemplateKind,
  HandbookTemplateSpecs,
  HandbookTopic
} from '@/shared/cms'

import type { HandbookArticle, HandbookTags, HandbookTemplate } from '@/shared/cms'

import type { HandbookSectionGroup, HandbookStyleRef } from '../api/handbook.library.logic'

export type {
  HandbookAttachment,
  HandbookSectionGroup,
  HandbookSectionImage,
  HandbookStyleRef,
  LibraryFilterOptions
} from '../api/handbook.library.logic'
export type { NewsCategoryNode } from '../api/handbook.news.logic'

/**
 * Chi tiết mẫu từ BMT API. `HandbookTemplate` nằm ở `shared/cms` (dùng chung với trang quản trị
 * cũ) nên phần chỉ có ở API — nhóm nội dung theo section kèm tệp đính kèm, phong cách — đi kèm
 * bằng kiểu mở rộng này. Mẫu mock không có các trường đó nên đều tuỳ chọn.
 */
export interface HandbookTemplateDetail extends HandbookTemplate {
  /** Các section đã có tệp, theo thứ tự BE; mỗi nhóm có ảnh và tệp đính kèm (PDF/DWG/DXF). */
  sections?: HandbookSectionGroup[]
  architectureStyles?: HandbookStyleRef[]
  interiorStyles?: HandbookStyleRef[]
}

export interface HandbookTemplateStyles {
  architectureStyles: HandbookStyleRef[]
  interiorStyles: HandbookStyleRef[]
}

/**
 * Bài viết từ BMT API kèm id các danh mục gắn TRỰC TIẾP. Bộ lọc danh mục cần id (không phải
 * tên) để khớp cả bài thuộc danh mục con — xem `handbook.news.logic.ts`.
 */
export interface HandbookArticleWithCategories extends HandbookArticle {
  categoryIds?: string[]
}

/**
 * Điều kiện tìm mẫu từ đầu vào dự toán đã gửi AI (`POST /design-templates/matches`). Chỉ chứa trường áp dụng theo cấu hình
 * danh mục của dự toán; lớp app dựng từ `features/design` vì hai feature không import lẫn nhau.
 */
export interface LibraryMatchCriteria {
  catalogRevisionId: string
  buildingTypeId: string
  floorCount?: number
  hasTum?: boolean
  architectureStyleId?: string
  interiorStyleId?: string
}

/** Tiêu chí lọc, dựng từ dữ liệu Bước 1 bởi lớp app. */
export type HandbookFilter = HandbookTags

/**
 * Hạn mức tra cứu thư viện, đếm THEO NGÀY (Phần 2.1 và 2.3).
 *
 * Hai counter tách bạch: mở lưới thư viện tiêu `lookup`, mở trang chi tiết một
 * mẫu tiêu `detail`. Hết lượt thì mời người dùng nâng cấp gói.
 */
export interface HandbookQuota {
  lookupRemaining: number
  lookupTotal: number
  detailRemaining: number
  /**
   * Nguồn của hạn mức XEM CHI TIẾT: `mock` = số mock theo ngày (tài khoản free: 3 lượt/ngày, chờ API; khách chưa đăng nhập; chế độ mock); `plan` = lượt
   * `catalog.detail` thật của gói (đếm theo kỳ gói, không phải theo ngày); `unlimited` = gói không giới hạn — không có
   * con số để hiện nên huy hiệu ẩn đi.
   */
  detailMode?: 'mock' | 'plan' | 'unlimited'
  detailTotal: number
}

/** Hai mục trên thanh công cụ dọc của panel cẩm nang (màn chờ Bước 2 / Bước 3). */
export type HandbookPanelTab = 'templates' | 'articles'

/** Hai tab lớn của trang Cẩm nang (Hình 5, Hình 9). */
export type HandbookPageTab = 'library' | 'news'
