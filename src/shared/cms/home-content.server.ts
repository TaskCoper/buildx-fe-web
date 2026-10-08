import { resolveIconNodes } from './icon-nodes.server'
import {
  collectIconKeys,
  EMPTY_HOME_ICON_NODES,
  EMPTY_HOME_SECTIONS,
  HOME_PAGE_KEY,
  type HomeIconNodes,
  type HomeSections
} from './home-sections'
import { fetchPageSections } from './page-sections.server'

/**
 * Lấy nội dung các khối của một trang có chữ, ảnh và icon do admin biên tập (trang chủ, trang Tìm nhà thầu), chạy ở
 * SERVER (trong `page.tsx`).
 *
 * Lấy ở server để HTML đầu tiên đã có chữ, ảnh và icon admin đã sửa. Nếu lấy ở client như các hook khác, người xem sẽ
 * thấy chữ mặc định rồi mới đổi sang chữ mới — rất rõ ở tiêu đề hero.
 *
 * Lỗi bất kỳ (backend sập, chậm, trả sai hình dạng) trả nội dung rỗng để trang cứ hiển thị nội dung có sẵn — CMS
 * không bao giờ được làm trang không mở được (xem `fetchPageSections`).
 */

/** Nội dung các khối kèm dữ liệu vẽ của những icon admin đã đặt. */
export interface HomeContent {
  sections: HomeSections
  iconNodes: HomeIconNodes
}

export const EMPTY_HOME_CONTENT: HomeContent = {
  sections: EMPTY_HOME_SECTIONS,
  iconNodes: EMPTY_HOME_ICON_NODES
}

export async function fetchPageContent(pageKey: string, locale: string): Promise<HomeContent> {
  const sections = await fetchPageSections(pageKey, locale)
  if (!sections) return EMPTY_HOME_CONTENT

  return { sections, iconNodes: resolveIconNodes(collectIconKeys(sections)) }
}

export const fetchHomeContent = (locale: string): Promise<HomeContent> => fetchPageContent(HOME_PAGE_KEY, locale)
