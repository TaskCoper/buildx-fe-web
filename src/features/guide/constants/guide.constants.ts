import type { GuideTopic } from '../types/guide.types'

/**
 * Thứ tự các thao tác chính trên trang Hướng dẫn (mục II.4) — bám theo trình tự
 * người dùng gặp chúng trong luồng 3 bước.
 */
export const GUIDE_TOPICS: readonly GuideTopic[] = ['land-photo', 'input', 'read-estimate', 'dossier', 'share'] as const

/** Số thẻ video mỗi trang của carousel trang Hướng dẫn — lưới 3 cột × 2 hàng (Hình 12). */
export const GUIDE_PAGE_SIZE = 6

/** Số video nổi bật hiển thị ở khu "Hướng dẫn sử dụng" trên trang chủ (mục II.2). */
export const HOME_GUIDE_HIGHLIGHT_COUNT = 3

/**
 * Nút "?" trên các màn hình của luồng mở đúng video / bài hướng dẫn tương ứng
 * (Phụ lục 01, mục 5) — deep link tới trang Hướng dẫn kèm anchor theo topic.
 */
export const guideTopicAnchor = (topic: GuideTopic) => `#${topic}`
