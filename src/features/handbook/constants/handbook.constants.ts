import type { HandbookCategory, HandbookStageId, HandbookTags } from '../types/handbook.types'

/**
 * Màn chờ hiển thị sáu mẫu gợi ý, xếp lưới 3×2 đúng Hình 1 và Hình 4. Con số
 * này cố định — panel không bao giờ được hiện ít hơn, kể cả khi phải nới lỏng
 * tiêu chí lọc. (Phần 1.1 viết "năm mẫu" nhưng khách chốt lấy theo ảnh.)
 */
export const PERSONALIZED_TEMPLATE_COUNT = 6

/**
 * Thứ tự nới lỏng tiêu chí khi không đủ mẫu khớp hết tag (mục VI):
 * bỏ tum → bỏ số tầng → bỏ kiểu kiến trúc. Các tag còn lại (loại công trình,
 * phong cách nội thất) giữ tới cùng vì chúng quyết định độ liên quan.
 */
export const TAG_RELAXATION_ORDER: readonly (keyof HandbookTags)[] = [
  'hasAttic',
  'floorCount',
  'architectureStyle'
] as const

/** Panel cẩm nang thu nhỏ về nút nổi ở góc màn hình (màn chờ Bước 2 / Bước 3). */
export const HANDBOOK_PANEL_STORAGE_KEY = 'savico.handbook-panel'

/** Số mẫu trên một trang lưới thư viện (Hình 5: "Hiển thị 8 / 84 mẫu"). */
export const LIBRARY_PAGE_SIZE = 8

/** Số bài trên một trang của khối "Tất cả bài viết" (Hình 11). */
export const ARTICLE_PAGE_SIZE = 6

/**
 * Event nội bộ của trang Cẩm nang: khối Bản tin có thể cuộn xuống "Tất cả bài
 * viết" và chọn sẵn đúng chuyên mục mà không ghép state giữa hai component.
 */
export const HANDBOOK_CATEGORY_SELECT_EVENT = 'savico:handbook-category-select'

/** State key gắn vào history entry của trang Cẩm nang để Back từ bài chi tiết
 * khôi phục list mà không replay opening effect. */
export const HANDBOOK_ARTICLE_LIST_HISTORY_KEY = '__savicoHandbookArticleList'

/** State của tab Thư viện mẫu khi rời sang trang chi tiết. */
export const HANDBOOK_TEMPLATE_LIBRARY_HISTORY_KEY = '__savicoHandbookTemplateLibrary'

/**
 * Mẫu vừa mở từ Thư viện. Dùng để Back về đúng state rồi nháy viền đúng một lần;
 * sessionStorage tách marker tạm này khỏi history state dài hạn của bộ lọc.
 */
export const HANDBOOK_TEMPLATE_RETURN_SESSION_KEY = 'savico.handbook-template-return.v1'

/** CTA tư vấn chỉ được "thở" một lần trong mỗi phiên trình duyệt. */
export const HANDBOOK_DETAIL_CONSULT_PULSE_SESSION_KEY = 'savico.handbook-detail-consult-pulse.v1'

/** Số bài ở khối "Tin tức mới nhất" cuối phần cẩm nang nền tảng (Phần 3.1). */
export const LATEST_NEWS_COUNT = 3

/** Số bài Cẩm nang ghim ở trang chủ (ảnh mockup: ba thẻ). */
export const HOME_HANDBOOK_COUNT = 3

/** Số mẫu tương tự ở cuối trang chi tiết (Phần 2.3). */
export const SIMILAR_TEMPLATE_COUNT = 4

/** Số bài viết liên quan ở cuối trang bài viết (Phần 3.3). */
export const RELATED_ARTICLE_COUNT = 3

/** Ba giai đoạn xây nhà, đúng thứ tự hiển thị trên trang Cẩm nang. */
export const HANDBOOK_STAGES: readonly HandbookStageId[] = ['structure', 'finishing', 'interior'] as const

/** Chuyên mục dùng cho bộ lọc "Tất cả bài viết". */
export const HANDBOOK_CATEGORIES: readonly HandbookCategory[] = ['experience', 'material', 'interior', 'legal'] as const
