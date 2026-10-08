import { resolveIconNodes } from './icon-nodes.server'
import {
  collectIconKeys,
  EMPTY_HOME_ICON_NODES,
  EMPTY_HOME_SECTIONS,
  HOME_PAGE_KEY,
  indexHomeSections,
  type BmtPageSection,
  type HomeIconNodes,
  type HomeSections
} from './home-sections'

/**
 * Lấy nội dung các khối của trang chủ, chạy ở SERVER (trong `page.tsx`).
 *
 * Lấy ở server để HTML đầu tiên đã có chữ, ảnh và icon admin đã sửa. Nếu lấy ở client như các hook khác, người xem sẽ
 * thấy chữ mặc định rồi mới đổi sang chữ mới — rất rõ ở tiêu đề hero.
 *
 * Endpoint công khai, không cần đăng nhập nên không mang cookie. Lỗi bất kỳ (backend sập, chậm, trả sai hình dạng)
 * trả nội dung rỗng để trang chủ cứ hiển thị nội dung có sẵn — CMS không bao giờ được làm trang chủ không mở được.
 */

const API_ORIGIN = (process.env.BMT_API_ORIGIN ?? 'https://bmt-api.vnzdna.com').replace(/\/$/, '')

/** Admin sửa xong thấy trên trang chủ trong tối đa chừng này giây (trang được dựng sẵn và làm mới định kỳ). */
const REVALIDATE_SECONDS = 60

/** Quá thời gian này thì bỏ qua CMS, dùng nội dung có sẵn. */
const TIMEOUT_MS = 4000

interface SectionsEnvelope {
  isSuccess?: boolean
  value?: BmtPageSection[] | null
}

/** Nội dung các khối kèm dữ liệu vẽ của những icon admin đã đặt. */
export interface HomeContent {
  sections: HomeSections
  iconNodes: HomeIconNodes
}

export const EMPTY_HOME_CONTENT: HomeContent = {
  sections: EMPTY_HOME_SECTIONS,
  iconNodes: EMPTY_HOME_ICON_NODES
}

export async function fetchHomeContent(locale: string): Promise<HomeContent> {
  // Chế độ mock không có backend để hỏi.
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') return EMPTY_HOME_CONTENT

  try {
    const response = await fetch(
      `${API_ORIGIN}/api/v1/pages/${HOME_PAGE_KEY}/sections?locale=${encodeURIComponent(locale)}`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      }
    )
    if (!response.ok) return EMPTY_HOME_CONTENT

    const body = (await response.json()) as SectionsEnvelope
    if (body.isSuccess === false) return EMPTY_HOME_CONTENT

    const sections = indexHomeSections(body.value)
    return { sections, iconNodes: resolveIconNodes(collectIconKeys(sections)) }
  } catch {
    return EMPTY_HOME_CONTENT
  }
}
